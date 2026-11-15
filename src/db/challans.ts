import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { getCompany } from "./documents";
import { challans, customers, invoiceItems, invoices, products } from "./schema";

export async function listChallans() {
  return db
    .select({
      id: challans.id,
      number: challans.number,
      date: challans.date,
      transporter: challans.transporter,
      lrNumber: challans.lrNumber,
      packages: challans.packages,
      invoiceId: challans.invoiceId,
      invoiceNumber: invoices.number,
      customerName: customers.name,
    })
    .from(challans)
    .innerJoin(invoices, eq(invoices.id, challans.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(challans.date), desc(challans.id));
}

export async function getChallanDetail(id: number) {
  const [row] = await db
    .select()
    .from(challans)
    .innerJoin(invoices, eq(invoices.id, challans.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(challans.id, id));
  if (!row) return null;
  const items = await db
    .select({ name: products.name, sku: products.sku, isbn: products.isbn, quantity: invoiceItems.quantity })
    .from(invoiceItems)
    .innerJoin(products, eq(products.id, invoiceItems.productId))
    .where(eq(invoiceItems.invoiceId, row.invoices.id))
    .orderBy(asc(invoiceItems.id));
  return { challan: row.challans, invoice: row.invoices, customer: row.customers, items, company: await getCompany() };
}

/** The invoice a new challan will be made for, with a sensible default destination. */
export async function getInvoiceForChallan(invoiceId: number) {
  const [row] = await db
    .select({ id: invoices.id, number: invoices.number, customerName: customers.name, city: customers.city })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, invoiceId));
  return row ?? null;
}
