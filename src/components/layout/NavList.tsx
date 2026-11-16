"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { isGroup, navFor, type NavLink } from "@/lib/nav";
import type { Role } from "@/lib/auth/access";

const isActive = (pathname: string, path: string) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));

/** The menu itself: single links and dropdown groups. Used by the desktop sidebar and the phone/tablet drawer. */
export default function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const entries = navFor(role);

  // Dropdowns the person has opened. The one holding the current page is always open.
  const [open, setOpen] = useState<Set<string>>(() => {
    const current = entries.find((e) => isGroup(e) && e.items.some((i) => isActive(pathname, i.path)));
    return new Set(current ? [current.label] : []);
  });
  useEffect(() => {
    const current = entries.find((e) => isGroup(e) && e.items.some((i) => isActive(pathname, i.path)));
    if (current) setOpen((o) => (o.has(current.label) ? o : new Set(o).add(current.label)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = (label: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  const row = "flex h-11 w-full items-center gap-3 rounded-xl border-l-[3px] px-3 text-base font-medium transition-colors";
  const link = (n: NavLink, nested = false) => {
    const active = isActive(pathname, n.path);
    return (
      <Link
        key={n.path}
        href={n.path}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`${row} ${nested ? "h-10 pl-4 text-[15px]" : ""} ${
          active ? "border-primary bg-primary/10 text-primary" : "border-transparent text-foreground/80 hover:bg-muted"
        }`}
      >
        <n.icon className="h-5 w-5" strokeWidth={1.75} />
        {n.label}
      </Link>
    );
  };

  return (
    <nav className="space-y-1">
      {entries.map((e) => {
        if (!isGroup(e)) return link(e);
        const expanded = open.has(e.label);
        const holdsCurrent = e.items.some((i) => isActive(pathname, i.path));
        return (
          <div key={e.label}>
            <button
              type="button"
              onClick={() => toggle(e.label)}
              aria-expanded={expanded}
              className={`${row} justify-between border-transparent ${holdsCurrent && !expanded ? "text-primary" : "text-foreground/80"} hover:bg-muted`}
            >
              <span className="flex items-center gap-3">
                <e.icon className="h-5 w-5" strokeWidth={1.75} />
                {e.label}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">{e.items.map((i) => link(i, true))}</div>}
          </div>
        );
      })}
    </nav>
  );
}
