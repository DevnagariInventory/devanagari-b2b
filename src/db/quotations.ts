import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { getCompany } from "./documents";
import { customers, products, quotationItems, quotations } from "./schema";
import { today } from "../lib/date";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type QuotationStatus = "open" | "expired" | "converted" | "cancelled";

/** "expired" is worked out (an open quote past its date), not stored. */
export function quotationStatus(status: "open" | "converted" | "cancelled", validUntil: string): QuotationStatus {
  return status === "open" && validUntil !== "" && validUntil < today() ? "expired" : status;
}

export async function listQuotations() {
  const rows = await db
    .select({
      id: quotations.id,
      number: quotations.number,
      date: quotations.date,
      validUntil: quotations.validUntil,
      total: quotations.total,
      status: quotations.status,
      invoiceId: quotations.invoiceId,
      customerName: customers.name,
    })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .orderBy(desc(quotations.date), desc(quotations.id));
  return rows.map((r) => ({ ...r, state: quotationStatus(r.status, r.validUntil) }));
}

export async function getQuotationDetail(id: number) {
  const [row] = await db
    .select()
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .where(eq(quotations.id, id));
  if (!row) return null;

  const items = await db
    .select({
      name: products.name,
      sku: products.sku,
      quantity: quotationItems.quantity,
      rate: quotationItems.rate,
      discountPercent: quotationItems.discountPercent,
      gstPercent: quotationItems.gstPercent,
      amount: quotationItems.lineTotal,
    })
    .from(quotationItems)
    .innerJoin(products, eq(products.id, quotationItems.productId))
    .where(eq(quotationItems.quotationId, id))
    .orderBy(asc(quotationItems.id));

  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const gst = round2(items.reduce((s, i) => s + round2((i.amount * i.gstPercent) / 100), 0));
  return {
    quotation: row.quotations,
    customer: row.customers,
    state: quotationStatus(row.quotations.status, row.quotations.validUntil),
    items,
    subtotal,
    gst,
    grandTotal: round2(subtotal + gst),
    company: await getCompany(),
  };
}

export type QuotationDetail = NonNullable<Awaited<ReturnType<typeof getQuotationDetail>>>;

/** Raw quotation + lines for the edit form. */
export async function getQuotationForEdit(id: number) {
  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) return null;
  const items = await db
    .select({
      productId: quotationItems.productId,
      quantity: quotationItems.quantity,
      rate: quotationItems.rate,
      discountPercent: quotationItems.discountPercent,
      gstPercent: quotationItems.gstPercent,
    })
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(asc(quotationItems.id));
  return { ...q, items };
}
