import { formatINR } from "@/lib/format";

interface Book {
  id: number;
  title: string;
  units: number;
  revenue: number;
}

export default function TopSellingBooks({ books }: { books: Book[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Top Selling Books</h2>
      <p className="text-base text-muted-foreground">All-time bestsellers</p>
      {books.length === 0 ? (
        <p className="mt-6 text-base text-muted-foreground">No sales yet.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {books.map((b, i) => (
            <li key={b.id} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-medium">{b.title}</div>
                <div className="text-sm text-muted-foreground">
                  {b.units} units · {formatINR(b.revenue)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
