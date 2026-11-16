"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputCls } from "@/components/ui/Field";
import { createInvoice, updateInvoice } from "@/app/invoices/actions";
import { createQuotation, updateQuotation } from "@/app/quotations/actions";
import { computeLine, computeTotals } from "@/lib/invoice-math";
import { formatINR } from "@/lib/format";
import {
  FORM_ERROR, PAYMENT_MODES, itemErrorKey, parseInvoice,
  type FieldErrors, type InvoiceItemRaw, type InvoiceRaw,
} from "@/lib/validation";
import { parseQuotation } from "@/lib/validation-quotation";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price: number;
  gst: number;
  stock: number;
  active: boolean;
}

interface Props {
  /** "quotation" turns this into a quotation form: no payment, no stock needed, plus a valid-until date and notes. */
  kind?: "invoice" | "quotation";
  /** Present when editing an existing invoice (or quotation); absent when creating a new one. */
  invoiceId?: number;
  /** The document number (for a new one: the number it will get). */
  number: string;
  initial: InvoiceRaw & { validUntil?: string; notes?: string };
  customers: { id: number; name: string }[];
  products: ProductOption[];
  /** Quantity of each book already on this invoice (productId -> qty): that stock is "ours" while editing. */
  heldQty: Record<number, number>;
}

type Row = InvoiceItemRaw & { key: number };

const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? 0 : Number(s));
const cellCls = (error?: string) => inputCls(error).replace("mt-1 ", "") + " px-2";

export default function InvoiceForm({ kind = "invoice", invoiceId, number, initial, customers, products, heldQty }: Props) {
  const router = useRouter();
  const isQuote = kind === "quotation";
  const base = isQuote ? "/quotations" : "/invoices";
  const noun = isQuote ? "Quotation" : "Invoice";
  const isEdit = invoiceId !== undefined;
  const backHref = isEdit ? `${base}/${invoiceId}` : base;
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(initial.items.length);

  const [head, setHead] = useState({
    customerId: initial.customerId,
    date: initial.date,
    paymentMode: initial.paymentMode,
    paidAmount: initial.paidAmount,
    validUntil: initial.validUntil ?? "",
    notes: initial.notes ?? "",
  });
  const [rows, setRows] = useState<Row[]>(initial.items.map((it, i) => ({ ...it, key: i })));
  const [errors, setErrors] = useState<FieldErrors>({});

  const productById = new Map(products.map((p) => [p.id, p]));
  const totals = computeTotals(
    rows.map((r) => ({
      quantity: num(r.quantity),
      rate: num(r.rate),
      discountPercent: num(r.discountPercent),
      gstPercent: num(r.gstPercent),
    }))
  );
  const balance = Math.max(totals.grandTotal - num(head.paidAmount), 0);

  const setRow = (key: number, patch: Partial<InvoiceItemRaw>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pickProduct = (key: number, productId: string) => {
    const p = productById.get(Number(productId));
    // Selecting a book fills in its price and GST; discount and quantity stay as typed.
    setRow(key, p ? { productId, rate: String(p.price), gstPercent: String(p.gst) } : { productId });
  };

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { key: nextKey.current++, productId: "", quantity: "1", rate: "", discountPercent: "0", gstPercent: "0" },
    ]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = { ...head, items: rows.map(({ key: _key, ...it }) => it) };
    const { errors: local } = isQuote ? parseQuotation(raw) : parseInvoice(raw);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = isQuote
        ? isEdit ? await updateQuotation(invoiceId, raw) : await createQuotation(raw)
        : isEdit ? await updateInvoice(invoiceId, raw) : await createInvoice(raw);
      if (res.ok) {
        router.push(`${base}/${"id" in res ? res.id : invoiceId}`);
        router.refresh();
      } else {
        setErrors(res.errors);
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{noun} details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={`${noun} number`}>
            <input value={number} readOnly className={inputCls() + " bg-muted text-muted-foreground"} />
          </Field>
          <Field label="Customer *" error={errors.customerId}>
            <select
              value={head.customerId}
              onChange={(e) => setHead({ ...head, customerId: e.target.value })}
              className={inputCls(errors.customerId)}
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date *" error={errors.date}>
            <input
              type="date"
              value={head.date}
              onChange={(e) => setHead({ ...head, date: e.target.value })}
              className={inputCls(errors.date)}
            />
          </Field>
          {isQuote && (
            <>
              <Field label="Valid until" error={errors.validUntil}>
                <input
                  type="date"
                  value={head.validUntil}
                  onChange={(e) => setHead({ ...head, validUntil: e.target.value })}
                  className={inputCls(errors.validUntil)}
                />
              </Field>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Notes (shown on the quotation)" error={errors.notes}>
                  <input
                    value={head.notes}
                    onChange={(e) => setHead({ ...head, notes: e.target.value })}
                    placeholder="e.g. Prices valid for 15 days. Delivery extra."
                    className={inputCls(errors.notes)}
                  />
                </Field>
              </div>
            </>
          )}
          {!isQuote && (
          <Field label="Payment mode *" error={errors.paymentMode}>
            <select
              value={head.paymentMode}
              onChange={(e) => setHead({ ...head, paymentMode: e.target.value })}
              className={inputCls(errors.paymentMode) + " capitalize"}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          )}
          {isQuote ? null : isEdit ? (
            <Field label="Received so far (₹)" error={errors.paidAmount}>
              <input
                value={head.paidAmount}
                readOnly
                title="Record or remove payments from the invoice page"
                className={inputCls() + " bg-muted text-muted-foreground"}
              />
            </Field>
          ) : (
            <Field label="Amount received now (₹)" error={errors.paidAmount}>
              <input
                inputMode="decimal"
                value={head.paidAmount}
                onChange={(e) => setHead({ ...head, paidAmount: e.target.value })}
                className={inputCls(errors.paidAmount)}
              />
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Items</h2>
          <button
            type="button"
            onClick={addRow}
            className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-base font-medium hover:bg-muted"
          >
            <Plus className="h-5 w-5" />
            Add book
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Column titles: only on wide screens. Below that, every line is its own card with labelled boxes. */}
          <div className="hidden grid-cols-[minmax(240px,1fr)_80px_110px_80px_80px_120px_40px] gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground xl:grid">
            <span>Book</span>
            <span>Qty</span>
            <span>Rate (₹)</span>
            <span>Disc %</span>
            <span>GST %</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {rows.map((r, i) => {
            const err = (f: keyof InvoiceItemRaw) => errors[itemErrorKey(i, f)];
            const p = productById.get(Number(r.productId));
            const available = p ? p.stock + (heldQty[p.id] ?? 0) : null;
            const amount = computeLine({
              quantity: num(r.quantity),
              rate: num(r.rate),
              discountPercent: num(r.discountPercent),
              gstPercent: num(r.gstPercent),
            }).amount;
            const rowErrors = (["productId", "quantity", "rate", "discountPercent", "gstPercent"] as const)
              .map(err)
              .filter(Boolean);
            const small = "mb-1 block text-xs text-muted-foreground xl:hidden";

            return (
              <div key={r.key} className="rounded-xl border border-border p-3 xl:border-0 xl:p-0">
                <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-4 xl:grid-cols-[minmax(240px,1fr)_80px_110px_80px_80px_120px_40px]">
                  <div className="col-span-2 sm:col-span-4 xl:col-span-1">
                    <span className={small}>Book</span>
                    <select
                      value={r.productId}
                      onChange={(e) => pickProduct(r.key, e.target.value)}
                      aria-label={`Book for line ${i + 1}`}
                      className={cellCls(err("productId"))}
                    >
                      <option value="">Select a book</option>
                      {products
                        .filter((o) => o.active || o.id === Number(r.productId))
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.sku})
                          </option>
                        ))}
                    </select>
                    {available !== null && (
                      <p className={`mt-1 text-sm ${num(r.quantity) > available ? "text-red-500" : "text-muted-foreground"}`}>
                        In stock: {available}
                      </p>
                    )}
                  </div>
                  <label>
                    <span className={small}>Qty</span>
                    <input
                      inputMode="numeric"
                      value={r.quantity}
                      onChange={(e) => setRow(r.key, { quantity: e.target.value })}
                      aria-label={`Quantity for line ${i + 1}`}
                      className={cellCls(err("quantity"))}
                    />
                  </label>
                  <label>
                    <span className={small}>Rate (₹)</span>
                    <input
                      inputMode="decimal"
                      value={r.rate}
                      onChange={(e) => setRow(r.key, { rate: e.target.value })}
                      aria-label={`Rate for line ${i + 1}`}
                      className={cellCls(err("rate"))}
                    />
                  </label>
                  <label>
                    <span className={small}>Disc %</span>
                    <input
                      inputMode="decimal"
                      value={r.discountPercent}
                      onChange={(e) => setRow(r.key, { discountPercent: e.target.value })}
                      aria-label={`Discount for line ${i + 1}`}
                      className={cellCls(err("discountPercent"))}
                    />
                  </label>
                  <label>
                    <span className={small}>GST %</span>
                    <input
                      inputMode="decimal"
                      value={r.gstPercent}
                      onChange={(e) => setRow(r.key, { gstPercent: e.target.value })}
                      aria-label={`GST for line ${i + 1}`}
                      className={cellCls(err("gstPercent"))}
                    />
                  </label>
                  <div className="col-span-2 flex h-11 items-center justify-between text-base font-semibold xl:col-span-1 xl:justify-end">
                    <span className="text-sm font-normal text-muted-foreground xl:hidden">Amount</span>
                    {formatINR(amount)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    aria-label={`Remove line ${i + 1}`}
                    className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-lg text-red-500 hover:bg-red-500/10 xl:col-span-1"
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                    <span className="text-sm xl:hidden">Remove line</span>
                  </button>
                </div>
                {rowErrors.length > 0 && <p className="mt-1 text-sm text-red-500">{rowErrors.join(" · ")}</p>}
              </div>
            );
          })}
        </div>
        {errors.items && <p className="mt-3 text-sm text-red-500">{errors.items}</p>}

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-[320px] space-y-2 text-base">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GST</dt>
              <dd>{formatINR(totals.gst)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
              <dt>Grand Total</dt>
              <dd>{formatINR(totals.grandTotal)}</dd>
            </div>
            {!isQuote && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Balance due</dt>
                <dd className={balance > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                  {formatINR(balance)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {errors[FORM_ERROR] && <p className="text-sm text-red-500">{errors[FORM_ERROR]}</p>}
      <div className="flex justify-end gap-3">
        <Link
          href={backHref}
          className="flex h-11 items-center rounded-lg border border-border px-5 text-base font-medium hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving..." : isEdit ? "Save Changes" : `Create ${noun}`}
        </button>
      </div>
    </form>
  );
}
