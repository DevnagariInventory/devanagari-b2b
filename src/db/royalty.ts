import { desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { authors, invoiceItems, products, royaltyPayments } from "./schema";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per author: copies sold, sales (before GST), royalty earned at their %, paid so far and what is still due. */
export async function listRoyalty() {
  const rows = await db
    .select({
      id: authors.id,
      name: authors.name,
      percent: authors.royaltyPercent,
      units: sql<number>`coalesce(sum(${invoiceItems.quantity}), 0)`.mapWith(Number),
      sales: sql<number>`coalesce(sum(${invoiceItems.lineTotal}), 0)`.mapWith(Number),
      paid: sql<number>`(select coalesce(sum(amount), 0) from royalty_payments where author_id = ${authors.id})`.mapWith(Number),
    })
    .from(authors)
    .leftJoin(products, eq(products.authorId, authors.id))
    .leftJoin(invoiceItems, eq(invoiceItems.productId, products.id))
    .groupBy(authors.id)
    .orderBy(authors.name);
  return rows.map((r) => {
    const earned = round2((r.sales * r.percent) / 100);
    return { ...r, sales: round2(r.sales), earned, paid: round2(r.paid), due: round2(earned - r.paid) };
  });
}

export type RoyaltyRow = Awaited<ReturnType<typeof listRoyalty>>[number];

export async function listRoyaltyPayments() {
  return db
    .select({
      id: royaltyPayments.id,
      authorId: royaltyPayments.authorId,
      authorName: authors.name,
      amount: royaltyPayments.amount,
      date: royaltyPayments.date,
      mode: royaltyPayments.mode,
      note: royaltyPayments.note,
    })
    .from(royaltyPayments)
    .innerJoin(authors, eq(authors.id, royaltyPayments.authorId))
    .orderBy(desc(royaltyPayments.date), desc(royaltyPayments.id));
}

export type RoyaltyPaymentRow = Awaited<ReturnType<typeof listRoyaltyPayments>>[number];
