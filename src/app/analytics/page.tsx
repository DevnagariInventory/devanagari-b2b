import AnalyticsView from "@/components/analytics/AnalyticsView";
import { getAnalytics } from "@/db/analytics";
import { daysAgo, today } from "@/lib/date";

export const metadata = { title: "Analytics · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  // Default: last 90 days. Ignore malformed or reversed ranges.
  let from = params.from && ISO.test(params.from) ? params.from : daysAgo(90);
  let to = params.to && ISO.test(params.to) ? params.to : today();
  if (from > to) {
    from = daysAgo(90);
    to = today();
  }

  return <AnalyticsView from={from} to={to} data={await getAnalytics(from, to)} />;
}
