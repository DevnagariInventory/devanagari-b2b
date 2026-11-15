"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Boxes, IndianRupee, PackageX, Search, SlidersHorizontal } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { outlineBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import BookCover from "@/components/products/BookCover";
import { StockBadge } from "@/components/products/ProductCard";
import { adjustStock } from "@/app/inventory/actions";
import type { MovementRow } from "@/db/inventory";
import type { ProductRow } from "@/db/queries";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { MOVEMENT_LABEL } from "@/lib/labels";
import { parseStockAdjust, type StockAdjustRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof StockAdjustRaw>[] = [
  {
    key: "mode",
    label: "What happened? *",
    type: "select",
    full: true,
    options: [
      { value: "add", label: "Add stock (purchase, return, found)" },
      { value: "remove", label: "Remove stock (damaged, lost, gifted)" },
      { value: "set", label: "Set exact count (after a physical count)" },
    ],
  },
  { key: "quantity", label: "Quantity *", inputMode: "numeric" },
  { key: "note", label: "Note", placeholder: "e.g. Damaged in transit" },
];

type Tab = "stock" | "history";

export default function InventoryView({
  products,
  movements,
  initialQuery,
}: {
  products: ProductRow[];
  movements: MovementRow[];
  initialQuery: string;
}) {
  const [tab, setTab] = useState<Tab>("stock");
  const [query, setQuery] = useState(initialQuery);
  const [level, setLevel] = useState("");
  const [moveType, setMoveType] = useState("");
  const [adjusting, setAdjusting] = useState<ProductRow | null>(null);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active");
    return {
      titles: products.length,
      units: products.reduce((s, p) => s + p.stock, 0),
      value: products.reduce((s, p) => s + p.stock * p.price, 0),
      low: active.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length,
      out: active.filter((p) => p.stock === 0).length,
    };
  }, [products]);

  const q = query.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (!q || [p.name, p.sku, p.isbn, p.authorName ?? ""].some((v) => v.toLowerCase().includes(q))) &&
      (level === "" ||
        (level === "out" && p.stock === 0) ||
        (level === "low" && p.stock > 0 && p.stock <= p.lowStockAt) ||
        (level === "ok" && p.stock > p.lowStockAt))
  );
  const shownMoves = movements.filter(
    (m) =>
      (!moveType || m.type === moveType) &&
      (!q || m.productName.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q) || m.note.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stock" title="Inventory" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Titles" value={String(stats.titles)} icon={BookOpen} tone="blue" />
        <StatCard label="Units in stock" value={stats.units.toLocaleString("en-IN")} icon={Boxes} tone="green" />
        <StatCard label="Stock value" value={formatINR(stats.value)} icon={IndianRupee} tone="purple" hint="at selling price" />
        <StatCard label="Low stock" value={String(stats.low)} icon={AlertTriangle} tone="amber" />
        <StatCard label="Out of stock" value={String(stats.out)} icon={PackageX} tone="amber" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div role="tablist" className="mb-4 flex gap-1 border-b border-border">
          {([["stock", "Stock levels"], ["history", "Movement history"]] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-3 text-base font-medium ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, SKU, ISBN..."
              className={searchCls}
            />
          </div>
          {tab === "stock" ? (
            <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Stock level" className={selectCls}>
              <option value="">All levels</option>
              <option value="ok">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          ) : (
            <select value={moveType} onChange={(e) => setMoveType(e.target.value)} aria-label="Movement type" className={selectCls}>
              <option value="">All movements</option>
              {Object.entries(MOVEMENT_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          {tab === "stock" ? (
            <table className="w-full min-w-[860px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  {["Book", "SKU", "Category", "Stock", "Alert at", "Value"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                  ))}
                  <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                        <BookCover name={p.name} cover={p.cover} className="h-12 w-9 shrink-0 rounded-md border border-border" />
                        <span className="font-semibold hover:text-primary">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{p.sku}</td>
                    <td className="px-4 py-3">{p.categoryName}</td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.stock} lowStockAt={p.lowStockAt} status={p.status} />
                    </td>
                    <td className="px-4 py-3">{p.lowStockAt}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatINR(p.stock * p.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setAdjusting(p)} className={outlineBtn + " ml-auto !h-10"}>
                        <SlidersHorizontal className="h-4 w-4" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {products.length === 0 ? "No books yet." : "No books match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px] text-left text-base">
              <thead>
                <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-lg px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                  <th className="rounded-r-lg px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {shownMoves.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(m.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/products/${m.productId}`} className="font-semibold hover:text-primary">{m.productName}</Link>
                    </td>
                    <td className="px-4 py-3">{MOVEMENT_LABEL[m.type] ?? m.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.note || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.quantity > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-right">{m.balance}</td>
                  </tr>
                ))}
                {shownMoves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No stock movements yet. They appear here when you invoice, receive prints or adjust stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={adjusting !== null} title={adjusting ? `Adjust stock · ${adjusting.name}` : ""} onClose={() => setAdjusting(null)}>
        {adjusting && (
          <DataForm<StockAdjustRaw>
            key={adjusting.id}
            fields={fields}
            initial={{ mode: "add", quantity: "", note: "" }}
            parse={parseStockAdjust}
            submitLabel="Update Stock"
            onCancel={() => setAdjusting(null)}
            footerNote={<p className="text-sm text-muted-foreground">Current stock: {adjusting.stock} copies</p>}
            onSubmit={async (raw) => {
              const res = await adjustStock(adjusting.id, raw);
              if (res.ok) setAdjusting(null);
              return res;
            }}
          />
        )}
      </Modal>
    </div>
  );
}
