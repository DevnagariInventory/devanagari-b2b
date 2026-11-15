import Link from "next/link";
import { Download, Eye, Pencil, Plus, Search } from "lucide-react";
import PageHeader, { outlineBtn, primaryBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import { listQuotations } from "@/db/quotations";
import { QUOTE_STYLE } from "@/lib/quote-style";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Quotations · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const needle = q.trim().toLowerCase();
  const rows = (await listQuotations()).filter(
    (r) => (!status || r.state === status) && (!needle || r.number.toLowerCase().includes(needle) || r.customerName.toLowerCase().includes(needle))
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Quotations">
        <Link href="/quotations/new" className={primaryBtn}>
          <Plus className="h-5 w-5" />
          New Quotation
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <form className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} placeholder="Search quotation number or customer..." className={searchCls} />
          </div>
          <select name="status" defaultValue={status} aria-label="Filter by status" className={selectCls}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className={outlineBtn}>Filter</button>
          {(q || status) && (
            <Link href="/quotations" className="flex h-11 items-center px-2 text-base text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Quotation", "Customer", "Date", "Valid until", "Total", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-4 font-semibold">
                    <Link href={`/quotations/${r.id}`} className="hover:text-primary">{r.number}</Link>
                  </td>
                  <td className="px-4 py-4">{r.customerName}</td>
                  <td className="whitespace-nowrap px-4 py-4">{formatDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-4">{r.validUntil ? formatDate(r.validUntil) : "-"}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold">{formatINR(r.total)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${QUOTE_STYLE[r.state]}`}>{r.state}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Link href={`/quotations/${r.id}`} aria-label={"View " + r.number} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Eye className="h-[18px] w-[18px]" />
                      </Link>
                      {r.status === "open" && (
                        <Link href={`/quotations/${r.id}/edit`} aria-label={"Edit " + r.number} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-[18px] w-[18px]" />
                        </Link>
                      )}
                      <a href={`/quotations/${r.id}/pdf?download=1`} aria-label={"Download " + r.number} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Download className="h-[18px] w-[18px]" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {q || status ? "No quotations match your filters." : "No quotations yet."}
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
