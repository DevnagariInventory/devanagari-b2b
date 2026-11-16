import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { products, stockMovements } from "./schema";
import { today } from "../lib/date";

type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Runner = DB | Tx;

export type MovementType = (typeof stockMovements.$inferInsert)["type"];

/**
 * Change a book's stock by `delta` (+ adds, - removes) and write the movement.
 * Never lets stock go below zero. Returns the new balance, or null if the book doesn't exist.
 * The update is a single atomic statement, so two people selling the last copy at once can't both succeed.
 */
export async function moveStock(
  tx: Runner,
  productId: number,
  delta: number,
  type: MovementType,
  note = "",
  date = today()
): Promise<number | null> {
  if (delta === 0) return null;
  const [updated] = await tx
    .update(products)
    .set({ stock: sql`${products.stock} + ${delta}` })
    .where(sql`${products.id} = ${productId} and ${products.stock} + ${delta} >= 0`)
    .returning({ stock: products.stock });
  if (!updated) {
    const [exists] = await tx.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!exists) return null;
    throw new Error(`Stock for product ${productId} would go below zero`);
  }
  await tx
    .insert(stockMovements)
    .values({ productId, type, quantity: delta, balance: updated.stock, note, date, createdAt: date });
  return updated.stock;
}

/**
 * Make everyone who asks for the next invoice / print-order number wait their turn.
 * Without this, two people saving at the same moment would both get the same number.
 * The lock is released automatically when the transaction ends.
 */
const LOCK_KEYS = { invoice: 71001, print_order: 71002, quotation: 71004, first_user: 71006 } as const;
export async function lockNumbering(tx: Runner, key: keyof typeof LOCK_KEYS) {
  await tx.execute(sql`select pg_advisory_xact_lock(${LOCK_KEYS[key]})`);
}
