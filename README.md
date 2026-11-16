# Devanagari Prakashan

B2B inventory management for a book publishing company. Next.js (App Router) + Supabase Postgres (via Drizzle ORM) + ImageKit for photos.

## First-time setup

Data is stored in **Supabase** (Postgres) and book photos in **ImageKit**. Both are set in `.env`:

| Variable                                                  | Where to find it                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                                            | Supabase dashboard > **Connect** > Connection string (use the Transaction pooler, port 6543). Put your database password in place of `[YOUR-PASSWORD]` |
| `IMAGEKIT_PRIVATE_KEY`, `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | ImageKit dashboard > Developer options                                         |
| `AUTH_SECRET`                                             | A long random string that signs login cookies. Any 32+ characters; keep it secret. Changing it signs everyone out |

Then:

    npm install
    npm run db:setup     # creates the tables in Supabase and adds sample data
    npm run dev          # http://localhost:3000

`.env` holds secrets and is ignored by git. Never share it or paste its contents anywhere.

### Signing in

There is no public sign-up. Everyone signs in with a username and password, and admins add people under **Users**.
To create the very first admin (or recover access), run `npm run create-admin -- <username> "<Full name>"`; it prints a
random password. Roles:

- **Admin**: everything.
- **Staff**: billing, quotations, payments, customers, books, authors, categories and stock. Staff
  cannot delete records or open Analytics, Royalty, Expenses, Printing, Reports, Audit Logs, Settings or Users.

Five wrong passwords lock an account for 15 minutes. Changing a password, role or switching someone off signs them
out everywhere at once. If you deploy the app, set `AUTH_SECRET` (and the other variables) in your host's environment settings.

## What's in it

| Area           | What you can do                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Dashboard      | Sales, orders, low stock, trend and top-selling books                                                |
| Analytics      | Overview, Profit, Books, Customers and Operations tabs for any date range                            |
| Products       | Storefront-style catalog (grid or list), full product pages with photos, specs, stock history        |
| Quotations     | Quote a customer, edit it, send it, then convert it to an invoice in one click (stock moves only then) |
| Invoices       | Create, edit, duplicate, delete; PDF, thermal receipt, print, WhatsApp and email; record payments    |
| Receivables    | Who owes what: by customer (0-30, 31-60, 61-90, 90+ days) or by invoice, with Record payment; open a customer for their statement |
| Customers      | Directory, a page per customer, and a printable **statement of account** for any date range         |
| Authors        | Directory, royalty percentage                                                                        |
| Royalty        | Royalty earned per author on sales, record what has been paid                                        |
| Inventory      | One page with three views: stock levels (adjust stock, CSV download), totals by category, and the full movement history |
| Payments       | Every payment received, with a search (new payments are recorded from Receivables)                    |
| Expenses       | Categorised expenses with filters                                                                    |
| Printing       | One page, two tabs: print orders (order, start printing, receive: adds to stock and books the cost as an expense) and the presses you use |
| Reports        | Sales register, GST summary, best sellers, outstanding, expenses, royalty; CSV export |
| Users          | Add people, set Admin or Staff, switch off, reset passwords (admin only)                             |
| Audit Logs     | Who changed what and when, with filters                                                              |
| Settings       | Business profile printed on invoices, invoice number prefix, data backup download                |

The search box at the top finds customers, books, authors and invoices.

## Data

| Command                    | What it does                                                                    |
| -------------------------- | ------------------------------------------------------------------------------- |
| `npm run db:push`          | Creates/updates tables to match `src/db/schema.ts`                              |
| `npm run db:seed`          | Adds sample data (does nothing if the database already has data)                |
| `npm run db:reset`         | **Wipes every table** (and the book photos in ImageKit), then adds sample data  |
| `npm run db:import-sqlite` | One-time: copies the old local `data/devanagari.db` into an empty Supabase database |

After changing `src/db/schema.ts`, run `npm run db:push`.

Backups: Supabase keeps its own backups. Settings > Download backup also gives you a JSON file of all records.
Book photos live in ImageKit (folder `devanagari-prakashan/products`) and are not part of that file.

If you keep `npm run dev` running while pulling in many new files, restart it once; the dev server can hold on
to stale copies of modules.
