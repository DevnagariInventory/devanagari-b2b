import { asc, desc, eq, like } from "drizzle-orm";
import { db } from "./index";
import { company, creditNotes, customers, invoiceItems, invoices, payments, products, type Company } from "./schema";
import type { Runner } from "./stock";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Next free invoice number: the configured prefix + the highest existing number + 1 (e.g. DP-01001). */
export async function nextInvoiceNumber(runner: Runner = db): Promise<string> {
  const [biz] = await runner.select().from(company).where(eq(company.id, 1));
  const prefix = biz?.invoicePrefix || "DP-";
  const existing = await runner
    .select({ number: invoices.number })
    .from(invoices)
    .where(like(invoices.number, prefix + "%")); // "_" in a prefix matches any char; the digit check below filters those out
  let max = 0;
  let width = 5;
  for (const { number } of existing) {
    const digits = number.slice(prefix.length);
    if (!/^\d+$/.test(digits)) continue;
    max = Math.max(max, Number(digits));
    width = Math.max(width, digits.length);
  }
  return prefix + String(max + 1).padStart(width, "0");
}

export type InvoiceStatus = "paid" | "partial" | "pending";

/** `total` is what the customer actually owes: the invoice total minus any credit notes. */
export function invoiceStatus(total: number, paid: number): InvoiceStatus {
  if (paid >= total - 0.004) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

export async function listInvoices() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      date: invoices.date,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      creditedAmount: invoices.creditedAmount,
      customerId: invoices.customerId,
      customerName: customers.name,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(invoices.date), desc(invoices.id));
  return rows.map((r) => ({ ...r, status: invoiceStatus(r.total - r.creditedAmount, r.paidAmount) }));
}

export type InvoiceListRow = Awaited<ReturnType<typeof listInvoices>>[number];

/** Everything needed to print one invoice, or null if it doesn't exist. */
export async function getInvoiceDetail(id: number) {
  const [inv] = await db
    .select()
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, id));
  if (!inv) return null;

  const items = await db
    .select({
      name: products.name,
      sku: products.sku,
      quantity: invoiceItems.quantity,
      rate: invoiceItems.rate,
      discountPercent: invoiceItems.discountPercent,
      gstPercent: invoiceItems.gstPercent,
      amount: invoiceItems.lineTotal,
    })
    .from(invoiceItems)
    .innerJoin(products, eq(products.id, invoiceItems.productId))
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.id));

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const gst = round2(items.reduce((s, i) => s + (i.amount * i.gstPercent) / 100, 0));
  const grandTotal = round2(subtotal + gst);
  const paid = inv.invoices.paidAmount;
  const credited = inv.invoices.creditedAmount;
  const netTotal = round2(grandTotal - credited);

  const [savedCompany] = await db.select().from(company).where(eq(company.id, 1));
  const biz: Company = savedCompany ?? {
    id: 1, name: "Your Company", address: "", phone: "", email: "", gstin: "", terms: "", upiId: "", invoicePrefix: "DP-",
  };

  const paymentList = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(asc(payments.date), asc(payments.id));

  return {
    id: inv.invoices.id,
    payments: paymentList,
    number: inv.invoices.number,
    date: inv.invoices.date,
    paymentMode: inv.invoices.paymentMode,
    status: invoiceStatus(netTotal, paid),
    items,
    subtotal,
    gst,
    grandTotal,
    paid,
    credited,
    netTotal,
    creditNotes: await db
      .select({ id: creditNotes.id, number: creditNotes.number, date: creditNotes.date, total: creditNotes.total })
      .from(creditNotes)
      .where(eq(creditNotes.invoiceId, id))
      .orderBy(asc(creditNotes.id)),
    balance: round2(Math.max(netTotal - paid, 0)),
    customer: inv.customers,
    company: biz,
  };
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;

/** Raw invoice + lines for the edit form (ids and numbers as stored, nothing derived). */
export async function getInvoiceForEdit(id: number) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return null;
  const items = await db
    .select({
      productId: invoiceItems.productId,
      quantity: invoiceItems.quantity,
      rate: invoiceItems.rate,
      discountPercent: invoiceItems.discountPercent,
      gstPercent: invoiceItems.gstPercent,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.id));
  return { ...inv, items };
}

export type InvoiceForEdit = NonNullable<Awaited<ReturnType<typeof getInvoiceForEdit>>>;
