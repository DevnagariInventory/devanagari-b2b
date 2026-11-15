import type { SQL } from "drizzle-orm";
import { db } from "./index";

/**
 * Run a raw SQL query and return its rows.
 * Postgres sends sum()/count() of whole numbers as bigint, which arrives as a string, so
 * raw queries cast those columns themselves (`::float8` for money, `::int` for counts).
 */
export async function rows<T>(query: SQL): Promise<T[]> {
  return Array.from(await db.execute(query)) as T[];
}

export async function row<T>(query: SQL): Promise<T> {
  return (await rows<T>(query))[0];
}
