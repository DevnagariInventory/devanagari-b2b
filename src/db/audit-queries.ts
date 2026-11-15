import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "./index";
import { auditLogs } from "./schema";

export const AUDIT_PAGE_SIZE = 50;

export interface AuditFilter {
  q?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
}

export async function listAuditLogs(f: AuditFilter) {
  const conds: (SQL | undefined)[] = [];
  if (f.entity) conds.push(eq(auditLogs.entity, f.entity));
  if (f.action) conds.push(eq(auditLogs.action, f.action as "create"));
  if (f.from) conds.push(gte(auditLogs.at, f.from));
  if (f.to) conds.push(lte(auditLogs.at, f.to + " 23:59:59"));
  if (f.q?.trim()) conds.push(or(ilike(auditLogs.summary, `%${f.q.trim()}%`), ilike(auditLogs.entity, `%${f.q.trim()}%`)));
  const where = and(...conds);

  const [{ n: total }] = await db.select({ n: count() }).from(auditLogs).where(where);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);
  const rows = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.id))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE);
  return { rows, total, page, pages };
}

export async function listAuditEntities() {
  const rows = await db
    .select({ entity: auditLogs.entity })
    .from(auditLogs)
    .groupBy(auditLogs.entity)
    .orderBy(sql`${auditLogs.entity}`);
  return rows.map((r) => r.entity);
}
