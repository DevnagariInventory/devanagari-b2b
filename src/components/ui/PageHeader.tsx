export default function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Buttons shown on the right. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export const primaryBtn =
  "flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground shadow-sm hover:opacity-90";
export const outlineBtn =
  "flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-base font-medium hover:bg-muted";
export const iconBtn = "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground";
export const iconBtnDanger = "rounded-lg p-2 text-red-500 hover:bg-red-500/10";
export const selectCls =
  "h-11 rounded-lg border border-border bg-card px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
export const searchCls =
  "h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
