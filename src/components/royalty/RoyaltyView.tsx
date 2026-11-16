"use client";

import { useState } from "react";
import { Coins, IndianRupee, Trash2, Wallet } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtnDanger, primaryBtn } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { deleteRoyaltyPayment, payRoyalty } from "@/app/royalty/actions";
import type { RoyaltyPaymentRow, RoyaltyRow } from "@/db/royalty";
import { formatDate, today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { cap } from "@/lib/labels";
import { PAYMENT_MODES } from "@/lib/validation";
import { parseRoyaltyPayment, type RoyaltyPaymentRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof RoyaltyPaymentRaw>[] = [
  { key: "amount", label: "Amount (₹) *", inputMode: "decimal" },
  { key: "date", label: "Date *", type: "date" },
  { key: "mode", label: "Payment mode *", type: "select", options: PAYMENT_MODES.map((m) => ({ value: m, label: cap(m) })) },
  { key: "note", label: "Note", placeholder: "Optional" },
];

export default function RoyaltyView({ rows, payments }: { rows: RoyaltyRow[]; payments: RoyaltyPaymentRow[] }) {
  const [paying, setPaying] = useState<RoyaltyRow | null>(null);
  const [removing, setRemoving] = useState<RoyaltyPaymentRow | null>(null);

  const totals = rows.reduce(
    (t, r) => ({ earned: t.earned + r.earned, paid: t.paid + r.paid, due: t.due + Math.max(r.due, 0) }),
    { earned: 0, paid: 0, due: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Authors" title="Royalty" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Royalty earned" value={formatINR(totals.earned)} icon={Coins} tone="blue" hint="on sales before GST" />
        <StatCard label="Paid to authors" value={formatINR(totals.paid)} icon={Wallet} tone="green" />
        <StatCard label="Due to authors" value={formatINR(totals.due)} icon={IndianRupee} tone="amber" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 px-1 text-lg font-semibold">By author</h2>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[860px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Author", "Rate", "Copies sold", "Sales", "Royalty earned", "Paid", "Due"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3">{r.percent}%</td>
                  <td className="px-4 py-3">{r.units}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR(r.sales)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR(r.earned)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR(r.paid)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 font-semibold ${r.due > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatINR(Math.max(r.due, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPaying(r)}
                      disabled={r.due <= 0}
                      className={primaryBtn + " ml-auto !h-10 !px-4 disabled:cursor-not-allowed disabled:opacity-40"}
                    >
                      Pay
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No authors yet. Add authors and link them to books to track royalty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 px-1 text-lg font-semibold">Royalty payments</h2>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[640px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Date", "Author", "Mode", "Note", "Amount"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-semibold">{p.authorName}</td>
                  <td className="px-4 py-3 capitalize">{p.mode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.note || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setRemoving(p)} aria-label="Remove payment" className={iconBtnDanger}>
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No royalty paid yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={paying !== null} title={paying ? `Pay Royalty · ${paying.name}` : ""} onClose={() => setPaying(null)}>
        {paying && (
          <DataForm<RoyaltyPaymentRaw>
            key={paying.id}
            fields={fields}
            initial={{ amount: String(paying.due), date: today(), mode: "bank", note: "" }}
            parse={parseRoyaltyPayment}
            submitLabel="Record Payment"
            onCancel={() => setPaying(null)}
            footerNote={<p className="text-sm text-muted-foreground">Royalty due: {formatINR(paying.due)}</p>}
            onSubmit={async (raw) => {
              const res = await payRoyalty(paying.id, raw);
              if (res.ok) setPaying(null);
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove Royalty Payment"
        confirmLabel="Remove"
        message={
          removing ? (
            <>
              Remove the payment of <span className="font-semibold text-foreground">{formatINR(removing.amount)}</span> to{" "}
              {removing.authorName}? It will count as due again.
            </>
          ) : null
        }
        onConfirm={() => (removing ? deleteRoyaltyPayment(removing.id) : Promise.resolve({ ok: true as const }))}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
