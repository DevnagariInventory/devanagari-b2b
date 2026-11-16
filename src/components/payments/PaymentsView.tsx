"use client";

import { useState } from "react";
import Link from "next/link";
import { IndianRupee, Search, Trash2, Wallet } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { iconBtnDanger, searchCls } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { deletePayment } from "@/app/payments/actions";
import type { PaymentRow } from "@/db/payments";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

interface Props {
  payments: PaymentRow[];
  stats: { totalReceived: number; thisMonth: number };
}

export default function PaymentsView({ payments, stats }: Props) {
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<PaymentRow | null>(null);

  const q = query.trim().toLowerCase();
  const payRows = payments.filter(
    (p) => !q || p.invoiceNumber.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Payments" />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Received (all time)" value={formatINR(stats.totalReceived)} icon={Wallet} tone="green" />
        <StatCard label="Received this month" value={formatINR(stats.thisMonth)} icon={IndianRupee} tone="blue" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-4 px-1 text-base text-muted-foreground">Every payment received. To record a new payment, open Receivables.</p>

        <div className="relative mb-4 max-w-[440px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, customer or reference..." className={searchCls} />
        </div>

        <div className="overflow-x-auto">
            <table className="rtable w-full min-w-[820px] text-left text-base">
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
        </div>
      </div>

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
