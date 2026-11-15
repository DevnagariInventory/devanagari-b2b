import { inArray } from "drizzle-orm";
import { db } from "./index";
import { audit } from "./audit";
import { nextInvoiceNumber } from "./invoices";
import { invoiceItems, invoices, payments, products } from "./schema";
import { lockNumbering, moveStock, type Tx } from "./stock";
import { today } from "../lib/date";
import { computeLine, computeTotals } from "../lib/invoice-math";
import { formatINR } from "../lib/format";
import { itemErrorKey, type FieldErrors, type InvoiceInput } from "../lib/validation";

/**
 * Checks every line against the database: the book exists, is active (unless already on this invoice)
 * and there is enough stock. `heldQty` is what the invoice already holds (empty when creating).
 */
export async function checkLines(items: InvoiceInput["items"], heldQty: Map<number, number>): Promise<FieldErrors> {
  const wanted = new Map<number, number>();
  for (const n of items) wanted.set(n.productId, (wanted.get(n.productId) ?? 0) + n.quantity);

  const found = await db
    .select()
    .from(products)
    .where(inArray(products.id, [...wanted.keys()]));
  const byId = new Map(found.map((p) => [p.id, p]));

  const errors: FieldErrors = {};
  items.forEach((item, i) => {
    const p = byId.get(item.productId);
    if (!p) {
      errors[itemErrorKey(i, "productId")] = "Book not found";
    } else if (p.status !== "active" && !heldQty.has(p.id)) {
      errors[itemErrorKey(i, "productId")] = "This book is inactive";
    } else {
      const available = p.stock + (heldQty.get(p.id) ?? 0);
      if ((wanted.get(p.id) ?? 0) > available) errors[itemErrorKey(i, "quantity")] = `Only ${available} in stock`;
    }
  });
  return errors;
}

export function lineRows(invoiceId: number, items: InvoiceInput["items"]) {
  return items.map((item) => {
    const c = computeLine(item);
    return {
      invoiceId,
      productId: item.productId,
      quantity: item.quantity,
      rate: item.rate,
      discountPercent: item.discountPercent,
      gstPercent: item.gstPercent,
      unitPrice: c.unitPrice,
      lineTotal: c.amount,
    };
  });
}

/**
 * Inside a transaction: take the next invoice number, save the invoice and its lines, take the stock,
 * record any payment made at billing, and write the audit entry. Shared by "new invoice" and "convert quotation".
 */
export async function insertInvoiceTx(tx: Tx, value: InvoiceInput, customerName: string, auditNote = "") {
  await lockNumbering(tx, "invoice");
  const number = await nextInvoiceNumber(tx);
  const { grandTotal } = computeTotals(value.items);
  const [row] = await tx
    .insert(invoices)
    .values({
      number,
      customerId: value.customerId,
      date: value.date,
      total: grandTotal,
      paidAmount: value.paidAmount,
      paymentMode: value.paymentMode,
      createdAt: today(),
    })
    .returning();
  await tx.insert(invoiceItems).values(lineRows(row.id, value.items));
  for (const item of value.items) await moveStock(tx, item.productId, -item.quantity, "sale", `Invoice ${number}`);
  if (value.paidAmount > 0) {
    await tx.insert(payments).values({
      invoiceId: row.id,
      amount: value.paidAmount,
      date: value.date,
      mode: value.paymentMode,
      note: "Received at billing",
      createdAt: today(),
    });
  }
  await audit("create", "invoice", row.id, `Created invoice ${number} for ${customerName} (${formatINR(grandTotal)})${auditNote}`, tx);
  return row;
}
