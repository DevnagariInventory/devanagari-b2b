"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Moon, Search, Sun } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import UserMenu from "./UserMenu";
import MobileNav from "./MobileNav";
import type { SearchHit } from "@/app/api/search/route";

export default function Header({ userName, role }: { userName: string; role: "admin" | "staff" }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [today, setToday] = useState("");

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setToday(formatLongDate(new Date()));
  }, []);

  // Look up matches shortly after the user stops typing; ignore answers that arrive late.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { hits: SearchHit[] };
        if (!stale) {
          setHits(data.hits);
          setActive(0);
        }
      } catch {}
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:gap-4 sm:px-6 lg:px-8">
      <MobileNav role={role} />
      <div ref={box} className="relative min-w-0 flex-1 sm:max-w-[576px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          placeholder="Search books, customers, invoices..."
          className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {showPanel && (
          <div
            id="global-search-results"
            role="listbox"
            className="absolute left-0 right-0 top-[52px] max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl"
          >
            {hits.length === 0 ? (
              <p className="px-3 py-4 text-base text-muted-foreground">No matches for “{query.trim()}”.</p>
            ) : (
              hits.map((h, i) => (
                <Link
                  key={`${h.type}-${h.href}-${h.label}`}
                  href={h.href}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(h);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${i === active ? "bg-muted" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium">{h.label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{h.sub}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {h.type}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:hover:bg-transparent"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <span className="hidden whitespace-nowrap text-base text-muted-foreground lg:block">{today}</span>
        <UserMenu name={userName} role={role} />
      </div>
    </header>
  );
}
