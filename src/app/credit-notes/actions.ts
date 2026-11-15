"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { nextNumber } from "@/db/numbering";
import { lockNumbering, moveStock } from "@/db/stock";
import { creditNoteItems, creditNotes, invoiceItems, invoices, payments } from "@/db/schema";
import { denied, getUser } from "@/lib/auth/current";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { computeLine, round2 } from "@/lib/invoice-math";
import { creditErrorKey, parseCreditNote, pickCreditRaw } from "@/lib/validation-credit";
import { FORM_ERROR, type CreateResult } from "@/lib/validation";
import type { ActionResult } from "@/lib/validation";

const refresh = () => revalidatePath("/", "layout");
const fail = (msg: string): { ok: false; errors: Record<string, string> } => ({ ok: false, errors: { [FORM_ERROR]: msg } });

/**
 * Record a sales return against an invoice.
 * - the returned copies go back into stock (unless marked damaged),
 * - the invoice's balance drops by the credit; if the customer had already paid more than the new net total,
 *   the difference is recorded as a refund (a negative payment) so the books balance.
 */
export async function createCreditNote(invoiceId: number, input: unknown): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseCreditNote(pickCreditRaw(input));
  if (Object.keys(errors).length) return { ok: false, errors };

  const me = await getUser();
  const result = await db.transaction(async (tx): Promise<CreateResult> => {
    await lockNumbering(tx, "credit_note");
    // Lock the invoice so a payment or another return can't change its totals while we work.
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
    if (!inv) return fail("This invoice no longer exists.");

    const lines = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    const byId = new Map(lines.map((l) => [l.id, l]));
    const earlier = await tx
      .select({ invoiceItemId: creditNoteItems.invoiceItemId, qty: sql<number>`sum(${creditNoteItems.quantity})::int` })
      .from(creditNoteItems)
      .innerJoin(creditNotes, eq(creditNotes.id, creditNoteItems.creditNoteId))
      .where(eq(creditNotes.invoiceId, invoiceId))
      .groupBy(creditNoteItems.invoiceItemId);
    const already = new Map(earlier.map((e) => [e.invoiceItemId, e.qty]));

    // Same invoice line listed twice in one request would dodge the limit, so total them first.
    const asked = new Map<number, number>();
    for (const it of value.items) asked.set(it.invoiceItemId, (asked.get(it.invoiceItemId) ?? 0) + it.quantity);

    const lineErrors: Record<string, string> = {};
    value.items.forEach((it, i) => {
      const line = byId.get(it.invoiceItemId);
      if (!line) lineErrors[creditErrorKey(i)] = "This line is not on the invoice";
      else {
        const left = line.quantity - (already.get(line.id) ?? 0);
        if ((asked.get(line.id) ?? 0) > left) lineErrors[creditErrorKey(i)] = `Only ${left} can still be returned`;
      }
    });
    if (Object.keys(lineErrors).length) return { ok: false, errors: lineErrors };

    const priced = value.items.map((it) => {
      const line = byId.get(it.invoiceItemId)!;
      const c = computeLine({ quantity: it.quantity, rate: line.unitPrice, discountPercent: 0, gstPercent: line.gstPercent });
      return { line, qty: it.quantity, amount: c.amount, gst: c.gst };
    });
    const total = round2(priced.reduce((s, p) => s + p.amount + p.gst, 0));

    const newCredited = round2(inv.creditedAmount + total);
    const netTotal = round2(inv.total - newCredited);
    if (netTotal < -0.004) return fail("The returns would be worth more than the invoice. Check the quantities.");
    const refund = round2(Math.max(0, inv.paidAmount - netTotal));

    const number = await nextNumber(creditNotes, creditNotes.number, "CN-", tx);
    const [cn] = await tx
      .insert(creditNotes)
      .values({
        number, invoiceId, customerId: inv.customerId, date: value.date, reason: value.reason, restock: value.restock,
        total, refundAmount: refund, refundMode: value.refundMode, createdBy: me?.name ?? "", createdAt: today(),
      })
      .returning();
    await tx.insert(creditNoteItems).values(
      priced.map((p) => ({
        creditNoteId: cn.id, invoiceItemId: p.line.id, productId: p.line.productId, quantity: p.qty,
        unitPrice: p.line.unitPrice, gstPercent: p.line.gstPercent, lineTotal: p.amount,
      }))
    );

    await tx
      .update(invoices)
      .set({ creditedAmount: newCredited, paidAmount: round2(inv.paidAmount - refund) })
      .where(eq(invoices.id, invoiceId));
    if (refund > 0) {
      await tx.insert(payments).values({
        invoiceId, amount: -refund, date: value.date, mode: value.refundMode, reference: number,
        note: "Refund for credit note", creditNoteId: cn.id, createdAt: today(),
      });
    }
    if (value.restock) {
      for (const p of priced) await moveStock(tx, p.line.productId, p.qty, "sale_return", `Credit note ${number}`, value.date);
    }
    await audit(
      "create", "credit note", cn.id,
      `Created credit note ${number} for invoice ${inv.number} (${formatINR(total)}${refund > 0 ? `, refunded ${formatINR(refund)}` : ""})`,
      tx
    );
    return { ok: true, id: cn.id };
  });

  if (result.ok) refresh();
  return result;
}

/** Undo a credit note: books leave stock again, the invoice's credit and any refund are reversed. */
export async function deleteCreditNote(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;

  try {
    const result = await db.transaction(async (tx): Promise<ActionResult> => {
      const [cn] = await tx.select().from(creditNotes).where(eq(creditNotes.id, id)).for("update");
      if (!cn) return fail("This credit note no longer exists.");
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, cn.invoiceId)).for("update");
      const items = await tx.select().from(creditNoteItems).where(eq(creditNoteItems.creditNoteId, id));

      if (cn.restock) {
        for (const it of items) await moveStock(tx, it.productId, -it.quantity, "return_void", `Credit note ${cn.number} deleted`);
      }
      if (inv) {
        await tx
          .update(invoices)
          .set({
            creditedAmount: round2(Math.max(inv.creditedAmount - cn.total, 0)),
            paidAmount: round2(inv.paidAmount + cn.refundAmount),
          })
          .where(eq(invoices.id, inv.id));
      }
      await tx.delete(payments).where(and(eq(payments.creditNoteId, id), inArray(payments.invoiceId, [cn.invoiceId])));
      await tx.delete(creditNotes).where(eq(creditNotes.id, id)); // lines go with it
      await audit("delete", "credit note", id, `Deleted credit note ${cn.number} (${formatINR(cn.total)})`, tx);
      return { ok: true };
    });
    if (result.ok) refresh();
    return result;
  } catch (e) {
    if (e instanceof Error && /below zero/.test(e.message)) {
      return fail("Some of these books have already been sold again, so they cannot be taken back out of stock. Adjust stock first.");
    }
    throw e;
  }
}
