"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, IndianRupee, Search, Trash2, Wallet } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtnDanger, primaryBtn, searchCls } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { addPayment, deletePayment } from "@/app/payments/actions";
import type { OutstandingRow, PaymentRow } from "@/db/payments";
import { formatDate, today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { cap } from "@/lib/labels";
import { PAYMENT_MODES } from "@/lib/validation";
import { parsePayment, type PaymentRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof PaymentRaw>[] = [
  { key: "amount", label: "Amount (₹) *", inputMode: "decimal" },
  { key: "date", label: "Date *", type: "date" },
  { key: "mode", label: "Payment mode *", type: "select", options: PAYMENT_MODES.map((m) => ({ value: m, label: cap(m) })) },
  { key: "reference", label: "Reference / UTR / cheque no.", placeholder: "Optional" },
  { key: "note", label: "Note", full: true, placeholder: "Optional" },
];

interface Props {
  payments: PaymentRow[];
  outstanding: OutstandingRow[];
  stats: { totalReceived: number; thisMonth: number; outstanding: number; overdueCount: number };
}

export default function PaymentsView({ payments, outstanding, stats }: Props) {
  const [tab, setTab] = useState<"due" | "history">("due");
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<OutstandingRow | null>(null);
  const [removing, setRemoving] = useState<PaymentRow | null>(null);

  const q = query.trim().toLowerCase();
  const dueRows = outstanding.filter((i) => !q || i.number.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
  const payRows = payments.filter(
    (p) => !q || p.invoiceNumber.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Money" title="Payments" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Received (all time)" value={formatINR(stats.totalReceived)} icon={Wallet} tone="green" />
        <StatCard label="Received this month" value={formatINR(stats.thisMonth)} icon={IndianRupee} tone="blue" />
        <StatCard label="Outstanding" value={formatINR(stats.outstanding)} icon={Clock} tone="amber" hint={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`} />
        <StatCard label="Overdue 30+ days" value={String(stats.overdueCount)} icon={AlertTriangle} tone="purple" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div role="tablist" className="mb-4 flex gap-1 border-b border-border">
          {([["due", `Outstanding (${outstanding.length})`], ["history", `Payment history (${payments.length})`]] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-3 text-base font-medium ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mb-4 max-w-[440px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice or customer..." className={searchCls} />
        </div>

        <div className="overflow-x-auto">
          {tab === "due" ? (
            <table className="w-full min-w-[820px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  {["Invoice", "Customer", "Date", "Age", "Total", "Received", "Due"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                  ))}
                  <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {dueRows.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/invoices/${i.id}`} className="hover:text-primary">{i.number}</Link>
                    </td>
                    <td className="px-4 py-3">{i.customerName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(i.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${i.ageDays > 30 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>
                        {i.ageDays}d
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatINR(i.total)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatINR(i.paid)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-red-600">{formatINR(i.balance)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setPaying(i)} className={primaryBtn + " ml-auto !h-10 !px-4"}>
                        Record payment
                      </button>
                    </td>
                  </tr>
                ))}
                {dueRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {outstanding.length === 0 ? "Nothing outstanding. Every invoice is paid." : "No invoices match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  {["Date", "Invoice", "Customer", "Mode", "Reference", "Amount"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                  ))}
                  <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {payRows.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/invoices/${p.invoiceId}`} className="hover:text-primary">{p.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3">{p.customerName}</td>
                    <td className="px-4 py-3 capitalize">{p.mode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reference || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-600">{formatINR(p.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setRemoving(p)} aria-label={`Remove payment on ${p.invoiceNumber}`} className={iconBtnDanger}>
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </td>
                  </tr>
                ))}
                {payRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {payments.length === 0 ? "No payments recorded yet." : "No payments match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={paying !== null} title={paying ? `Record Payment · ${paying.number}` : ""} onClose={() => setPaying(null)}>
        {paying && (
          <DataForm<PaymentRaw>
            key={paying.id}
            fields={fields}
            initial={{ amount: String(paying.balance), date: today(), mode: "cash", reference: "", note: "" }}
            parse={parsePayment}
            submitLabel="Record Payment"
            onCancel={() => setPaying(null)}
            footerNote={
              <p className="text-sm text-muted-foreground">
                {paying.customerName} · balance due {formatINR(paying.balance)}
              </p>
            }
            onSubmit={async (raw) => {
              const res = await addPayment(paying.id, raw);
              if (res.ok) setPaying(null);
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove Payment"
        confirmLabel="Remove"
        message={
          removing ? (
            <>
              Remove the payment of <span className="font-semibold text-foreground">{formatINR(removing.amount)}</span> on{" "}
              {removing.invoiceNumber}? The balance due goes back up.
            </>
          ) : null
        }
        onConfirm={() => (removing ? deletePayment(removing.id) : Promise.resolve({ ok: true as const }))}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
