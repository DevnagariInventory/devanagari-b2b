"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchCls } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/date";

interface Row {
  id: number;
  number: string;
  date: string;
  customerName: string;
}

/** Step 1 of a return: choose the invoice the books were sold on. */
export default function InvoicePicker({
  invoices, notFound, basePath = "/credit-notes/new", title = "Which invoice are the books being returned from?",
}: { invoices: Row[]; notFound: boolean; basePath?: string; title?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (n ? invoices.filter((i) => i.number.toLowerCase().includes(n) || i.customerName.toLowerCase().includes(n)) : invoices).slice(0, 30);
  }, [invoices, q]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {notFound && <p className="mt-2 text-sm text-red-500">That invoice was not found. Pick one below.</p>}
      <div className="relative mt-4 max-w-[440px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice number or customer..." className={searchCls} />
      </div>
      <ul className="mt-4 divide-y divide-border">
        {shown.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => router.push(`${basePath}?invoice=${i.id}`)}
              className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-muted"
            >
              <span className="font-semibold">{i.number}</span>
              <span className="flex-1 truncate text-muted-foreground">{i.customerName}</span>
              <span className="text-sm text-muted-foreground">{formatDate(i.date)}</span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-6 text-center text-muted-foreground">No invoices match.</li>}
      </ul>
    </div>
  );
}
