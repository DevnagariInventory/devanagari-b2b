import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { getCompany } from "./documents";
import { customers, invoices, payments } from "./schema";
import { today } from "../lib/date";
import { AGE_BUCKETS, bucketOf } from "../lib/ageing";

export { AGE_BUCKETS };

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface LedgerEntry {
  date: string;
  kind: "invoice" | "payment";
  description: string;
  debit: number; // customer owes more
  credit: number; // customer owes less
  balance: number; // running balance after this line (positive = customer owes us)
}

type Raw = Omit<LedgerEntry, "balance"> & { order: number; id: number };

/** Every invoice and payment for a customer, as one running ledger. */
export async function getStatement(customerId: number, from: string, to: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return null;

  const [invs, pays] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(asc(invoices.id)),
    db
      .select({ p: payments, number: invoices.number })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(eq(invoices.customerId, customerId))
      .orderBy(asc(payments.id)),
  ]);

  const all: Raw[] = [
    ...invs.map((i) => ({ date: i.date, kind: "invoice" as const, description: `Invoice ${i.number}`, debit: i.total, credit: 0, order: 0, id: i.id })),
    ...pays.map(({ p, number }) => ({
      date: p.date, kind: "payment" as const, description: `Payment (${p.mode}) for ${number}${p.reference ? ` · ${p.reference}` : ""}`,
      debit: 0, credit: p.amount, order: 1, id: p.id,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.id - b.id);

  let opening = 0;
  let balance = 0;
  const entries: LedgerEntry[] = [];
  for (const e of all) {
    if (e.date < from) {
      opening = round2(opening + e.debit - e.credit);
      balance = opening;
      continue;
    }
    if (e.date > to) continue;
    balance = round2(balance + e.debit - e.credit);
    entries.push({ date: e.date, kind: e.kind, description: e.description, debit: e.debit, credit: e.credit, balance });
  }

  return {
    customer,
    company: await getCompany(),
    from,
    to,
    opening,
    entries,
    totalDebit: round2(entries.reduce((s, e) => s + e.debit, 0)),
    totalCredit: round2(entries.reduce((s, e) => s + e.credit, 0)),
    closing: balance,
  };
}

export type Statement = NonNullable<Awaited<ReturnType<typeof getStatement>>>;

// ---------- Overdue ageing ----------


export interface AgeingInvoice {
  id: number;
  number: string;
  date: string;
  age: number;
  due: number;
}
export interface AgeingCustomer {
  customerId: number;
  name: string;
  mobile: string;
  buckets: [number, number, number, number];
  total: number;
  invoices: AgeingInvoice[];
}

/** Unpaid balance per customer, split by how old each invoice is (counted from the invoice date, as of today). */
export async function getAgeing(): Promise<{ customers: AgeingCustomer[]; totals: [number, number, number, number]; grand: number }> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      date: invoices.date,
      total: invoices.total,
      paid: invoices.paidAmount,
      customerId: customers.id,
      name: customers.name,
      mobile: customers.mobile,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(asc(invoices.date), asc(invoices.id));

  const now = new Date(today() + "T00:00:00Z").getTime();
  const byCustomer = new Map<number, AgeingCustomer>();
  for (const r of rows) {
    const due = round2(r.total - r.paid);
    if (due <= 0.004) continue;
    const age = Math.max(0, Math.round((now - new Date(r.date + "T00:00:00Z").getTime()) / 86_400_000));
    let c = byCustomer.get(r.customerId);
    if (!c) {
      c = { customerId: r.customerId, name: r.name, mobile: r.mobile, buckets: [0, 0, 0, 0], total: 0, invoices: [] };
      byCustomer.set(r.customerId, c);
    }
    c.buckets[bucketOf(age)] = round2(c.buckets[bucketOf(age)] + due);
    c.total = round2(c.total + due);
    c.invoices.push({ id: r.id, number: r.number, date: r.date, age, due });
  }

  const list = [...byCustomer.values()].sort((a, b) => b.total - a.total);
  const totals: [number, number, number, number] = [0, 0, 0, 0];
  for (const c of list) c.buckets.forEach((v, i) => (totals[i] = round2(totals[i] + v)));
  return { customers: list, totals, grand: round2(totals.reduce((s, v) => s + v, 0)) };
}
