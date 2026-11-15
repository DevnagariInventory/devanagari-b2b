import RoyaltyView from "@/components/royalty/RoyaltyView";
import { listRoyalty, listRoyaltyPayments } from "@/db/royalty";

export const metadata = { title: "Royalty · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function RoyaltyPage() {
  const [rows, payments] = await Promise.all([listRoyalty(), listRoyaltyPayments()]);
  return <RoyaltyView rows={rows} payments={payments} />;
}
