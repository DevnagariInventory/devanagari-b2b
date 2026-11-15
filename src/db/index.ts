import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Relative imports only: this file is also loaded by the tsx seed script, which has no "@/" alias.
// Supabase Postgres. Set DATABASE_URL in .env (Supabase > Connect > Connection string).

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add your Supabase Postgres connection string to .env (Supabase dashboard > Connect)."
  );
}

// Reuse one connection pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client =
  globalForDb.pg ??
  postgres(url, {
    // The Supabase pooler in "transaction" mode (port 6543) does not support prepared statements.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX) || (process.env.NODE_ENV === "production" ? 10 : 5),
    idle_timeout: 20,
    connect_timeout: 15,
    // Keep Postgres' bigint/numeric as it sends them; our queries cast to numbers where needed.
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { client as sql };
