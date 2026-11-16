import PressesView from "@/components/printing/PressesView";
import PrintOrdersView from "@/components/printing/PrintOrdersView";
import { listPresses, listPrintOrders } from "@/db/printing";
import { listProducts } from "@/db/queries";

export const metadata = { title: "Printing · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function PrintingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  if (tab === "presses") return <PressesView presses={await listPresses()} />;

  const [orders, presses, products] = await Promise.all([listPrintOrders(), listPresses(), listProducts()]);
  return (
    <PrintOrdersView
      orders={orders}
      presses={presses.map(({ id, name }) => ({ id, name }))}
      products={products.map(({ id, name, sku }) => ({ id, name, sku }))}
    />
  );
}
