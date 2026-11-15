"use server";

import { denied } from "@/lib/auth/current";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { invoices, payments } from "@/db/schema";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parsePayment } from "@/lib/validation-ops";

const KEYS = ["amount", "date", "mode", "reference", "note"] as const;
const refresh = () => revalidatePath("/", "layout");

const round2 = (n: number) => Math.round(n * 100) / 100;
const fail = (msg: string): ActionResult => ({ ok: false, errors: { [FORM_ERROR]: msg } });

export async function addPayment(invoiceId: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parsePayment(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    // Lock the invoice row so two payments recorded at the same moment can't both pass the balance check.
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
    if (!inv) return { ok: false, errors: { [FORM_ERROR]: "This invoice no longer exists." } };

    const balance = round2(inv.total - inv.creditedAmount - inv.paidAmount);
    if (value.amount > balance) {
      return {
        ok: false,
        errors: { amount: balance > 0 ? `Only ${formatINR(balance)} is still due` : "This invoice is already fully paid" },
      };
    }

    await tx.insert(payments).values({ ...value, invoiceId, createdAt: today() });
    await tx
      .update(invoices)
      .set({ paidAmount: sql`round((${invoices.paidAmount} + ${value.amount})::numeric, 2)::float8` })
      .where(eq(invoices.id, invoiceId));
    await audit("create", "payment", invoiceId, `Received ${formatINR(value.amount)} (${value.mode}) on ${inv.number}`, tx);
    return { ok: true };
  });
  if (result.ok) refresh();
  return result;
}

export async function deletePayment(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [pay] = await db.select().from(payments).where(eq(payments.id, id));
  if (!pay) return { ok: false, errors: { [FORM_ERROR]: "This payment no longer exists." } };
  if (pay.creditNoteId !== null) {
    return fail("This is a refund made for a credit note. Delete the credit note instead.");
  }
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, pay.invoiceId));

  await db.transaction(async (tx) => {
    await tx.delete(payments).where(eq(payments.id, id));
    await tx
      .update(invoices)
      .set({ paidAmount: sql`greatest(round((${invoices.paidAmount} - ${pay.amount})::numeric, 2)::float8, 0)` })
      .where(eq(invoices.id, pay.invoiceId));
    await audit("delete", "payment", pay.invoiceId, `Removed payment of ${formatINR(pay.amount)} from ${inv?.number ?? "invoice"}`, tx);
  });
  refresh();
  return { ok: true };
}
