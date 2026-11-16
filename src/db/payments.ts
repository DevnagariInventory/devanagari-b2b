import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { customers, invoices, payments } from "./schema";
import { listInvoices } from "./invoices";
import { monthStart, today } from "../lib/date";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function listPayments() {
  return db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.number,
      customerName: customers.name,
      amount: payments.amount,
      date: payments.date,
      mode: payments.mode,
      reference: payments.reference,
      note: payments.note,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(payments.date), desc(payments.id));
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];

/** Invoices that still have money due, oldest first. */
export async function listOutstanding() {
  const now = new Date(today() + "T00:00:00Z").getTime();
  return (await listInvoices())
    .map((i) => ({
      id: i.id,
      number: i.number,
      customerName: i.customerName,
      date: i.date,
      total: round2(i.total),
      paid: i.paidAmount,
      balance: round2(i.total - i.paidAmount),
      ageDays: Math.max(0, Math.round((now - new Date(i.date + "T00:00:00Z").getTime()) / 86_400_000)),
    }))
    .filter((i) => i.balance > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

export type OutstandingRow = Awaited<ReturnType<typeof listOutstanding>>[number];

export async function paymentStats() {
  const all = await listPayments();
  const start = monthStart();
  return {
    totalReceived: round2(all.reduce((s, p) => s + p.amount, 0)),
    thisMonth: round2(all.filter((p) => p.date >= start).reduce((s, p) => s + p.amount, 0)),
  };
}
