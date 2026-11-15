import type { QuotationStatus } from "@/db/quotations";

export const QUOTE_STYLE: Record<QuotationStatus, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  expired: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  converted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
};
