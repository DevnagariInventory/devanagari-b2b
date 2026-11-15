import Link from "next/link";
import BookCover from "./BookCover";
import { discountPercent } from "@/lib/media";
import { formatINR } from "@/lib/format";

export interface CardProduct {
  id: number;
  name: string;
  authorName: string | null;
  price: number;
  mrp: number;
  stock: number;
  lowStockAt: number;
  status: "active" | "inactive";
  cover: string | null;
}

export function StockBadge({ stock, lowStockAt, status }: Pick<CardProduct, "stock" | "lowStockAt" | "status">) {
  if (status === "inactive") {
    return <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Inactive</span>;
  }
  if (stock === 0) {
    return <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">Out of stock</span>;
  }
  if (stock <= lowStockAt) {
    return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Only {stock} left</span>;
  }
  return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">In stock · {stock}</span>;
}

/** Storefront-style tile: cover, title, author, price with discount, availability. */
export default function ProductCard({ product: p, footer }: { product: CardProduct; footer?: React.ReactNode }) {
  const off = discountPercent(p.price, p.mrp);
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/products/${p.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <BookCover name={p.name} cover={p.cover} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
          {off > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              {off}% OFF
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-4 pb-3">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug">{p.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{p.authorName ?? "—"}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold">{formatINR(p.price)}</span>
            {off > 0 && <span className="text-sm text-muted-foreground line-through">{formatINR(p.mrp)}</span>}
          </div>
          <StockBadge stock={p.stock} lowStockAt={p.lowStockAt} status={p.status} />
        </div>
      </Link>
      {footer && <div className="mt-auto border-t border-border px-2 py-1.5">{footer}</div>}
    </div>
  );
}
