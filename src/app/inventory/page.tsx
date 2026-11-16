import InventoryView from "@/components/inventory/InventoryView";
import { listMovements } from "@/db/inventory";
import { listProducts } from "@/db/queries";

export const metadata = { title: "Inventory · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = "", tab } = await searchParams;
  const [products, movements] = await Promise.all([listProducts(), listMovements()]);
  return <InventoryView products={products} movements={movements} initialQuery={q} initialTab={tab === "history" || tab === "category" ? tab : "stock"} />;
}
