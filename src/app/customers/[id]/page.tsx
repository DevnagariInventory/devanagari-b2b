import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Clock, FileSignature, FileText, IndianRupee, Plus, ScrollText, Wallet } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader, { outlineBtn, primaryBtn } from "@/components/ui/PageHeader";
import { db } from "@/db";
import { listInvoices } from "@/db/invoices";
import { customers } from "@/db/schema";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLE = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  partial: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
} as const;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = Number.isInteger(customerId)
    ? await db.select().from(customers).where(eq(customers.id, customerId))
    : [];
  if (!customer) notFound();

  const invoices = (await listInvoices()).filter((i) => i.customerId === customerId);

  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const received = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const due = Math.max(billed - received, 0);
  const place = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <Link href="/customers" className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Customer" title={customer.name}>
        <Link href={`/customers/${customer.id}/statement`} className={outlineBtn}>
          <ScrollText className="h-5 w-5" />
          Statement
        </Link>
        <Link href={`/quotations/new?customer=${customer.id}`} className={outlineBtn}>
          <FileSignature className="h-5 w-5" />
          New Quotation
        </Link>
        <Link href={`/invoices/new?customer=${customer.id}`} className={primaryBtn}>
          <Plus className="h-5 w-5" />
          New Invoice
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <dl className="grid gap-4 text-base sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Mobile", customer.mobile],
            ["Email", customer.email || "—"],
            ["GSTIN", customer.gstin || "—"],
            ["Customer since", formatDate(customer.createdAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 break-words font-medium">{v}</dd>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-sm text-muted-foreground">Address</dt>
            <dd className="mt-0.5 font-medium">{place || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoices" value={String(invoices.length)} icon={FileText} tone="blue" />
        <StatCard label="Billed" value={formatINR(billed)} icon={IndianRupee} tone="purple" />
        <StatCard label="Received" value={formatINR(received)} icon={Wallet} tone="green" />
        <StatCard label="Outstanding" value={formatINR(due)} icon={Clock} tone="amber" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 px-1 text-lg font-semibold">Invoices</h2>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[640px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Invoice", "Date", "Total", "Paid", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg last:rounded-r-lg">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/invoices/${i.id}`} className="hover:text-primary">{i.number}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(i.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatINR(i.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR(i.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLE[i.status]}`}>{i.status}</span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No invoices for this customer yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
