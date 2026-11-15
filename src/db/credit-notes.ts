import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { getCompany } from "./documents";
import { creditNoteItems, creditNotes, customers, invoiceItems, invoices, products } from "./schema";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function listCreditNotes() {
  return db
    .select({
      id: creditNotes.id,
      number: creditNotes.number,
      date: creditNotes.date,
      total: creditNotes.total,
      refundAmount: creditNotes.refundAmount,
      reason: creditNotes.reason,
      invoiceId: creditNotes.invoiceId,
      invoiceNumber: invoices.number,
      customerName: customers.name,
    })
    .from(creditNotes)
    .innerJoin(invoices, eq(invoices.id, creditNotes.invoiceId))
    .innerJoin(customers, eq(customers.id, creditNotes.customerId))
    .orderBy(desc(creditNotes.date), desc(creditNotes.id));
}

/** Everything needed to print one credit note, or null. */
export async function getCreditNoteDetail(id: number) {
  const [cn] = await db
    .select()
    .from(creditNotes)
    .innerJoin(invoices, eq(invoices.id, creditNotes.invoiceId))
    .innerJoin(customers, eq(customers.id, creditNotes.customerId))
    .where(eq(creditNotes.id, id));
  if (!cn) return null;

  const items = await db
    .select({
      name: products.name,
      sku: products.sku,
      quantity: creditNoteItems.quantity,
      unitPrice: creditNoteItems.unitPrice,
      gstPercent: creditNoteItems.gstPercent,
      amount: creditNoteItems.lineTotal,
    })
    .from(creditNoteItems)
    .innerJoin(products, eq(products.id, creditNoteItems.productId))
    .where(eq(creditNoteItems.creditNoteId, id))
    .orderBy(asc(creditNoteItems.id));

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const gst = round2(items.reduce((s, i) => s + round2((i.amount * i.gstPercent) / 100), 0));
  return {
    note: cn.credit_notes,
    invoice: cn.invoices,
    customer: cn.customers,
    items,
    subtotal,
    gst,
    company: await getCompany(),
  };
}

export type CreditNoteDetail = NonNullable<Awaited<ReturnType<typeof getCreditNoteDetail>>>;

/** An invoice's lines with how many copies can still be returned. */
export async function getReturnable(invoiceId: number) {
  const [inv] = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      date: invoices.date,
      total: invoices.total,
      creditedAmount: invoices.creditedAmount,
      paidAmount: invoices.paidAmount,
      customerId: invoices.customerId,
      customerName: customers.name,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, invoiceId));
  if (!inv) return null;

  const returned = await db
    .select({ invoiceItemId: creditNoteItems.invoiceItemId, qty: sql<number>`sum(${creditNoteItems.quantity})::int` })
    .from(creditNoteItems)
    .innerJoin(creditNotes, eq(creditNotes.id, creditNoteItems.creditNoteId))
    .where(eq(creditNotes.invoiceId, invoiceId))
    .groupBy(creditNoteItems.invoiceItemId);
  const back = new Map(returned.map((r) => [r.invoiceItemId, r.qty]));

  const lines = await db
    .select({
      invoiceItemId: invoiceItems.id,
      productId: invoiceItems.productId,
      name: products.name,
      sku: products.sku,
      sold: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      gstPercent: invoiceItems.gstPercent,
    })
    .from(invoiceItems)
    .innerJoin(products, eq(products.id, invoiceItems.productId))
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.id));

  return {
    invoice: inv,
    lines: lines.map((l) => ({ ...l, returned: back.get(l.invoiceItemId) ?? 0 })),
  };
}

export type Returnable = NonNullable<Awaited<ReturnType<typeof getReturnable>>>;

/** For the "which invoice?" picker. */
export async function listInvoicesForPicker() {
  return db
    .select({ id: invoices.id, number: invoices.number, date: invoices.date, customerName: customers.name })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(invoices.date), desc(invoices.id));
}
