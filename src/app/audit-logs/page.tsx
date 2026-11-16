import Link from "next/link";
import { Search } from "lucide-react";
import PageHeader, { outlineBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import { AUDIT_PAGE_SIZE, listAuditEntities, listAuditLogs } from "@/db/audit-queries";
import { cap } from "@/lib/labels";

export const metadata = { title: "Audit Logs · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

type Search = { q?: string; entity?: string; action?: string; from?: string; to?: string; page?: string };

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  other: "bg-muted text-muted-foreground",
};

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { q = "", entity = "", action = "", from = "", to = "" } = sp;
  const { rows, total, page, pages } = await listAuditLogs({ q, entity, action, from, to, page: Number(sp.page) || 1 });
  const entities = await listAuditEntities();

  const pageHref = (p: number) => {
    const params = new URLSearchParams(Object.entries({ q, entity, action, from, to }).filter(([, v]) => v));
    params.set("page", String(p));
    return `/audit-logs?${params}`;
  };
  const filtered = q || entity || action || from || to;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Security" title="Audit Logs" />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} placeholder="Search activity..." className={searchCls} />
          </div>
          <select name="entity" defaultValue={entity} aria-label="Filter by area" className={selectCls}>
            <option value="">All areas</option>
            {entities.map((e) => (
              <option key={e} value={e}>{cap(e)}</option>
            ))}
          </select>
          <select name="action" defaultValue={action} aria-label="Filter by action" className={selectCls}>
            <option value="">All actions</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
            <option value="other">Other</option>
          </select>
          <label className="text-sm font-medium text-muted-foreground">
            From
            <input type="date" name="from" defaultValue={from} className={selectCls + " mt-1 block text-foreground"} />
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            To
            <input type="date" name="to" defaultValue={to} className={selectCls + " mt-1 block text-foreground"} />
          </label>
          <button className={outlineBtn}>Filter</button>
          {filtered && (
            <Link href="/audit-logs" className="flex h-11 items-center px-2 text-base text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[720px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                <th className="rounded-l-lg px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="rounded-r-lg px-4 py-3 font-medium">What happened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.at}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${ACTION_STYLE[r.action]}`}>{r.action}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.entity}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.userName || "-"}</td>
                  <td className="px-4 py-3">{r.summary}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {filtered ? "No activity matches your filters." : "No activity recorded yet. Changes you make will appear here."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {(page - 1) * AUDIT_PAGE_SIZE + 1}–{Math.min(page * AUDIT_PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              {page > 1 && <Link href={pageHref(page - 1)} className={outlineBtn + " !h-10"}>Previous</Link>}
              {page < pages && <Link href={pageHref(page + 1)} className={outlineBtn + " !h-10"}>Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
