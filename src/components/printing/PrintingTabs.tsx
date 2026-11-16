import Link from "next/link";

/** Print orders and printing presses live on one page with two tabs. */
export default function PrintingTabs({ active }: { active: "orders" | "presses" }) {
  const tabs = [
    { key: "orders", label: "Print orders", href: "/printing" },
    { key: "presses", label: "Printing presses", href: "/printing?tab=presses" },
  ] as const;
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={active === t.key}
          className={`-mb-px border-b-2 px-4 py-3 text-base font-medium ${
            active === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
