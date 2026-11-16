"use server";

import { denied } from "@/lib/auth/current";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { checkLines, insertInvoiceTx, lineRows } from "@/db/invoice-write";
import { moveStock } from "@/db/stock";
import { customers, invoiceItems, invoices } from "@/db/schema";
import { computeTotals } from "@/lib/invoice-math";
import { parseInvoice, pickInvoiceRaw, type ActionResult, type CreateResult } from "@/lib/validation";
import { FORM_ERROR } from "@/lib/validation";
import { formatINR } from "@/lib/format";

const refresh = () => revalidatePath("/", "layout");

/** Postgres reports "stock would go below zero" (raised by moveStock) as a plain Error; turn it into a form error. */
const stockMessage = (e: unknown) =>
  e instanceof Error && /below zero/.test(e.message)
    ? "Someone else just sold some of this stock. Reload the page and try again."
    : null;

export async function createInvoice(input: unknown): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseInvoice(pickInvoiceRaw(input));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [customer] = await db.select().from(customers).where(eq(customers.id, value.customerId));
  if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };

  const lineErrors = await checkLines(value.items, new Map());
  if (Object.keys(lineErrors).length) return { ok: false, errors: lineErrors };

  const { grandTotal } = computeTotals(value.items);

  try {
    const created = await db.transaction((tx) => insertInvoiceTx(tx, value, customer.name));

    refresh();
    return { ok: true, id: created.id };
  } catch (e) {
    const msg = stockMessage(e);
    if (msg) return { ok: false, errors: { [FORM_ERROR]: msg } };
    throw e;
  }
}

export async function updateInvoice(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseInvoice(pickInvoiceRaw(input));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!existing) return { ok: false, errors: { [FORM_ERROR]: "This invoice no longer exists." } };

  const [customer] = await db.select().from(customers).where(eq(customers.id, value.customerId));
  if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };

  const oldItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const oldQty = new Map<number, number>();
  for (const o of oldItems) oldQty.set(o.productId, (oldQty.get(o.productId) ?? 0) + o.quantity);
  const newQty = new Map<number, number>();
  for (const n of value.items) newQty.set(n.productId, (newQty.get(n.productId) ?? 0) + n.quantity);

  const lineErrors = await checkLines(value.items, oldQty);
  if (Object.keys(lineErrors).length) return { ok: false, errors: lineErrors };

  // Money already received is managed through payments, not this form.
  const { grandTotal } = computeTotals(value.items);
  if (grandTotal < existing.paidAmount) {
    return {
      ok: false,
      errors: { paidAmount: `The total can't be less than the ${formatINR(existing.paidAmount)} already received` },
    };
  }

  try {
    await db.transaction(async (tx) => {
      // Net stock change per book: put back what the old lines took, take what the new lines need.
      for (const pid of new Set([...oldQty.keys(), ...newQty.keys()])) {
        const delta = (oldQty.get(pid) ?? 0) - (newQty.get(pid) ?? 0);
        await moveStock(tx, pid, delta, "sale_edit", `Invoice ${existing.number} edited`);
      }
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.insert(invoiceItems).values(lineRows(id, value.items));
      await tx
        .update(invoices)
        .set({ customerId: value.customerId, date: value.date, paymentMode: value.paymentMode, total: grandTotal })
        .where(eq(invoices.id, id));
      await audit("update", "invoice", id, `Edited invoice ${existing.number} (total ${formatINR(grandTotal)})`, tx);
    });
  } catch (e) {
    const msg = stockMessage(e);
    if (msg) return { ok: false, errors: { [FORM_ERROR]: msg } };
    throw e;
  }

  refresh();
  return { ok: true };
}

export async function deleteInvoice(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return { ok: false, errors: { [FORM_ERROR]: "This invoice no longer exists." } };

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  await db.transaction(async (tx) => {
    for (const it of items) await moveStock(tx, it.productId, it.quantity, "sale_void", `Invoice ${inv.number} deleted`);
    await tx.delete(invoices).where(eq(invoices.id, id)); // lines and payments go with it
    await audit("delete", "invoice", id, `Deleted invoice ${inv.number} (${formatINR(inv.total)}); stock returned`, tx);
  });

  refresh();
  return { ok: true };
}
