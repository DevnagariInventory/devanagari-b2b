import { isReportType, type ReportType } from "@/db/reports";
import { fyStart, today } from "./date";
import { isValidDate } from "./validation-ops";

/** Reads ?type=&from=&to= safely: unknown values fall back to defaults (sales, this financial year to today). */
export function readReportParams(sp: { type?: string; from?: string; to?: string }) {
  const type: ReportType = sp.type && isReportType(sp.type) ? sp.type : "sales";
  let from = sp.from && isValidDate(sp.from) ? sp.from : fyStart();
  let to = sp.to && isValidDate(sp.to) ? sp.to : today();
  if (from > to) [from, to] = [to, from];
  return { type, from, to };
}
