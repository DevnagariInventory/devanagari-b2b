import { sql } from "drizzle-orm";
import { boolean, doublePrecision, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

// Dates are stored as ISO "yyyy-mm-dd" text so they sort and compare correctly in SQL.

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  royaltyPercent: doublePrecision("royalty_percent").notNull().default(10),
  createdAt: text("created_at").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  address: text("address").notNull().default(""),
  state: text("state").notNull().default(""),
  pincode: text("pincode").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  authorId: integer("author_id").references(() => authors.id, { onDelete: "set null" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  sku: text("sku").notNull().unique(),
  isbn: text("isbn").notNull().default(""),
  price: doublePrecision("price").notNull(),
  mrp: doublePrecision("mrp").notNull(),
  gst: doublePrecision("gst").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  lowStockAt: integer("low_stock_at").notNull().default(10),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  // Storefront-style details
  description: text("description").notNull().default(""),
  highlights: text("highlights").notNull().default(""), // one bullet per line
  publisher: text("publisher").notNull().default(""),
  language: text("language").notNull().default("Hindi"),
  edition: text("edition").notNull().default(""),
  pages: integer("pages").notNull().default(0),
  binding: text("binding").notNull().default("Paperback"),
  weightGrams: integer("weight_grams").notNull().default(0),
  tags: text("tags").notNull().default(""), // comma separated
  createdAt: text("created_at").notNull(),
});

/** Photos of a book. The lowest sortOrder is the cover. The files live in ImageKit; we keep its id (to delete) and path (to resize). */
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull(), // ImageKit file id
  path: text("path").notNull(), // ImageKit file path, e.g. /devanagari-prakashan/products/abc.jpg
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  date: text("date").notNull(),
  total: doublePrecision("total").notNull(),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  /** Total of credit notes (returns) issued against this invoice. What the customer owes is total - credited - paid. */
  creditedAmount: doublePrecision("credited_amount").notNull().default(0),
  paymentMode: text("payment_mode", { enum: ["cash", "upi", "bank", "cheque"] }).notNull().default("cash"),
  createdAt: text("created_at").notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  rate: doublePrecision("rate").notNull().default(0), // list price per unit, before discount
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  gstPercent: doublePrecision("gst_percent").notNull().default(0),
  unitPrice: doublePrecision("unit_price").notNull(), // rate after discount
  lineTotal: doublePrecision("line_total").notNull(), // quantity * unitPrice, before GST
});

/** Money received against an invoice. invoices.paid_amount is always the sum of these. */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank", "cheque"] }).notNull().default("cash"),
  reference: text("reference").notNull().default(""),
  note: text("note").notNull().default(""),
  /** Set on a refund (negative amount) that was paid out because of a credit note. */
  creditNoteId: integer("credit_note_id"),
  createdAt: text("created_at").notNull(),
});

/** Every change to a book's stock, with the balance afterwards. */
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["sale", "sale_edit", "sale_void", "purchase", "adjustment", "print_receipt", "return", "sale_return", "return_void"],
  }).notNull(),
  quantity: integer("quantity").notNull(), // signed: + adds stock, - removes it
  balance: integer("balance").notNull(),
  note: text("note").notNull().default(""),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull().default("General"),
  printOrderId: integer("print_order_id"), // set when created automatically by receiving a print order
  createdAt: text("created_at").notNull(),
});

export const royaltyPayments = pgTable("royalty_payments", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank", "cheque"] }).notNull().default("bank"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const printingPresses = pgTable("printing_presses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const printOrders = pgTable("print_orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  pressId: integer("press_id")
    .notNull()
    .references(() => printingPresses.id, { onDelete: "restrict" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  costPerCopy: doublePrecision("cost_per_copy").notNull(),
  orderDate: text("order_date").notNull(),
  expectedDate: text("expected_date").notNull().default(""),
  status: text("status", { enum: ["ordered", "printing", "received", "cancelled"] }).notNull().default("ordered"),
  receivedQty: integer("received_qty").notNull().default(0),
  receivedDate: text("received_date").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

/** Who changed what, and when. `at` is "yyyy-mm-dd hh:mm:ss" local time. */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  at: text("at").notNull(),
  action: text("action", { enum: ["create", "update", "delete", "other"] }).notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull().default(""),
  summary: text("summary").notNull(),
  userName: text("user_name").notNull().default(""), // who did it
});

// Business details printed on invoices. Always a single row (id = 1).
export const company = pgTable("company", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  terms: text("terms").notNull().default(""),
  upiId: text("upi_id").notNull().default(""),
  invoicePrefix: text("invoice_prefix").notNull().default("DP-"),
});

// ---------- Users ----------
/** People who can log in. admin = everything; staff = day-to-day billing and stock, no money-management or deleting. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(), // stored lower-case
  email: text("email").notNull().default(""), // stored lower-case; may be empty; can be used to sign in
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until").notNull().default(""), // "yyyy-mm-dd hh:mm:ss" local, or empty
  lastLoginAt: text("last_login_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email).where(sql`${t.email} <> ''`)]);

// ---------- Credit notes (sales returns) ----------
export const creditNotes = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "restrict" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  date: text("date").notNull(),
  reason: text("reason").notNull().default(""),
  restock: boolean("restock").notNull().default(true), // false = damaged books, don't add them back to stock
  total: doublePrecision("total").notNull(), // including GST
  refundAmount: doublePrecision("refund_amount").notNull().default(0), // part of the total paid back to the customer
  refundMode: text("refund_mode", { enum: ["cash", "upi", "bank", "cheque"] }).notNull().default("cash"),
  createdBy: text("created_by").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const creditNoteItems = pgTable("credit_note_items", {
  id: serial("id").primaryKey(),
  creditNoteId: integer("credit_note_id")
    .notNull()
    .references(() => creditNotes.id, { onDelete: "cascade" }),
  invoiceItemId: integer("invoice_item_id")
    .notNull()
    .references(() => invoiceItems.id, { onDelete: "restrict" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(), // as billed on the invoice (after discount)
  gstPercent: doublePrecision("gst_percent").notNull().default(0),
  lineTotal: doublePrecision("line_total").notNull(), // quantity * unitPrice, before GST
});

// ---------- Quotations ----------
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  date: text("date").notNull(),
  validUntil: text("valid_until").notNull().default(""),
  status: text("status", { enum: ["open", "converted", "cancelled"] }).notNull().default("open"),
  notes: text("notes").notNull().default(""),
  total: doublePrecision("total").notNull(),
  invoiceId: integer("invoice_id"), // set when converted
  createdBy: text("created_by").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  rate: doublePrecision("rate").notNull().default(0),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  gstPercent: doublePrecision("gst_percent").notNull().default(0),
  unitPrice: doublePrecision("unit_price").notNull(),
  lineTotal: doublePrecision("line_total").notNull(),
});

// ---------- Delivery challans ----------
/** A dispatch note for an invoice's books. The lines are the invoice's lines, so they aren't stored again. */
export const challans = pgTable("challans", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  transporter: text("transporter").notNull().default(""),
  vehicleNo: text("vehicle_no").notNull().default(""),
  lrNumber: text("lr_number").notNull().default(""),
  packages: integer("packages").notNull().default(0),
  destination: text("destination").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Company = typeof company.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type PrintingPress = typeof printingPresses.$inferSelect;
export type User = typeof users.$inferSelect;
