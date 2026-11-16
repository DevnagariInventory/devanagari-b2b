"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Barcode as BarcodeIcon, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { iconBtn, iconBtnDanger, primaryBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import Barcode from "./Barcode";
import BookCover from "./BookCover";
import ProductCard, { StockBadge } from "./ProductCard";
import { deleteProduct } from "@/app/products/actions";
import type { ProductRow } from "@/db/queries";
import { formatINR } from "@/lib/format";
import { discountPercent } from "@/lib/media";
import { isValidEan13 } from "@/lib/validation";

interface Option {
  id: number;
  name: string;
}

type Dialog = { kind: "delete"; row: ProductRow } | { kind: "barcode"; row: ProductRow } | null;
type View = "grid" | "list";

const SORTS = {
  newest: { label: "Newest first", cmp: (a: ProductRow, b: ProductRow) => b.id - a.id },
  name: { label: "Title A–Z", cmp: (a: ProductRow, b: ProductRow) => a.name.localeCompare(b.name) },
  priceLow: { label: "Price: low to high", cmp: (a: ProductRow, b: ProductRow) => a.price - b.price },
  priceHigh: { label: "Price: high to low", cmp: (a: ProductRow, b: ProductRow) => b.price - a.price },
  stockLow: { label: "Stock: lowest first", cmp: (a: ProductRow, b: ProductRow) => a.stock - b.stock },
} as const;
type SortKey = keyof typeof SORTS;

const isLowStock = (p: ProductRow) => p.stock <= p.lowStockAt;

export default function ProductsView({
  products,
  categories,
  initialCategory = "",
}: {
  products: ProductRow[];
  categories: Option[];
  authors: Option[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [status, setStatus] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<View>("grid");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  // Remember grid/list per browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("products-view");
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {}
  }, []);
  const chooseView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("products-view", v);
    } catch {}
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          (!categoryId || String(p.categoryId) === categoryId) &&
          (!status || p.status === status) &&
          (!lowOnly || isLowStock(p)) &&
          (!q || [p.name, p.sku, p.isbn, p.authorName ?? "", p.publisher, p.tags].some((v) => v.toLowerCase().includes(q)))
      )
      .sort(SORTS[sort].cmp);
  }, [products, query, categoryId, status, lowOnly, sort]);

  const actions = (p: ProductRow) => (
    <div className="flex justify-end gap-0.5">
      <button onClick={() => setDialog({ kind: "barcode", row: p })} aria-label={"Barcode for " + p.name} className={iconBtn}>
        <BarcodeIcon className="h-[18px] w-[18px]" />
      </button>
      <Link href={`/products/${p.id}/edit`} aria-label={"Edit " + p.name} className={iconBtn}>
        <Pencil className="h-[18px] w-[18px]" />
      </Link>
      <button onClick={() => setDialog({ kind: "delete", row: p })} aria-label={"Delete " + p.name} className={iconBtnDanger}>
        <Trash2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catalog" title="Products">
        <Link href="/products/new" className={primaryBtn}>
          <Plus className="h-5 w-5" />
          Add Product
        </Link>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, SKU, ISBN, author, tag..."
              className={searchCls}
            />
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category" className={selectCls}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectCls}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by" className={selectCls}>
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="ml-auto flex overflow-hidden rounded-lg border border-border" role="group" aria-label="View">
            {([["grid", LayoutGrid, "Grid view"], ["list", List, "List view"]] as const).map(([k, Icon, label]) => (
              <button
                key={k}
                onClick={() => chooseView(k)}
                aria-label={label}
                aria-pressed={view === k}
                className={`flex h-11 w-11 items-center justify-center ${view === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-base text-muted-foreground">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Low stock only
          </label>
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {products.length} book{products.length === 1 ? "" : "s"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-14 text-center text-muted-foreground">
            {products.length === 0 ? "No products yet. Add your first product." : "No products match your filters."}
          </p>
        ) : view === "grid" ? (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} footer={actions(p)} />
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="rtable w-full min-w-[960px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  {["Book", "SKU", "ISBN", "Category", "Price", "GST", "Stock"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">
                      {h}
                    </th>
                  ))}
                  <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                        <BookCover name={p.name} cover={p.cover} className="h-12 w-9 shrink-0 rounded-md border border-border" />
                        <div className="min-w-0">
                          <div className="font-semibold hover:text-primary">{p.name}</div>
                          {p.authorName && <div className="text-sm text-muted-foreground">{p.authorName}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{p.sku}</td>
                    <td className="px-4 py-3 font-mono text-sm">{p.isbn || "-"}</td>
                    <td className="px-4 py-3">{p.categoryName}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-semibold">{formatINR(p.price)}</div>
                      {discountPercent(p.price, p.mrp) > 0 && (
                        <div className="text-sm text-muted-foreground line-through">{formatINR(p.mrp)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.gst}%</td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.stock} lowStockAt={p.lowStockAt} status={p.status} />
                    </td>
                    <td className="px-4 py-3">{actions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={dialog?.kind === "barcode"} title="Product Barcode" onClose={close}>
        {dialog?.kind === "barcode" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-semibold">{dialog.row.name}</p>
            {isValidEan13(dialog.row.isbn) ? (
              <Barcode code={dialog.row.isbn} />
            ) : (
              <p className="py-6 text-base text-muted-foreground">
                This product has no valid ISBN. Edit the product and add a 13-digit ISBN to generate a barcode.
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Product"
        message={
          dialog?.kind === "delete" ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-foreground">{dialog.row.name}</span>?
              This cannot be undone.
            </>
          ) : null
        }
        onConfirm={() => (dialog?.kind === "delete" ? deleteProduct(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
