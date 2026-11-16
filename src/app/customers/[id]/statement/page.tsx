import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, MessageCircle } from "lucide-react";
import PageHeader, { outlineBtn, selectCls } from "@/components/ui/PageHeader";
import { getStatement } from "@/db/statements";
import { formatDate, fyStart, today } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Customer Statement · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const customerId = Number(id);
  const from = sp.from && ISO.test(sp.from) ? sp.from : fyStart();
  const to = sp.to && ISO.test(sp.to) ? sp.to : today();
  const s = Number.isInteger(customerId) ? await getStatement(customerId, from, to) : null;
  if (!s) notFound();

  const qs = new URLSearchParams({ from, to }).toString();
  const pdf = `/customers/${s.customer.id}/statement/pdf?${qs}`;
  const digits = s.customer.mobile.replace(/\D/g, "").replace(/^0+/, "");
  const wa = `https://wa.me/${digits.length === 10 ? "91" + digits : digits}?text=${encodeURIComponent(
    `Hello ${s.customer.name},\nYour account statement from ${s.company.name} (${formatDate(from)} to ${formatDate(to)}): ` +
      (s.closing > 0.004 ? `balance due ${formatINR(s.closing)}.` : s.closing < -0.004 ? `we owe you ${formatINR(-s.closing)}.` : "nothing is due.") +
      "\nThank you."
  )}`;

  return (
    <div className="space-y-6">
      <Link href={`/customers/${s.customer.id}`} className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Customer statement" title={s.customer.name}>
        <a href={pdf} target="_blank" rel="noreferrer" className={outlineBtn}>
          <ExternalLink className="h-5 w-5" />
          Open / Print
        </a>
        <a href={`${pdf}&download=1`} className={outlineBtn}>
          <Download className="h-5 w-5" />
          Download PDF
        </a>
        <a href={wa} target="_blank" rel="noreferrer" className={outlineBtn}>
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </a>
      </PageHeader>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="text-sm font-medium text-muted-foreground">
          From
          <input type="date" name="from" defaultValue={from} className={selectCls + " mt-1 block text-foreground"} />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          To
          <input type="date" name="to" defaultValue={to} className={selectCls + " mt-1 block text-foreground"} />
        </label>
        <button className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90">Show</button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[720px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                <th className="rounded-l-lg px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Particulars</th>
                <th className="px-4 py-3 text-right font-medium">Billed</th>
                <th className="px-4 py-3 text-right font-medium">Received</th>
                <th className="rounded-r-lg px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border text-muted-foreground">
                <td className="px-4 py-3" />
                <td className="px-4 py-3">Opening balance</td>
                <td />
                <td />
                <td className="px-4 py-3 text-right">{formatINR(s.opening)}</td>
              </tr>
              {s.entries.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{e.debit ? formatINR(e.debit) : ""}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{e.credit ? formatINR(e.credit) : ""}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatINR(e.balance)}</td>
                </tr>
              ))}
              {s.entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No transactions in this period.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-4 py-3" colSpan={2}>Closing balance</td>
                <td className="px-4 py-3 text-right">{formatINR(s.totalDebit)}</td>
                <td className="px-4 py-3 text-right">{formatINR(s.totalCredit)}</td>
                <td className={`px-4 py-3 text-right ${s.closing > 0.004 ? "text-red-600" : "text-emerald-600"}`}>{formatINR(s.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 px-1 text-sm text-muted-foreground">A positive balance means the customer owes you.</p>
      </div>
    </div>
  );
}
