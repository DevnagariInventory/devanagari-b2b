import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Package, TrendingUp, IndianRupee } from "lucide-react";
import ProductActions from "@/components/products/ProductActions";
import ProductGallery from "@/components/products/ProductGallery";
import Barcode from "@/components/products/Barcode";
import StatCard from "@/components/dashboard/StatCard";
import { getProductDetail } from "@/db/products";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { MOVEMENT_LABEL } from "@/lib/labels";
import { discountPercent } from "@/lib/media";
import { isValidEan13, splitTags } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getProductDetail(Number((await params).id));
  return { title: `${p?.name ?? "Product"} · Devanagari Prakashan` };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const p = Number.isInteger(productId) ? await getProductDetail(productId) : null;
  if (!p) notFound();

  const off = discountPercent(p.price, p.mrp);
  const inStock = p.stock > 0;
  const low = inStock && p.stock <= p.lowStockAt;
  const highlights = p.highlights.split("\n").filter(Boolean);
  const tags = splitTags(p.tags);

  const specs: [string, string][] = [
    ["Title", p.name],
    ["Author", p.authorName ?? "—"],
    ["Publisher", p.publisher || "—"],
    ["Language", p.language || "—"],
    ["Edition", p.edition || "—"],
    ["Pages", p.pages ? String(p.pages) : "—"],
    ["Binding", p.binding || "—"],
    ["Weight", p.weightGrams ? `${p.weightGrams} g` : "—"],
    ["ISBN", p.isbn || "—"],
    ["SKU", p.sku],
    ["Category", p.categoryName],
    ["GST", `${p.gst}%`],
  ];

  return (
    <div className="space-y-5 lg:space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-base text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/products?category=${p.categoryId}`} className="hover:text-foreground">{p.categoryName}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <ProductGallery name={p.name} images={p.images.map((i) => i.path)} />

        <div className="space-y-5">
          <div>
            {p.status === "inactive" && (
              <span className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                Inactive — hidden from invoices
              </span>
            )}
            <h1 className="text-3xl font-semibold leading-tight">{p.name}</h1>
            <p className="mt-2 text-base text-muted-foreground">
              {p.authorName ? <>by <span className="font-medium text-foreground">{p.authorName}</span></> : "Author not set"}
              {p.publisher && <> · {p.publisher}</>}
            </p>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="border-y border-border py-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-semibold">{formatINR(p.price)}</span>
              {off > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-sm font-semibold text-white">{off}% OFF</span>
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.gst > 0 ? `Plus ${p.gst}% GST` : "No GST"} · Price shown before discounts given on invoices
            </p>
            <p
              className={`mt-3 flex items-center gap-2 text-base font-medium ${
                !inStock ? "text-red-600" : low ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              <Package className="h-5 w-5" />
              {!inStock ? "Out of stock" : low ? `Only ${p.stock} copies left — running low` : `In stock · ${p.stock} copies`}
            </p>
          </div>

          {highlights.length > 0 && (
            <ul className="space-y-2">
              {highlights.map((h) => (
                <li key={h} className="flex gap-2 text-base">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          <ProductActions id={p.id} name={p.name} isbn={p.isbn} canInvoice={inStock && p.status === "active"} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Copies sold" value={String(p.sales.units)} icon={TrendingUp} tone="blue" hint={`${p.sales.invoiceCount} invoice${p.sales.invoiceCount === 1 ? "" : "s"}`} />
        <StatCard label="Revenue" value={formatINR(p.sales.revenue)} icon={IndianRupee} tone="green" hint="Before GST" />
        <StatCard label="Last sold" value={p.sales.lastSold ? formatDate(p.sales.lastSold) : "Never"} icon={Package} tone="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">About this book</h2>
          {p.description ? (
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{p.description}</p>
          ) : (
            <p className="mt-3 text-base text-muted-foreground">
              No description yet. <Link href={`/products/${p.id}/edit`} className="text-primary hover:underline">Add one</Link>.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Specifications</h2>
          <dl className="mt-3 divide-y divide-border">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr] gap-3 py-2.5 text-base">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {isValidEan13(p.isbn) && (
            <div className="mt-4 flex justify-center rounded-lg border border-border bg-white p-3">
              <Barcode code={p.isbn} />
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Recent stock activity</h2>
        {p.movements.length === 0 ? (
          <p className="mt-3 text-base text-muted-foreground">No stock changes recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-lg px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Note</th>
                  <th className="px-4 py-2.5 text-right font-medium">Change</th>
                  <th className="rounded-r-lg px-4 py-2.5 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {p.movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(m.date)}</td>
                    <td className="px-4 py-2.5">{MOVEMENT_LABEL[m.type] ?? m.type}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.note || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right">{m.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
