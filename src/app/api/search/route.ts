import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { authors, customers, invoices, products } from "@/db/schema";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export interface SearchHit {
  type: "Customer" | "Book" | "Author" | "Invoice";
  label: string;
  sub: string;
  href: string;
}

const LIMIT = 5;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return Response.json({ hits: [] satisfies SearchHit[] });
  const pat = `%${q}%`;

  const [invoiceRows, productRows, customerRows, authorRows] = await Promise.all([
    db
      .select()
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(or(ilike(invoices.number, pat), ilike(customers.name, pat)))
      .orderBy(desc(invoices.id))
      .limit(LIMIT),
    db
      .select()
      .from(products)
      .where(or(ilike(products.name, pat), ilike(products.sku, pat), ilike(products.isbn, pat), ilike(products.tags, pat)))
      .limit(LIMIT),
    db
      .select()
      .from(customers)
      .where(or(ilike(customers.name, pat), ilike(customers.mobile, pat), ilike(customers.email, pat), ilike(customers.city, pat)))
      .limit(LIMIT),
    db
      .select()
      .from(authors)
      .where(or(ilike(authors.name, pat), ilike(authors.mobile, pat), ilike(authors.email, pat)))
      .limit(LIMIT),
  ]);

  const hits: SearchHit[] = [
    ...invoiceRows.map((r) => ({
      type: "Invoice" as const,
      label: r.invoices.number,
      sub: `${r.customers.name} · ${formatINR(r.invoices.total)}`,
      href: `/invoices/${r.invoices.id}`,
    })),
    ...productRows.map((p) => ({ type: "Book" as const, label: p.name, sub: `SKU ${p.sku} · ${p.stock} in stock`, href: `/products/${p.id}` })),
    ...customerRows.map((c) => ({
      type: "Customer" as const,
      label: c.name,
      sub: [c.mobile, c.city].filter(Boolean).join(" · "),
      href: `/customers/${c.id}`,
    })),
    ...authorRows.map((a) => ({ type: "Author" as const, label: a.name, sub: `${a.royaltyPercent}% royalty`, href: "/authors" })),
  ];

  return Response.json({ hits });
}
