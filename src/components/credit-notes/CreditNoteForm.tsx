"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui/Field";
import { createCreditNote } from "@/app/credit-notes/actions";
import { computeLine, round2 } from "@/lib/invoice-math";
import { formatINR } from "@/lib/format";
import { PAYMENT_MODES, FORM_ERROR, type FieldErrors } from "@/lib/validation";
import { creditErrorKey, parseCreditNote, type CreditNoteRaw } from "@/lib/validation-credit";

interface Props {
  today: string;
  invoice: { id: number; number: string; customerName: string; total: number; credited: number; paid: number };
  lines: { invoiceItemId: number; name: string; sku: string; sold: number; returned: number; unitPrice: number; gstPercent: number }[];
}

export default function CreditNoteForm({ today, invoice, lines }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [head, setHead] = useState({ date: today, reason: "", restock: "yes", refundMode: "cash" });
  const [qty, setQty] = useState<string[]>(lines.map(() => ""));

  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? 0 : Number(s));
  const credit = round2(
    lines.reduce((sum, l, i) => {
      const c = computeLine({ quantity: num(qty[i]), rate: l.unitPrice, discountPercent: 0, gstPercent: l.gstPercent });
      return sum + c.amount + c.gst;
    }, 0)
  );
  const netAfter = round2(invoice.total - invoice.credited - credit);
  const refund = round2(Math.max(0, invoice.paid - netAfter));
  const balanceAfter = round2(Math.max(netAfter - invoice.paid, 0));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw: CreditNoteRaw = {
      ...head,
      items: lines.map((l, i) => ({ invoiceItemId: String(l.invoiceItemId), quantity: qty[i] })),
    };
    const { errors: local } = parseCreditNote(raw);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = await createCreditNote(invoice.id, raw);
      if (res.ok) {
        router.push(`/credit-notes/${res.id}`);
        router.refresh();
      } else setErrors(res.errors);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Return against {invoice.number} <span className="font-normal text-muted-foreground">· {invoice.customerName}</span>
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Date *" error={errors.date}>
            <input type="date" value={head.date} onChange={(e) => setHead({ ...head, date: e.target.value })} className={inputCls(errors.date)} />
          </Field>
          <Field label="Books go back to stock?">
            <select value={head.restock} onChange={(e) => setHead({ ...head, restock: e.target.value })} className={inputCls()}>
              <option value="yes">Yes, add them back</option>
              <option value="no">No, damaged / not resellable</option>
            </select>
          </Field>
          <Field label="If money is refunded, paid by" error={errors.refundMode}>
            <select value={head.refundMode} onChange={(e) => setHead({ ...head, refundMode: e.target.value })} className={inputCls(errors.refundMode) + " capitalize"}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason" error={errors.reason}>
            <input value={head.reason} onChange={(e) => setHead({ ...head, reason: e.target.value })} placeholder="e.g. unsold copies returned" className={inputCls(errors.reason)} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Copies being returned</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-base">
            <thead>
              <tr className="text-sm uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Book</th>
                <th className="px-3 py-2 font-medium">Sold</th>
                <th className="px-3 py-2 font-medium">Already returned</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Return now</th>
                <th className="py-2 pl-3 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const left = l.sold - l.returned;
                const c = computeLine({ quantity: num(qty[i]), rate: l.unitPrice, discountPercent: 0, gstPercent: l.gstPercent });
                return (
                  <tr key={l.invoiceItemId} className="border-t border-border align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-sm text-muted-foreground">{l.sku}</div>
                    </td>
                    <td className="px-3 py-3">{l.sold}</td>
                    <td className="px-3 py-3">{l.returned}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatINR(l.unitPrice)}
                      {l.gstPercent > 0 && <span className="block text-sm text-muted-foreground">+{l.gstPercent}% GST</span>}
                    </td>
                    <td className="px-3 py-3">
                      {left > 0 ? (
                        <>
                          <input
                            inputMode="numeric"
                            value={qty[i]}
                            onChange={(e) => setQty((q) => q.map((v, j) => (j === i ? e.target.value : v)))}
                            aria-label={`Copies returned of ${l.name}`}
                            placeholder="0"
                            className={inputCls(errors[creditErrorKey(i)]).replace("mt-1 ", "") + " w-24 px-2"}
                          />
                          <p className={`mt-1 text-sm ${errors[creditErrorKey(i)] ? "text-red-500" : "text-muted-foreground"}`}>
                            {errors[creditErrorKey(i)] ?? `up to ${left}`}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">All returned</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold">{formatINR(c.amount + c.gst)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {errors.items && <p className="mt-3 text-sm text-red-500">{errors.items}</p>}

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-[360px] space-y-2 text-base">
            <div className="flex justify-between border-b border-border pb-2 text-lg font-semibold">
              <dt>Credit note total</dt>
              <dd>{formatINR(credit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Invoice after returns</dt>
              <dd>{formatINR(Math.max(netAfter, 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Already received</dt>
              <dd>{formatINR(invoice.paid)}</dd>
            </div>
            {refund > 0 ? (
              <div className="flex justify-between font-semibold text-amber-600">
                <dt>Refund to customer</dt>
                <dd>{formatINR(refund)}</dd>
              </div>
            ) : (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Balance due after</dt>
                <dd className={balanceAfter > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>{formatINR(balanceAfter)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {errors[FORM_ERROR] && <p className="text-sm text-red-500">{errors[FORM_ERROR]}</p>}
      <div className="flex justify-end gap-3">
        <Link href={`/invoices/${invoice.id}`} className="flex h-11 items-center rounded-lg border border-border px-5 text-base font-medium hover:bg-muted">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? "Saving..." : "Create Credit Note"}
        </button>
      </div>
    </form>
  );
}
