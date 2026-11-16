import { Download } from "lucide-react";
import PageHeader, { outlineBtn, selectCls } from "@/components/ui/PageHeader";
import { REPORT_TYPES, getReport, type Cell, type Column } from "@/db/reports";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { readReportParams } from "@/lib/report-params";

export const metadata = { title: "Reports · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

function show(col: Column, v: Cell | undefined) {
  if (v === undefined || v === "") return "—";
  if (col.type === "money") return formatINR(Number(v));
  if (col.type === "date") return formatDate(String(v));
  if (col.type === "number") return Number(v).toLocaleString("en-IN");
  return String(v);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const { type, from, to } = readReportParams(await searchParams);
  const report = await getReport(type, from, to);
  const qs = new URLSearchParams({ type, from, to }).toString();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Insights" title="Reports">
        <a href={`/reports/export?${qs}`} className={outlineBtn}>
          <Download className="h-5 w-5" />
          Export CSV
        </a>
      </PageHeader>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="text-sm font-medium text-muted-foreground">
          Report
          <select name="type" defaultValue={type} className={selectCls + " mt-1 block min-w-[220px] text-foreground"}>
            {Object.entries(REPORT_TYPES).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          From
          <input type="date" name="from" defaultValue={from} disabled={!report.usesRange} className={selectCls + " mt-1 block text-foreground disabled:opacity-50"} />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          To
          <input type="date" name="to" defaultValue={to} disabled={!report.usesRange} className={selectCls + " mt-1 block text-foreground disabled:opacity-50"} />
        </label>
        <button className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90">
          Run report
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="px-1 text-xl font-semibold">{report.title}</h2>
        <p className="mt-1 px-1 text-base text-muted-foreground">
          {report.description}
          {report.usesRange && ` ${formatDate(from)} to ${formatDate(to)}.`}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="rtable w-full min-w-[720px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {report.columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium first:rounded-l-lg last:rounded-r-lg ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                  {report.columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.type === "money" || c.type === "number" ? "whitespace-nowrap text-right" : ""}`}>
                      {show(c, row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={report.columns.length} className="px-4 py-12 text-center text-muted-foreground">
                    Nothing to report for this period.
                  </td>
                </tr>
              )}
            </tbody>
            {report.totals && report.rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  {report.columns.map((c, i) => (
                    <td key={c.key} className={`px-4 py-3 ${c.type === "money" || c.type === "number" ? "whitespace-nowrap text-right" : ""}`}>
                      {i === 0 ? "Total" : report.totals![c.key] === undefined ? "" : show(c, report.totals![c.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
