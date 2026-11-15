import { like } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "./index";
import type { Runner } from "./stock";

/**
 * Next document number for a table: prefix + (highest existing number + 1), e.g. CN-00007.
 * Call it inside a transaction that holds `lockNumbering`, so two people can't get the same number.
 */
export async function nextNumber(table: PgTable, column: PgColumn, prefix: string, runner: Runner = db): Promise<string> {
  const existing = (await runner
    .select({ number: column })
    .from(table)
    .where(like(column, prefix + "%"))) as { number: string }[];
  let max = 0;
  let width = 5;
  for (const { number } of existing) {
    const digits = number.slice(prefix.length);
    if (!/^\d+$/.test(digits)) continue;
    max = Math.max(max, Number(digits));
    width = Math.max(width, digits.length);
  }
  return prefix + String(max + 1).padStart(width, "0");
}
