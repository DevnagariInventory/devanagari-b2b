import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { products, stockMovements } from "./schema";

/** Latest stock changes across all books (newest first). */
export async function listMovements(limit = 300) {
  return db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      sku: products.sku,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      balance: stockMovements.balance,
      note: stockMovements.note,
      date: stockMovements.date,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .orderBy(desc(stockMovements.id))
    .limit(limit);
}

export type MovementRow = Awaited<ReturnType<typeof listMovements>>[number];
