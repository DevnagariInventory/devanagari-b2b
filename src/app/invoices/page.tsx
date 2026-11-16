import Link from "next/link";
import { Download, Eye, Pencil, Plus, Search } from "lucide-react";
import PageHeader, { outlineBtn, primaryBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import { listInvoices, type InvoiceStatus } from "@/db/invoices";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Invoices · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  partial: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const needle = q.trim().toLowerCase();
  const invoices = (await listInvoices()).filter(
    (i) =>
      (!status || i.status === status) &&
      (!needle || i.number.toLowerCase().includes(needle) || i.customerName.toLowerCase().includes(needle))
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Invoices">
        <Link href="/invoices/new" className={primaryBtn}>
          <Plus className="h-5 w-5" />
          New Invoice
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <form className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} placeholder="Search invoice number or customer..." className={searchCls} />
          </div>
          <select name="status" defaultValue={status} aria-label="Filter by status" className={selectCls}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
          <button className={outlineBtn}>Filter</button>
          {(q || status) && (
            <Link href="/invoices" className="flex h-11 items-center px-2 text-base text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[760px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Invoice", "Customer", "Date", "Total", "Paid", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">
                    {h}
                  </th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-4 font-semibold">
                    <Link href={`/invoices/${inv.id}`} className="hover:text-primary">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{inv.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-4">{formatDate(inv.date)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold">
                    {formatINR(inv.total)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{formatINR(inv.paidAmount)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLE[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/invoices/${inv.id}`}
                        aria-label={"View " + inv.number}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="h-[18px] w-[18px]" />
                      </Link>
                      <Link
                        href={`/invoices/${inv.id}/edit`}
                        aria-label={"Edit " + inv.number}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-[18px] w-[18px]" />
                      </Link>
                      <a
                        href={`/invoices/${inv.id}/pdf?download=1`}
                        aria-label={"Download PDF for " + inv.number}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-[18px] w-[18px]" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {q || status ? "No invoices match your filters." : "No invoices yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
