"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import NavList from "./NavList";
import Brand from "./Brand";
import type { Role } from "@/lib/auth/access";

/** Menu button plus a slide-in drawer for phones and tablets (the sidebar only shows from laptop size up). */
export default function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after moving to another page, on Escape, and when the screen grows into the desktop layout.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden"; // keep the page behind from scrolling
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Rendered on <body>: the header's blur effect would otherwise trap a fixed overlay inside the header. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col border-r border-border bg-card shadow-2xl"
          >
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border pl-5 pr-3">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-4">
              <NavList role={role} onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}
