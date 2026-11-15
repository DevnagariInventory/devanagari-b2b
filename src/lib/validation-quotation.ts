import { parseInvoice, pickInvoiceRaw, type FieldErrors, type InvoiceInput, type InvoiceRaw } from "./validation";

export interface QuotationRaw extends InvoiceRaw {
  validUntil: string;
  notes: string;
}

export interface QuotationInput {
  customerId: number;
  date: string;
  validUntil: string; // "" = no expiry
  notes: string;
  items: InvoiceInput["items"];
}

export function pickQuotationRaw(input: unknown): QuotationRaw {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const base = pickInvoiceRaw(input);
  return {
    ...base,
    paymentMode: "cash",
    paidAmount: "",
    validUntil: typeof src.validUntil === "string" ? src.validUntil : "",
    notes: typeof src.notes === "string" ? src.notes : "",
  };
}

/** A quotation is an invoice that is not paid and takes no stock yet, plus an expiry date and notes. */
export function parseQuotation(raw: QuotationRaw) {
  const { errors, value } = parseInvoice({ ...raw, paymentMode: "cash", paidAmount: "" });
  const e: FieldErrors = { ...errors };
  delete e.paymentMode;
  delete e.paidAmount;

  const validUntil = raw.validUntil.trim();
  if (validUntil) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(Date.parse(validUntil))) e.validUntil = "Enter a valid date";
    else if (!e.date && validUntil < value.date) e.validUntil = "Can't be before the quotation date";
  }
  const notes = raw.notes.trim();
  if (notes.length > 500) e.notes = "Keep the notes under 500 characters";

  const out: QuotationInput = { customerId: value.customerId, date: value.date, validUntil, notes, items: value.items };
  return { errors: e, value: out };
}
