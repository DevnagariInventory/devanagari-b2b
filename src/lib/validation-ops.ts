import {
  EMAIL_RE, GSTIN_RE, PAYMENT_MODES, num, type FieldErrors, type PaymentMode,
} from "./validation";

// Validation for the operations side: payments, expenses, presses, print orders, stock, settings.
// Pure functions shared by the forms (instant feedback) and the server actions (the real check).

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const isMode = (m: string): m is PaymentMode => (PAYMENT_MODES as readonly string[]).includes(m);
const money = (n: number) => Math.round(n * 100) / 100;

// ---------- Payments (money received on an invoice) ----------
export interface PaymentRaw { amount: string; date: string; mode: string; reference: string; note: string }
export interface PaymentInput { amount: number; date: string; mode: PaymentMode; reference: string; note: string }

export function parsePayment(raw: PaymentRaw) {
  const errors: FieldErrors = {};
  const amount = num(raw.amount);
  const value: PaymentInput = {
    amount: money(amount),
    date: raw.date.trim(),
    mode: raw.mode as PaymentMode,
    reference: raw.reference.trim(),
    note: raw.note.trim(),
  };
  if (!(amount > 0)) errors.amount = "Enter an amount above 0";
  if (!isValidDate(value.date)) errors.date = "Enter a valid date";
  if (!isMode(raw.mode)) errors.mode = "Select a payment mode";
  if (value.reference.length > 60) errors.reference = "Keep the reference under 60 characters";
  if (value.note.length > 200) errors.note = "Keep the note under 200 characters";
  return { errors, value };
}

// ---------- Royalty payments (money paid to an author) ----------
export type RoyaltyPaymentRaw = Omit<PaymentRaw, "reference">;
export type RoyaltyPaymentInput = Omit<PaymentInput, "reference">;

export function parseRoyaltyPayment(raw: RoyaltyPaymentRaw) {
  const { errors, value } = parsePayment({ ...raw, reference: "" });
  return { errors, value: { amount: value.amount, date: value.date, mode: value.mode, note: value.note } as RoyaltyPaymentInput };
}

// ---------- Expenses ----------
export const EXPENSE_CATEGORIES = [
  "General", "Printing", "Paper", "Transport", "Salaries", "Rent", "Marketing", "Utilities", "Office", "Other",
] as const;

export interface ExpenseRaw { description: string; amount: string; date: string; category: string }
export interface ExpenseInput { description: string; amount: number; date: string; category: string }

export function parseExpense(raw: ExpenseRaw) {
  const errors: FieldErrors = {};
  const amount = num(raw.amount);
  const value: ExpenseInput = {
    description: raw.description.trim(),
    amount: money(amount),
    date: raw.date.trim(),
    category: raw.category.trim() || "General",
  };
  if (!value.description) errors.description = "Description is required";
  else if (value.description.length > 200) errors.description = "Keep it under 200 characters";
  if (!(amount > 0)) errors.amount = "Enter an amount above 0";
  if (!isValidDate(value.date)) errors.date = "Enter a valid date";
  if (value.category.length > 40) errors.category = "Too long";
  return { errors, value };
}

// ---------- Printing presses ----------
export interface PressRaw {
  name: string; contactPerson: string; mobile: string; email: string; address: string; gstin: string;
}
export type PressInput = PressRaw;

export function parsePress(raw: PressRaw) {
  const errors: FieldErrors = {};
  const value: PressInput = {
    name: raw.name.trim(),
    contactPerson: raw.contactPerson.trim(),
    mobile: raw.mobile.trim(),
    email: raw.email.trim(),
    address: raw.address.trim(),
    gstin: raw.gstin.trim().toUpperCase(),
  };
  if (!value.name) errors.name = "Name is required";
  if (value.mobile && !/^\d{10,12}$/.test(value.mobile)) errors.mobile = "Enter 10–12 digits";
  if (value.email && !EMAIL_RE.test(value.email)) errors.email = "Enter a valid email";
  if (value.gstin && !GSTIN_RE.test(value.gstin)) errors.gstin = "Enter a valid 15-character GSTIN";
  if (value.address.length > 300) errors.address = "Keep the address under 300 characters";
  return { errors, value };
}

// ---------- Print orders ----------
export interface PrintOrderRaw {
  pressId: string; productId: string; quantity: string; costPerCopy: string;
  orderDate: string; expectedDate: string; notes: string;
}
export interface PrintOrderInput {
  pressId: number; productId: number; quantity: number; costPerCopy: number;
  orderDate: string; expectedDate: string; notes: string;
}

export function parsePrintOrder(raw: PrintOrderRaw) {
  const errors: FieldErrors = {};
  const costPerCopy = num(raw.costPerCopy);
  const value: PrintOrderInput = {
    pressId: Number(raw.pressId),
    productId: Number(raw.productId),
    quantity: num(raw.quantity),
    costPerCopy,
    orderDate: raw.orderDate.trim(),
    expectedDate: raw.expectedDate.trim(),
    notes: raw.notes.trim(),
  };
  if (!Number.isInteger(value.pressId) || value.pressId <= 0) errors.pressId = "Select a printing press";
  if (!Number.isInteger(value.productId) || value.productId <= 0) errors.productId = "Select a book";
  if (!Number.isInteger(value.quantity) || value.quantity <= 0) errors.quantity = "Whole number above 0";
  if (!(costPerCopy >= 0)) errors.costPerCopy = "Enter the cost per copy";
  if (!isValidDate(value.orderDate)) errors.orderDate = "Enter a valid date";
  if (value.expectedDate) {
    if (!isValidDate(value.expectedDate)) errors.expectedDate = "Enter a valid date";
    else if (!errors.orderDate && value.expectedDate < value.orderDate) errors.expectedDate = "Can't be before the order date";
  }
  if (value.notes.length > 300) errors.notes = "Keep the notes under 300 characters";
  return { errors, value };
}

export interface ReceiveRaw { receivedQty: string; receivedDate: string }

export function parseReceive(raw: ReceiveRaw) {
  const errors: FieldErrors = {};
  const receivedQty = num(raw.receivedQty);
  const value = { receivedQty, receivedDate: raw.receivedDate.trim() };
  if (!Number.isInteger(receivedQty) || receivedQty <= 0) errors.receivedQty = "Whole number above 0";
  if (!isValidDate(value.receivedDate)) errors.receivedDate = "Enter a valid date";
  return { errors, value };
}

// ---------- Stock adjustments ----------
export const ADJUST_MODES = ["add", "remove", "set"] as const;
export type AdjustMode = (typeof ADJUST_MODES)[number];

export interface StockAdjustRaw { mode: string; quantity: string; note: string }
export interface StockAdjustInput { mode: AdjustMode; quantity: number; note: string }

export function parseStockAdjust(raw: StockAdjustRaw) {
  const errors: FieldErrors = {};
  const quantity = num(raw.quantity);
  const value: StockAdjustInput = { mode: raw.mode as AdjustMode, quantity, note: raw.note.trim() };
  if (!(ADJUST_MODES as readonly string[]).includes(raw.mode)) errors.mode = "Select an option";
  const min = raw.mode === "set" ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < min) {
    errors.quantity = min === 0 ? "Whole number, 0 or more" : "Whole number above 0";
  } else if (quantity > 10_000_000) errors.quantity = "That's too large";
  if (value.note.length > 200) errors.note = "Keep the note under 200 characters";
  return { errors, value };
}

// ---------- Company settings ----------
export interface CompanyRaw {
  name: string; address: string; phone: string; email: string; gstin: string;
  upiId: string; invoicePrefix: string; terms: string;
}
export type CompanyInput = CompanyRaw;

export function parseCompany(raw: CompanyRaw) {
  const errors: FieldErrors = {};
  const value: CompanyInput = {
    name: raw.name.trim(),
    address: raw.address.trim(),
    phone: raw.phone.trim(),
    email: raw.email.trim(),
    gstin: raw.gstin.trim().toUpperCase(),
    upiId: raw.upiId.trim(),
    invoicePrefix: raw.invoicePrefix.trim(),
    terms: raw.terms.trim(),
  };
  if (!value.name) errors.name = "Business name is required";
  if (value.email && !EMAIL_RE.test(value.email)) errors.email = "Enter a valid email";
  if (value.gstin && !GSTIN_RE.test(value.gstin)) errors.gstin = "Enter a valid 15-character GSTIN";
  if (value.upiId && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(value.upiId)) errors.upiId = "Looks like name@bank";
  if (!/^[A-Za-z0-9\-_/]{1,10}$/.test(value.invoicePrefix)) errors.invoicePrefix = "1–10 letters, digits, - _ or /";
  if (value.address.length > 300) errors.address = "Keep the address under 300 characters";
  if (value.terms.length > 500) errors.terms = "Keep the terms under 500 characters";
  return { errors, value };
}
