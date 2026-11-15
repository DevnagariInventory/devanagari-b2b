import type { Product } from "@/db/schema";
import type { ProductRaw } from "./validation";

export const emptyProductRaw = (categoryId: number | undefined): ProductRaw => ({
  name: "", authorId: "", categoryId: categoryId === undefined ? "" : String(categoryId), sku: "", isbn: "",
  price: "", mrp: "", gst: "0", stock: "0", lowStockAt: "10", status: "active",
  description: "", highlights: "", publisher: "", language: "Hindi", edition: "", pages: "", binding: "Paperback",
  weightGrams: "", tags: "",
});

export const productToRaw = (p: Product): ProductRaw => ({
  name: p.name,
  authorId: p.authorId === null ? "" : String(p.authorId),
  categoryId: String(p.categoryId),
  sku: p.sku,
  isbn: p.isbn,
  price: String(p.price),
  mrp: String(p.mrp),
  gst: String(p.gst),
  stock: String(p.stock),
  lowStockAt: String(p.lowStockAt),
  status: p.status,
  description: p.description,
  highlights: p.highlights,
  publisher: p.publisher,
  language: p.language,
  edition: p.edition,
  pages: p.pages ? String(p.pages) : "",
  binding: p.binding,
  weightGrams: p.weightGrams ? String(p.weightGrams) : "",
  tags: p.tags,
});
