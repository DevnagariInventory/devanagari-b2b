"use server";

import { denied } from "@/lib/auth/current";
import { and, count, eq, min, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { moveStock } from "@/db/stock";
import { authors, categories, invoiceItems, printOrders, productImages, products } from "@/db/schema";
import { today } from "@/lib/date";
import { deleteImage } from "@/lib/imagekit";
import {
  FORM_ERROR, parseProduct, pickStrings,
  type ActionResult, type CreateResult, type FieldErrors, type ProductInput,
} from "@/lib/validation";

const KEYS = [
  "name", "authorId", "categoryId", "sku", "isbn", "price", "mrp", "gst", "stock", "lowStockAt", "status",
  "description", "highlights", "publisher", "language", "edition", "pages", "binding", "weightGrams", "tags",
] as const;
const refresh = () => revalidatePath("/", "layout");

/** Checks that need the database: unique SKU, and that the category/author really exist. */
async function dbErrors(v: ProductInput, exceptId?: number): Promise<FieldErrors> {
  const errors: FieldErrors = {};
  const sameSku = sql`lower(${products.sku}) = lower(${v.sku})`;
  const skuWhere = exceptId === undefined ? sameSku : and(sameSku, ne(products.id, exceptId));
  const [[sku], [cat], author] = await Promise.all([
    db.select({ n: count() }).from(products).where(skuWhere),
    db.select({ n: count() }).from(categories).where(eq(categories.id, v.categoryId)),
    v.authorId === null
      ? Promise.resolve(null)
      : db.select({ n: count() }).from(authors).where(eq(authors.id, v.authorId)),
  ]);
  if (sku.n > 0) errors.sku = "SKU already exists";
  if (cat.n === 0) errors.categoryId = "Select a category";
  if (author && author[0].n === 0) errors.authorId = "Select a valid author";
  return errors;
}

export async function createProduct(input: unknown): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseProduct(pickStrings(input, KEYS));
  const all = { ...(Object.keys(errors).length ? {} : await dbErrors(value)), ...errors };
  if (Object.keys(all).length) return { ok: false, errors: all };

  const row = await db.transaction(async (tx) => {
    // Stock starts at zero; the opening quantity goes through moveStock so it shows in the history.
    const [created] = await tx.insert(products).values({ ...value, stock: 0, createdAt: today() }).returning();
    if (value.stock > 0) await moveStock(tx, created.id, value.stock, "adjustment", "Opening stock");
    await audit("create", "product", created.id, `Added book "${created.name}" (SKU ${created.sku})`, tx);
    return created;
  });
  refresh();
  return { ok: true, id: row.id };
}

export async function updateProduct(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseProduct(pickStrings(input, KEYS));
  const all = { ...(Object.keys(errors).length ? {} : await dbErrors(value, id)), ...errors };
  if (Object.keys(all).length) return { ok: false, errors: all };

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) return { ok: false, errors: { [FORM_ERROR]: "This product no longer exists." } };

  try {
    await db.transaction(async (tx) => {
      const { stock, ...rest } = value;
      await tx.update(products).set(rest).where(eq(products.id, id));
      // A changed stock figure is recorded as an adjustment so the history stays complete.
      if (stock !== existing.stock) await moveStock(tx, id, stock - existing.stock, "adjustment", "Changed in product editor");
      await audit("update", "product", id, `Updated book "${value.name}"`, tx);
    });
  } catch (e) {
    if (e instanceof Error && /below zero/.test(e.message)) {
      return { ok: false, errors: { stock: "Stock changed meanwhile. Reload the page and try again." } };
    }
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return { ok: true };

  const [[used], [printed]] = await Promise.all([
    db.select({ n: count() }).from(invoiceItems).where(eq(invoiceItems.productId, id)),
    db.select({ n: count() }).from(printOrders).where(eq(printOrders.productId, id)),
  ]);
  if (used.n > 0) {
    return {
      ok: false,
      errors: { [FORM_ERROR]: "This product appears on invoices, so it can't be deleted. Set it to Inactive instead." },
    };
  }
  if (printed.n > 0) {
    return {
      ok: false,
      errors: { [FORM_ERROR]: "This product has print orders, so it can't be deleted. Set it to Inactive instead." },
    };
  }

  const files = await db.select().from(productImages).where(eq(productImages.productId, id));
  await db.transaction(async (tx) => {
    await tx.delete(products).where(eq(products.id, id)); // photos and stock history go with it
    await audit("delete", "product", id, `Deleted book "${product.name}" (SKU ${product.sku})`, tx);
  });
  // The book is gone; clean up its photos in ImageKit. A failure here must not undo the delete.
  await Promise.allSettled(files.map((f) => deleteImage(f.fileId)));
  refresh();
  return { ok: true };
}

export async function deleteProductImage(imageId: number): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const [img] = await db.select().from(productImages).where(eq(productImages.id, imageId));
  if (!img) return { ok: true };
  try {
    await deleteImage(img.fileId);
  } catch (e) {
    return { ok: false, errors: { [FORM_ERROR]: e instanceof Error ? e.message : "Could not delete the photo." } };
  }
  await db.delete(productImages).where(eq(productImages.id, imageId));
  refresh();
  return { ok: true };
}

/** Moves a photo to the front, which makes it the cover. */
export async function setCoverImage(imageId: number): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const [img] = await db.select().from(productImages).where(eq(productImages.id, imageId));
  if (!img) return { ok: false, errors: { [FORM_ERROR]: "This photo no longer exists." } };
  const [lowest] = await db
    .select({ m: min(productImages.sortOrder) })
    .from(productImages)
    .where(eq(productImages.productId, img.productId));
  await db
    .update(productImages)
    .set({ sortOrder: (lowest?.m ?? 0) - 1 })
    .where(eq(productImages.id, imageId));
  refresh();
  return { ok: true };
}
