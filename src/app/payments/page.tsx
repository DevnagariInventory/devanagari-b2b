import PaymentsView from "@/components/payments/PaymentsView";
import { listPayments, paymentStats } from "@/db/payments";

export const metadata = { title: "Payments · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, stats] = await Promise.all([listPayments(), paymentStats()]);
  return <PaymentsView payments={payments} stats={stats} />;
}
