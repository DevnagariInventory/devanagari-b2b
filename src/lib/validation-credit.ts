import { PAYMENT_MODES, type FieldErrors, type PaymentMode } from "./validation";

export interface CreditItemRaw { invoiceItemId: string; quantity: string }
export interface CreditNoteRaw {
  date: string;
  reason: string;
  restock: string; // "yes" | "no"
  refundMode: string;
  items: CreditItemRaw[];
}
export interface CreditNoteInput {
  date: string;
  reason: string;
  restock: boolean;
  refundMode: PaymentMode;
  items: { invoiceItemId: number; quantity: number }[]; // only lines with quantity > 0
}

export const creditErrorKey = (index: number) => `item.${index}.quantity`;

/** Server actions receive untrusted input: rebuild a well-formed CreditNoteRaw. */
export function pickCreditRaw(input: unknown): CreditNoteRaw {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof src[k] === "string" ? (src[k] as string) : "");
  const items = Array.isArray(src.items) ? src.items.slice(0, 200) : [];
  return {
    date: str("date"),
    reason: str("reason"),
    restock: str("restock"),
    refundMode: str("refundMode"),
    items: items.map((i) => {
      const o = (i && typeof i === "object" ? i : {}) as Record<string, unknown>;
      return {
        invoiceItemId: typeof o.invoiceItemId === "string" ? o.invoiceItemId : "",
        quantity: typeof o.quantity === "string" ? o.quantity : "",
      };
    }),
  };
}

export function parseCreditNote(raw: CreditNoteRaw) {
  const errors: FieldErrors = {};

  const date = raw.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = "Enter a valid date";

  const refundMode = raw.refundMode as PaymentMode;
  if (!PAYMENT_MODES.includes(refundMode)) errors.refundMode = "Select how any refund is paid";

  const reason = raw.reason.trim();
  if (reason.length > 300) errors.reason = "Keep the reason under 300 characters";

  const items: CreditNoteInput["items"] = [];
  raw.items.forEach((r, i) => {
    const q = r.quantity.trim() === "" ? 0 : Number(r.quantity);
    if (!Number.isInteger(q) || q < 0) errors[creditErrorKey(i)] = "Whole number, 0 or more";
    else if (q > 0) items.push({ invoiceItemId: Number(r.invoiceItemId), quantity: q });
  });
  if (items.length === 0 && !Object.keys(errors).some((k) => k.startsWith("item."))) {
    errors.items = "Enter how many copies are being returned";
  }

  const value: CreditNoteInput = { date, reason, restock: raw.restock !== "no", refundMode, items };
  return { errors, value };
}
