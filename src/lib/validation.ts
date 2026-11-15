import { computeTotals } from "./invoice-math";

// Shared by the forms (instant feedback) and the server actions (the real check).
// Pure functions only: no database or React imports.

export type FieldErrors = Record<string, string>;
export type ActionResult = { ok: true } | { ok: false; errors: FieldErrors };
/** Like ActionResult, but a successful create also hands back the new row's id. */
export type CreateResult = { ok: true; id: number } | { ok: false; errors: FieldErrors };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Server actions receive untrusted input: keep only the expected keys, coerced to strings. */
export function pickStrings<T extends string>(input: unknown, keys: readonly T[]): Record<T, string> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return Object.fromEntries(keys.map((k) => [k, typeof src[k] === "string" ? src[k] : ""])) as Record<T, string>;
}

export const FORM_ERROR = "_form"; // key for errors that belong to the whole form, not one field

// ---------- Categories ----------
export interface CategoryRaw { name: string; description: string }
export interface CategoryInput { name: string; description: string }

export function parseCategory(raw: CategoryRaw) {
  const errors: FieldErrors = {};
  const name = raw.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length > 80) errors.name = "Name is too long";
  if (raw.description.length > 300) errors.description = "Keep the description under 300 characters";
  const value: CategoryInput = { name, description: raw.description.trim() };
  return { errors, value };
}

// ---------- Customers ----------
export interface CustomerRaw {
  name: string; mobile: string; email: string; city: string; gstin: string;
  address: string; state: string; pincode: string;
}
export type CustomerInput = CustomerRaw;

export function parseCustomer(raw: CustomerRaw) {
  const errors: FieldErrors = {};
  const value: CustomerInput = {
    name: raw.name.trim(),
    mobile: raw.mobile.trim(),
    email: raw.email.trim(),
    city: raw.city.trim(),
    gstin: raw.gstin.trim().toUpperCase(),
    address: raw.address.trim(),
    state: raw.state.trim(),
    pincode: raw.pincode.trim(),
  };
  if (!value.name) errors.name = "Name is required";
  if (!value.mobile) errors.mobile = "Mobile is required";
  else if (!/^\d{10,12}$/.test(value.mobile)) errors.mobile = "Enter 10–12 digits";
  if (value.email && !EMAIL_RE.test(value.email)) errors.email = "Enter a valid email";
  if (value.gstin && !GSTIN_RE.test(value.gstin)) errors.gstin = "Enter a valid 15-character GSTIN";
  if (value.pincode && !/^\d{6}$/.test(value.pincode)) errors.pincode = "Enter a 6-digit pincode";
  if (value.address.length > 300) errors.address = "Keep the address under 300 characters";
  return { errors, value };
}

// ---------- Authors ----------
export interface AuthorRaw { name: string; mobile: string; email: string; royaltyPercent: string }
export interface AuthorInput { name: string; mobile: string; email: string; royaltyPercent: number }

export function parseAuthor(raw: AuthorRaw) {
  const errors: FieldErrors = {};
  const royaltyPercent = num(raw.royaltyPercent);
  const value: AuthorInput = {
    name: raw.name.trim(),
    mobile: raw.mobile.trim(),
    email: raw.email.trim(),
    royaltyPercent,
  };
  if (!value.name) errors.name = "Name is required";
  if (value.mobile && !/^\d{10,12}$/.test(value.mobile)) errors.mobile = "Enter 10–12 digits";
  if (value.email && !EMAIL_RE.test(value.email)) errors.email = "Enter a valid email";
  if (!(royaltyPercent >= 0 && royaltyPercent <= 100)) errors.royaltyPercent = "Enter a percentage from 0 to 100";
  return { errors, value };
}

// ---------- Products ----------
export interface ProductRaw {
  name: string;
  authorId: string; // "" = no author
  categoryId: string;
  sku: string;
  isbn: string;
  price: string;
  mrp: string;
  gst: string;
  stock: string;
  lowStockAt: string;
  status: string;
  description: string;
  highlights: string; // one bullet per line
  publisher: string;
  language: string;
  edition: string;
  pages: string;
  binding: string;
  weightGrams: string;
  tags: string; // comma separated
}
export interface ProductInput {
  name: string;
  authorId: number | null;
  categoryId: number;
  sku: string;
  isbn: string;
  price: number;
  mrp: number;
  gst: number;
  stock: number;
  lowStockAt: number;
  status: "active" | "inactive";
  description: string;
  highlights: string;
  publisher: string;
  language: string;
  edition: string;
  pages: number;
  binding: string;
  weightGrams: number;
  tags: string;
}

export const BINDINGS = ["Paperback", "Hardcover", "Spiral", "Other"] as const;
export const LANGUAGES = ["Hindi", "English", "Sanskrit", "Hindi & English", "Other"] as const;
export const MAX_HIGHLIGHTS = 8;
export const MAX_TAGS = 10;

const optionalInt = (s: string) => (s.trim() === "" ? 0 : Number(s));

export const splitTags = (s: string) =>
  [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];

/** EAN-13 / ISBN-13 check digit. */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const sum = [...code.slice(0, 12)].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === Number(code[12]);
}

export function parseProduct(raw: ProductRaw) {
  const errors: FieldErrors = {};
  const price = num(raw.price);
  const mrpRaw = num(raw.mrp);
  const gst = num(raw.gst);
  const stock = num(raw.stock);
  const lowStockAt = num(raw.lowStockAt);
  const categoryId = Number(raw.categoryId);
  const authorId = raw.authorId === "" ? null : Number(raw.authorId);

  const value: ProductInput = {
    name: raw.name.trim(),
    authorId,
    categoryId,
    sku: raw.sku.trim(),
    isbn: raw.isbn.trim(),
    price,
    mrp: Number.isNaN(mrpRaw) ? price : mrpRaw,
    gst,
    stock,
    lowStockAt,
    status: raw.status === "inactive" ? "inactive" : "active",
    description: raw.description.trim(),
    highlights: raw.highlights.split("\n").map((l) => l.trim()).filter(Boolean).join("\n"),
    publisher: raw.publisher.trim(),
    language: raw.language.trim(),
    edition: raw.edition.trim(),
    pages: optionalInt(raw.pages),
    binding: raw.binding.trim() || "Paperback",
    weightGrams: optionalInt(raw.weightGrams),
    tags: splitTags(raw.tags).join(", "),
  };

  if (value.description.length > 5000) errors.description = "Keep the description under 5000 characters";
  if (value.highlights.split("\n").filter(Boolean).length > MAX_HIGHLIGHTS) {
    errors.highlights = `At most ${MAX_HIGHLIGHTS} highlights`;
  } else if (value.highlights.split("\n").some((l) => l.length > 160)) {
    errors.highlights = "Keep each highlight under 160 characters";
  }
  if (value.publisher.length > 100) errors.publisher = "Too long";
  if (value.language.length > 40) errors.language = "Too long";
  if (value.edition.length > 40) errors.edition = "Too long";
  if (!Number.isInteger(value.pages) || value.pages < 0 || value.pages > 10000) errors.pages = "Enter a page count";
  if (!BINDINGS.includes(value.binding as (typeof BINDINGS)[number])) errors.binding = "Select a binding";
  if (!Number.isInteger(value.weightGrams) || value.weightGrams < 0 || value.weightGrams > 50000) {
    errors.weightGrams = "Enter grams";
  }
  if (splitTags(raw.tags).length > MAX_TAGS) errors.tags = `At most ${MAX_TAGS} tags`;

  if (!value.name) errors.name = "Title is required";
  if (!value.sku) errors.sku = "SKU is required";
  if (value.isbn && !isValidEan13(value.isbn)) errors.isbn = "Enter a valid 13-digit ISBN";
  if (!Number.isInteger(categoryId) || categoryId <= 0) errors.categoryId = "Select a category";
  if (authorId !== null && !Number.isInteger(authorId)) errors.authorId = "Select a valid author";
  if (!(price >= 0)) errors.price = "Enter a valid price";
  if (raw.mrp.trim() !== "") {
    if (!(mrpRaw >= 0)) errors.mrp = "Enter a valid MRP";
    else if (price >= 0 && mrpRaw < price) errors.mrp = "MRP can't be below price";
  }
  if (!(gst >= 0 && gst <= 28)) errors.gst = "GST must be 0–28%";
  if (!Number.isInteger(stock) || stock < 0) errors.stock = "Enter a whole number";
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0) errors.lowStockAt = "Enter a whole number";
  return { errors, value };
}

// ---------- Invoices ----------
export const PAYMENT_MODES = ["cash", "upi", "bank", "cheque"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface InvoiceItemRaw {
  productId: string;
  quantity: string;
  rate: string;
  discountPercent: string;
  gstPercent: string;
}
export interface InvoiceRaw {
  customerId: string;
  date: string;
  paymentMode: string;
  paidAmount: string;
  items: InvoiceItemRaw[];
}
export interface InvoiceItemInput {
  productId: number;
  quantity: number;
  rate: number;
  discountPercent: number;
  gstPercent: number;
}
export interface InvoiceInput {
  customerId: number;
  date: string;
  paymentMode: PaymentMode;
  paidAmount: number;
  items: InvoiceItemInput[];
}

const ITEM_KEYS = ["productId", "quantity", "rate", "discountPercent", "gstPercent"] as const;
export const MAX_INVOICE_ITEMS = 100;

/** Server actions receive untrusted input: rebuild a well-formed InvoiceRaw from whatever arrived. */
export function pickInvoiceRaw(input: unknown): InvoiceRaw {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const flat = pickStrings(src, ["customerId", "date", "paymentMode", "paidAmount"] as const);
  const items = Array.isArray(src.items) ? src.items.slice(0, MAX_INVOICE_ITEMS) : [];
  return { ...flat, items: items.map((i) => pickStrings(i, ITEM_KEYS)) };
}

export const itemErrorKey = (index: number, field: keyof InvoiceItemRaw) => `item.${index}.${field}`;

export function parseInvoice(raw: InvoiceRaw) {
  const errors: FieldErrors = {};

  const customerId = Number(raw.customerId);
  if (!Number.isInteger(customerId) || customerId <= 0) errors.customerId = "Select a customer";

  const date = raw.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = "Enter a valid date";

  const paymentMode = raw.paymentMode as PaymentMode;
  if (!PAYMENT_MODES.includes(paymentMode)) errors.paymentMode = "Select a payment mode";

  const paidAmount = raw.paidAmount.trim() === "" ? 0 : Number(raw.paidAmount);
  if (!(paidAmount >= 0)) errors.paidAmount = "Enter a valid amount";

  const items: InvoiceItemInput[] = raw.items.map((r, i) => {
    const item: InvoiceItemInput = {
      productId: Number(r.productId),
      quantity: num(r.quantity),
      rate: num(r.rate),
      discountPercent: r.discountPercent.trim() === "" ? 0 : Number(r.discountPercent),
      gstPercent: r.gstPercent.trim() === "" ? 0 : Number(r.gstPercent),
    };
    if (!Number.isInteger(item.productId) || item.productId <= 0) errors[itemErrorKey(i, "productId")] = "Select a book";
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) errors[itemErrorKey(i, "quantity")] = "Whole number above 0";
    if (!(item.rate >= 0)) errors[itemErrorKey(i, "rate")] = "Enter a rate";
    if (!(item.discountPercent >= 0 && item.discountPercent <= 100)) errors[itemErrorKey(i, "discountPercent")] = "0–100";
    if (!(item.gstPercent >= 0 && item.gstPercent <= 28)) errors[itemErrorKey(i, "gstPercent")] = "0–28";
    return item;
  });
  if (items.length === 0) errors.items = "Add at least one book";

  const value: InvoiceInput = { customerId, date, paymentMode, paidAmount, items };

  // Only meaningful once every line is valid.
  if (Object.keys(errors).length === 0) {
    const { grandTotal } = computeTotals(items);
    if (paidAmount > grandTotal) errors.paidAmount = `Paid amount can't exceed the total (${grandTotal.toFixed(2)})`;
  }
  return { errors, value };
}
