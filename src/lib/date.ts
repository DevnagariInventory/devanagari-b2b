/** Local-time "yyyy-mm-dd" (not UTC, so late-evening dates in India don't roll over). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const today = () => toISODate(new Date());

/** Local "yyyy-mm-dd hh:mm:ss". */
export function nowStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${toISODate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Start of the current Indian financial year (1 April). */
export function fyStart(d = new Date()): string {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${year}-04-01`;
}

/** First day of the month containing `iso` (or of this month). */
export const monthStart = (iso = today()) => iso.slice(0, 8) + "01";

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** "18 Sept 2026" from a stored yyyy-mm-dd. */
export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}
