"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { checkLines, insertInvoiceTx } from "@/db/invoice-write";
import { nextNumber } from "@/db/numbering";
import { lockNumbering } from "@/db/stock";
import { customers, quotationItems, quotations, products } from "@/db/schema";
import { denied, getUser } from "@/lib/auth/current";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { computeLine, computeTotals } from "@/lib/invoice-math";
import { FORM_ERROR, type ActionResult, type CreateResult, type InvoiceInput } from "@/lib/validation";
import { parseQuotation, pickQuotationRaw, type QuotationInput } from "@/lib/validation-quotation";

const refresh = () => revalidatePath("/", "layout");
const fail = (msg: string): { ok: false; errors: Record<string, string> } => ({ ok: false, errors: { [FORM_ERROR]: msg } });

function lineRows(quotationId: number, items: QuotationInput["items"]) {
  return items.map((item) => {
    const c = computeLine(item);
    return {
      quotationId, productId: item.productId, quantity: item.quantity, rate: item.rate,
      discountPercent: item.discountPercent, gstPercent: item.gstPercent, unitPrice: c.unitPrice, lineTotal: c.amount,
    };
  });
}

/** Every book on the quotation must exist. (Stock is NOT checked: a quotation doesn't reserve any.) */
async function bookErrors(items: QuotationInput["items"]) {
  const errors: Record<string, string> = {};
  const found = await db.select({ id: products.id }).from(products).where(inArray(products.id, items.map((i) => i.productId)));
  const have = new Set(found.map((p) => p.id));
  items.forEach((it, i) => {
    if (!have.has(it.productId)) errors[`item.${i}.productId`] = "Book not found";
  });
  return errors;
}

export async function createQuotation(input: unknown): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseQuotation(pickQuotationRaw(input));
  if (Object.keys(errors).length) return { ok: false, errors };
  const [customer] = await db.select().from(customers).where(eq(customers.id, value.customerId));
  if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };
  const bad = await bookErrors(value.items);
  if (Object.keys(bad).length) return { ok: false, errors: bad };

  const me = await getUser();
  const { grandTotal } = computeTotals(value.items);
  const row = await db.transaction(async (tx) => {
    await lockNumbering(tx, "quotation");
    const number = await nextNumber(quotations, quotations.number, "QT-", tx);
    const [q] = await tx
      .insert(quotations)
      .values({
        number, customerId: value.customerId, date: value.date, validUntil: value.validUntil, notes: value.notes,
        total: grandTotal, createdBy: me?.name ?? "", createdAt: today(),
      })
      .returning();
    await tx.insert(quotationItems).values(lineRows(q.id, value.items));
    await audit("create", "quotation", q.id, `Created quotation ${number} for ${customer.name} (${formatINR(grandTotal)})`, tx);
    return q;
  });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateQuotation(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseQuotation(pickQuotationRaw(input));
  if (Object.keys(errors).length) return { ok: false, errors };
  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) return fail("This quotation no longer exists.");
  if (q.status !== "open") return fail(`A ${q.status} quotation can't be edited.`);
  const [customer] = await db.select().from(customers).where(eq(customers.id, value.customerId));
  if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };
  const bad = await bookErrors(value.items);
  if (Object.keys(bad).length) return { ok: false, errors: bad };

  const { grandTotal } = computeTotals(value.items);
  await db.transaction(async (tx) => {
    await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    await tx.insert(quotationItems).values(lineRows(id, value.items));
    await tx
      .update(quotations)
      .set({ customerId: value.customerId, date: value.date, validUntil: value.validUntil, notes: value.notes, total: grandTotal })
      .where(eq(quotations.id, id));
    await audit("update", "quotation", id, `Edited quotation ${q.number} (total ${formatINR(grandTotal)})`, tx);
  });
  refresh();
  return { ok: true };
}

export async function cancelQuotation(id: number): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) return fail("This quotation no longer exists.");
  if (q.status !== "open") return fail(`A ${q.status} quotation can't be cancelled.`);
  await db.transaction(async (tx) => {
    await tx.update(quotations).set({ status: "cancelled" }).where(eq(quotations.id, id));
    await audit("update", "quotation", id, `Cancelled quotation ${q.number}`, tx);
  });
  refresh();
  return { ok: true };
}

export async function deleteQuotation(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.delete(quotations).where(eq(quotations.id, id));
    await audit("delete", "quotation", id, `Deleted quotation ${q.number}`, tx);
  });
  refresh();
  return { ok: true };
}

/** Turn an open quotation into a real invoice: same books and prices, dated today, stock taken now. */
export async function convertQuotation(id: number): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) return fail("This quotation no longer exists.");
  if (q.status !== "open") return fail(`A ${q.status} quotation can't be converted.`);
  const [customer] = await db.select().from(customers).where(eq(customers.id, q.customerId));
  if (!customer) return fail("The customer for this quotation no longer exists.");

  const lines = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id));
  const value: InvoiceInput = {
    customerId: q.customerId,
    date: today(),
    paymentMode: "cash",
    paidAmount: 0,
    items: lines.map((l) => ({
      productId: l.productId, quantity: l.quantity, rate: l.rate, discountPercent: l.discountPercent, gstPercent: l.gstPercent,
    })),
  };
  const lineErrors = await checkLines(value.items, new Map());
  if (Object.keys(lineErrors).length) {
    const msgs = Object.entries(lineErrors).map(([k, v]) => `Line ${Number(k.split(".")[1]) + 1}: ${v}`);
    return fail(`Can't convert yet. ${msgs.join("; ")}.`);
  }

  try {
    const result = await db.transaction(async (tx): Promise<CreateResult> => {
      const [fresh] = await tx.select().from(quotations).where(eq(quotations.id, id)).for("update");
      if (!fresh || fresh.status !== "open") return fail("This quotation was already converted or cancelled.");
      const inv = await insertInvoiceTx(tx, value, customer.name, ` from quotation ${q.number}`);
      await tx.update(quotations).set({ status: "converted", invoiceId: inv.id }).where(eq(quotations.id, id));
      return { ok: true, id: inv.id };
    });
    if (result.ok) refresh();
    return result;
  } catch (e) {
    if (e instanceof Error && /below zero/.test(e.message)) {
      return fail("Someone else just sold some of this stock. Reload the page and try again.");
    }
    throw e;
  }
}
