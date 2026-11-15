import PrintOrdersView from "@/components/printing/PrintOrdersView";
import { listPresses, listPrintOrders } from "@/db/printing";
import { listProducts } from "@/db/queries";

export const metadata = { title: "Print Orders · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function PrintOrdersPage() {
  const [orders, presses, products] = await Promise.all([listPrintOrders(), listPresses(), listProducts()]);
  return (
    <PrintOrdersView
      orders={orders}
      presses={presses.map(({ id, name }) => ({ id, name }))}
      products={products.map(({ id, name, sku }) => ({ id, name, sku }))}
    />
  );
}
