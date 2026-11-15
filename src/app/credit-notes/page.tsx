import Link from "next/link";
import { Download, Eye, Plus, Search } from "lucide-react";
import PageHeader, { outlineBtn, primaryBtn, searchCls } from "@/components/ui/PageHeader";
import { listCreditNotes } from "@/db/credit-notes";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Credit Notes · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function CreditNotesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const needle = q.trim().toLowerCase();
  const rows = (await listCreditNotes()).filter(
    (r) =>
      !needle ||
      r.number.toLowerCase().includes(needle) ||
      r.invoiceNumber.toLowerCase().includes(needle) ||
      r.customerName.toLowerCase().includes(needle)
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Credit Notes">
        <Link href="/credit-notes/new" className={primaryBtn}>
          <Plus className="h-5 w-5" />
          New Credit Note
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <form className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} placeholder="Search credit note, invoice or customer..." className={searchCls} />
          </div>
          <button className={outlineBtn}>Search</button>
          {q && (
            <Link href="/credit-notes" className="flex h-11 items-center px-2 text-base text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Credit note", "Customer", "Invoice", "Date", "Amount", "Refunded"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-4 font-semibold">
                    <Link href={`/credit-notes/${r.id}`} className="hover:text-primary">{r.number}</Link>
                  </td>
                  <td className="px-4 py-4">{r.customerName}</td>
                  <td className="px-4 py-4">
                    <Link href={`/invoices/${r.invoiceId}`} className="hover:text-primary">{r.invoiceNumber}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">{formatDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold">{formatINR(r.total)}</td>
                  <td className="whitespace-nowrap px-4 py-4">{r.refundAmount > 0 ? formatINR(r.refundAmount) : "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <Link href={`/credit-notes/${r.id}`} aria-label={"View " + r.number} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Eye className="h-[18px] w-[18px]" />
                      </Link>
                      <a href={`/credit-notes/${r.id}/pdf?download=1`} aria-label={"Download " + r.number} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Download className="h-[18px] w-[18px]" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {q ? "No credit notes match your search." : "No credit notes yet. Use one when a customer returns books."}
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
