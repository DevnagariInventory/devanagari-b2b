import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { AGE_BUCKETS, getAgeing } from "@/db/statements";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const metadata = { title: "Receivables · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

const BUCKET_TONE = ["", "text-amber-600", "text-orange-600", "text-red-600"];

export default async function ReceivablesPage() {
  const { customers, totals, grand } = await getAgeing();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="Receivables" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total outstanding</p>
          <p className="mt-1 text-2xl font-semibold">{formatINR(grand)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{customers.length} customer{customers.length === 1 ? "" : "s"}</p>
        </div>
        {AGE_BUCKETS.map((label, i) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${totals[i] > 0 ? BUCKET_TONE[i] : ""}`}>{formatINR(totals[i])}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 px-1 text-base text-muted-foreground">
          Unpaid balances by how long ago the invoice was raised (as of today). Open a customer to see their invoices.
        </p>
        <div className="overflow-x-auto">
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
            {customers.map((c) => (
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
            {customers.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nothing is outstanding. Every invoice is paid.</td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
