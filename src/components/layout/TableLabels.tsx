"use client";

import { useEffect } from "react";

/**
 * On phones, tables marked `rtable` are drawn as one card per row (see globals.css). Each cell then needs its column
 * title, which this copies from the table header into a data-label. It also covers tables that appear later
 * (after a filter, a tab change or a dialog).
 */
export default function TableLabels() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>("table.rtable").forEach((table) => {
        const heads = [...table.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
        if (!heads.length) return;
        table.querySelectorAll("tbody tr").forEach((tr) => {
          let col = 0;
          for (const cell of Array.from(tr.children) as HTMLElement[]) {
            if (cell.tagName !== "TD") continue;
            const span = Number(cell.getAttribute("colspan") || 1);
            if (span === 1 && cell.getAttribute("data-label") !== (heads[col] ?? "")) cell.setAttribute("data-label", heads[col] ?? "");
            col += span;
          }
        });
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(label);
    };
    label();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
