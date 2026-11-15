import { desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { printOrders, printingPresses, products } from "./schema";
import type { Runner } from "./stock";

export async function listPresses() {
  return db
    .select({
      id: printingPresses.id,
      name: printingPresses.name,
      contactPerson: printingPresses.contactPerson,
      mobile: printingPresses.mobile,
      email: printingPresses.email,
      address: printingPresses.address,
      gstin: printingPresses.gstin,
      orderCount: sql<number>`(select count(*) from print_orders where press_id = ${printingPresses.id})`.mapWith(Number),
      spent: sql<number>`(select coalesce(sum(received_qty * cost_per_copy), 0) from print_orders where press_id = ${printingPresses.id} and status = 'received')`.mapWith(Number),
    })
    .from(printingPresses)
    .orderBy(desc(printingPresses.id));
}

export type PressRow = Awaited<ReturnType<typeof listPresses>>[number];

export async function listPrintOrders() {
  return db
    .select({
      id: printOrders.id,
      number: printOrders.number,
      pressId: printOrders.pressId,
      pressName: printingPresses.name,
      productId: printOrders.productId,
      productName: products.name,
      quantity: printOrders.quantity,
      costPerCopy: printOrders.costPerCopy,
      orderDate: printOrders.orderDate,
      expectedDate: printOrders.expectedDate,
      status: printOrders.status,
      receivedQty: printOrders.receivedQty,
      receivedDate: printOrders.receivedDate,
      notes: printOrders.notes,
    })
    .from(printOrders)
    .innerJoin(printingPresses, eq(printingPresses.id, printOrders.pressId))
    .innerJoin(products, eq(products.id, printOrders.productId))
    .orderBy(desc(printOrders.id));
}

export type PrintOrderRow = Awaited<ReturnType<typeof listPrintOrders>>[number];

/** PO-0001, PO-0002, ... */
export async function nextPrintOrderNumber(runner: Runner = db): Promise<string> {
  let max = 0;
  for (const { number } of await runner.select({ number: printOrders.number }).from(printOrders)) {
    const n = /^PO-(\d+)$/.exec(number);
    if (n) max = Math.max(max, Number(n[1]));
  }
  return "PO-" + String(max + 1).padStart(4, "0");
}
