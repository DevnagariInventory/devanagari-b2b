import ReceivablesView from "@/components/receivables/ReceivablesView";
import { listOutstanding } from "@/db/payments";
import { getAgeing } from "@/db/statements";

export const metadata = { title: "Receivables · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const [ageing, outstanding] = await Promise.all([getAgeing(), listOutstanding()]);
  return <ReceivablesView ageing={ageing} outstanding={outstanding} />;
}
