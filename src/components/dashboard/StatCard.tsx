import type { LucideIcon } from "lucide-react";

const tones = {
  blue: {
    card: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-500/5",
    icon: "bg-blue-600 text-white shadow-blue-600/30",
    label: "text-blue-700 dark:text-blue-300",
  },
  green: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-500/5",
    icon: "bg-emerald-600 text-white shadow-emerald-600/30",
    label: "text-emerald-700 dark:text-emerald-300",
  },
  purple: {
    card: "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/60 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-violet-500/5",
    icon: "bg-violet-600 text-white shadow-violet-600/30",
    label: "text-violet-700 dark:text-violet-300",
  },
  amber: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-amber-500/5",
    icon: "bg-amber-500 text-white shadow-amber-500/30",
    label: "text-amber-700 dark:text-amber-300",
  },
} as const;

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
  hint?: string;
}

export default function StatCard({ label, value, icon: Icon, tone, hint }: Props) {
  const t = tones[tone];
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${t.card}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-semibold uppercase tracking-wider ${t.label}`}>{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-[32px] font-semibold leading-tight">{value}</span>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
