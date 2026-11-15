import { getReport } from "@/db/reports";
import { readReportParams } from "@/lib/report-params";

export const dynamic = "force-dynamic";

/** A CSV cell. Text starting with = + - @ is prefixed so spreadsheets don't run it as a formula. */
function cell(value: string | number | undefined, isText: boolean): string {
  if (value === undefined) return "";
  let s = String(value);
  if (isText && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { type, from, to } = readReportParams(sp);
  const report = await getReport(type, from, to);

  const lines = [report.columns.map((c) => cell(c.label, false)).join(",")];
  for (const row of report.rows) {
    lines.push(report.columns.map((c) => cell(row[c.key], c.type === "text")).join(","));
  }
  if (report.totals) {
    lines.push(
      report.columns.map((c, i) => (i === 0 ? "Total" : cell(report.totals![c.key], false))).join(",")
    );
  }

  // The BOM makes Excel read Hindi titles correctly.
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  const name = report.usesRange ? `${type}-${from}-to-${to}` : `${type}-${to}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
