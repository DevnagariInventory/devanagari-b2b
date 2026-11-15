"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "@/lib/nav";
import type { Role } from "@/lib/auth/access";

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const navItems = navFor(role);

  return (
    <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-[74px] items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-brand text-lg font-bold text-primary-foreground">
          द
        </div>
        <div className="leading-tight">
          <div className="font-brand text-[20px] font-bold">Devanagari</div>
          <div className="font-brand text-sm text-muted-foreground">Prakashan</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex h-11 items-center gap-3 rounded-xl border-l-[3px] px-3 text-base font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-foreground/80 hover:bg-muted"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
