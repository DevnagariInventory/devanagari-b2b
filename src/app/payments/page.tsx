import PaymentsView from "@/components/payments/PaymentsView";
import { listOutstanding, listPayments, paymentStats } from "@/db/payments";

export const metadata = { title: "Payments · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, outstanding, stats] = await Promise.all([listPayments(), listOutstanding(), paymentStats()]);
  return <PaymentsView payments={payments} outstanding={outstanding} stats={stats} />;
}
