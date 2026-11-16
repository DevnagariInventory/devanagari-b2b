import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  authors, categories, invoiceItems, invoices, productImages, products, stockMovements,
} from "./schema";

export async function getProductImages(productId: number) {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
}

/** Everything the storefront-style product page shows, or null if the book doesn't exist. */
export async function getProductDetail(id: number) {
  const [row] = await db
    .select({
      product: products,
      authorName: authors.name,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(authors, eq(authors.id, products.authorId))
    .where(eq(products.id, id));
  if (!row) return null;

  const [images, [sales]] = await Promise.all([
    getProductImages(id),
    db
      .select({
        units: sql<number>`coalesce(sum(${invoiceItems.quantity}), 0)`.mapWith(Number),
        revenue: sql<number>`coalesce(sum(${invoiceItems.lineTotal}), 0)`.mapWith(Number),
        invoiceCount: sql<number>`count(distinct ${invoiceItems.invoiceId})`.mapWith(Number),
        lastSold: sql<string | null>`max(${invoices.date})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(eq(invoiceItems.productId, id)),
  ]);

  return {
    ...row.product,
    authorName: row.authorName,
    categoryName: row.categoryName,
    images,
    sales,
  };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;
