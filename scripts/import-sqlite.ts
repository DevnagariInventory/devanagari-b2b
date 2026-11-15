// One-time: copy the data from the old local SQLite file (data/devanagari.db) into Supabase.
//   npm run db:import-sqlite
// Run `npm run db:push` first so the tables exist, and only on an empty database.
// Book photos were stored on disk before and are NOT copied: add them again on each product page (they go to ImageKit).
import "../src/db/load-env";
import fs from "node:fs";
import Database from "better-sqlite3";
import { sql as pg } from "../src/db";

const FILE = "data/devanagari.db";

// Parents before children.
const TABLES = [
  "categories", "authors", "customers", "company", "products", "invoices", "invoice_items", "payments",
  "stock_movements", "expenses", "royalty_payments", "printing_presses", "print_orders", "audit_logs",
];

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`${FILE} not found. Nothing to import.`);
  const lite = new Database(FILE, { readonly: true });

  const [{ n }] = await pg`select count(*)::int as n from categories`;
  if (n > 0) throw new Error("The Supabase database already has data. Import only into an empty database.");

  for (const t of TABLES) {
    const rows = lite.prepare(`select * from ${t}`).all() as Record<string, unknown>[];
    if (rows.length === 0) { console.log(`${t}: 0 rows`); continue; }
    for (let i = 0; i < rows.length; i += 500) {
      await pg`insert into ${pg(t)} ${pg(rows.slice(i, i + 500) as never)}`;
    }
    if (t !== "company") {
      await pg`select setval(pg_get_serial_sequence(${t}, 'id'), (select max(id) from ${pg(t)}))`;
    }
    console.log(`${t}: ${rows.length} rows`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
