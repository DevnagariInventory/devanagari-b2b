"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { primaryBtn, searchCls } from "@/components/ui/PageHeader";
import { addPayment } from "@/app/payments/actions";
import { AGE_BUCKETS } from "@/lib/ageing";
import type { AgeingCustomer } from "@/db/statements";
import type { OutstandingRow } from "@/db/payments";
import { formatDate, today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { cap } from "@/lib/labels";
import { PAYMENT_MODES } from "@/lib/validation";
import { parsePayment, type PaymentRaw } from "@/lib/validation-ops";

const BUCKET_TONE = ["", "text-amber-600", "text-orange-600", "text-red-600"];

const fields: FieldDef<keyof PaymentRaw>[] = [
  { key: "amount", label: "Amount (₹) *", inputMode: "decimal" },
  { key: "date", label: "Date *", type: "date" },
  { key: "mode", label: "Payment mode *", type: "select", options: PAYMENT_MODES.map((m) => ({ value: m, label: cap(m) })) },
  { key: "reference", label: "Reference / UTR / cheque no.", placeholder: "Optional" },
  { key: "note", label: "Note", full: true, placeholder: "Optional" },
];

interface Props {
  ageing: { customers: AgeingCustomer[]; totals: [number, number, number, number]; grand: number };
  outstanding: OutstandingRow[];
}

export default function ReceivablesView({ ageing, outstanding }: Props) {
  const { customers, totals, grand } = ageing;
  const [tab, setTab] = useState<"customer" | "invoice">("customer");
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<OutstandingRow | null>(null);

  const q = query.trim().toLowerCase();
  const dueRows = outstanding.filter((i) => !q || i.number.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
  const customerRows = customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Receivables" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total outstanding</p>
          <p className="mt-1 text-2xl font-semibold">{formatINR(grand)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.length} customer{customers.length === 1 ? "" : "s"} · {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"}
          </p>
        </div>
        {AGE_BUCKETS.map((label, i) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${totals[i] > 0 ? BUCKET_TONE[i] : ""}`}>{formatINR(totals[i])}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border">
          {([["customer", `By customer (${customers.length})`], ["invoice", `By invoice (${outstanding.length})`]] as const).map(([k, label]) => (
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
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or invoice..." className={searchCls} />
        </div>

        <div className="overflow-x-auto">
          {tab === "customer" ? (
            <table className="w-full min-w-[820px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-lg px-4 py-3 font-medium">Customer</th>
                  {AGE_BUCKETS.map((b) => (
                    <th key={b} className="px-4 py-3 text-right font-medium">{b}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Total due</th>
                  <th className="rounded-r-lg px-4 py-3" aria-label="Statement" />
                </tr>
              </thead>
              {customerRows.map((c) => (
                <tbody key={c.customerId} className="border-b border-border last:border-0">
                  <tr className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/customers/${c.customerId}`} className="hover:text-primary">{c.name}</Link>
                      <span className="block text-sm font-normal text-muted-foreground">{c.mobile}</span>
                    </td>
                    {c.buckets.map((v, i) => (
                      <td key={i} className={`whitespace-nowrap px-4 py-3 text-right ${v > 0 ? BUCKET_TONE[i] : "text-muted-foreground"}`}>
                        {v > 0 ? formatINR(v) : "-"}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatINR(c.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/customers/${c.customerId}/statement`} className="text-sm font-medium text-primary hover:underline">
                        Statement
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="px-4 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {c.invoices.map((inv) => (
                          <Link
                            key={inv.id}
                            href={`/invoices/${inv.id}`}
                            className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/70"
                            title={`${formatDate(inv.date)}, ${inv.age} days old`}
                          >
                            {inv.number} · {formatINR(inv.due)} · {inv.age}d
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              ))}
              {customerRows.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {customers.length === 0 ? "Nothing is outstanding. Every invoice is paid." : "No customers match your search."}
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          ) : (
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
    </div>
  );
}
