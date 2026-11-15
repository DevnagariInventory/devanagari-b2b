import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { authors, categories, customers, products } from "./schema";

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(sql`lower(${categories.name})`));
}

export async function listAuthors() {
  return db.select().from(authors).orderBy(desc(authors.id));
}

export async function listCustomers() {
  return db.select().from(customers).orderBy(desc(customers.id));
}

export async function listProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      authorId: products.authorId,
      authorName: authors.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      sku: products.sku,
      isbn: products.isbn,
      price: products.price,
      mrp: products.mrp,
      gst: products.gst,
      stock: products.stock,
      lowStockAt: products.lowStockAt,
      status: products.status,
      publisher: products.publisher,
      language: products.language,
      binding: products.binding,
      tags: products.tags,
      cover: sql<string | null>`(select path from product_images where product_id = ${products.id} order by sort_order, id limit 1)`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(authors, eq(authors.id, products.authorId))
    .orderBy(desc(products.id));
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];
export type ProductRow = Awaited<ReturnType<typeof listProducts>>[number];
