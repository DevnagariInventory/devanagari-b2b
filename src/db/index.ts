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

// On Vercel every request can start its own server instance, and each instance opens its own connections.
// Supabase's session pooler (port 5432) allows only ~15 connections in total (see Supabase > Database > Settings >
// Connection pooling > Pool size), so with 10 per instance pages failed with "max clients reached in session mode".
// Hence only two connections per Vercel instance (see also vercel.json: the app runs in Mumbai, next to the database).
// (Port 6543, the transaction pooler, was tried and made some requests hang with this driver, so it is not used.)
const onVercel = Boolean(process.env.VERCEL);

// Reuse one connection pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client =
  globalForDb.pg ??
  postgres(url, {
    // The Supabase pooler in "transaction" mode (port 6543) does not support prepared statements.
    prepare: false,
    // Two connections per Vercel instance; bigger on a single long-running server.
    max: Number(process.env.DATABASE_POOL_MAX) || (onVercel ? 2 : process.env.NODE_ENV === "production" ? 10 : 5),
    idle_timeout: onVercel ? 5 : 20, // give the connection back quickly when an instance goes quiet
    max_lifetime: 60 * 10,
    connect_timeout: 15,
    // Keep Postgres' bigint/numeric as it sends them; our queries cast to numbers where needed.
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { client as sql };
