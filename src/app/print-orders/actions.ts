"use server";

import { denied } from "@/lib/auth/current";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { nextPrintOrderNumber } from "@/db/printing";
import { lockNumbering, moveStock } from "@/db/stock";
import { expenses, printOrders, printingPresses, products } from "@/db/schema";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { FORM_ERROR, pickStrings, type ActionResult, type FieldErrors } from "@/lib/validation";
import { parsePrintOrder, parseReceive, type PrintOrderInput } from "@/lib/validation-ops";

const KEYS = ["pressId", "productId", "quantity", "costPerCopy", "orderDate", "expectedDate", "notes"] as const;
const refresh = () => revalidatePath("/", "layout");
const gone: ActionResult = { ok: false, errors: { [FORM_ERROR]: "This print order no longer exists." } };

async function refErrors(v: PrintOrderInput): Promise<FieldErrors> {
  const errors: FieldErrors = {};
  const [[press], [product]] = await Promise.all([
    db.select({ id: printingPresses.id }).from(printingPresses).where(eq(printingPresses.id, v.pressId)),
    db.select({ id: products.id }).from(products).where(eq(products.id, v.productId)),
  ]);
  if (!press) errors.pressId = "Select a printing press";
  if (!product) errors.productId = "Select a book";
  return errors;
}

export async function createPrintOrder(input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parsePrintOrder(pickStrings(input, KEYS));
  const all = { ...(Object.keys(errors).length ? {} : await refErrors(value)), ...errors };
  if (Object.keys(all).length) return { ok: false, errors: all };

  await db.transaction(async (tx) => {
    await lockNumbering(tx, "print_order");
    const number = await nextPrintOrderNumber(tx);
    const [row] = await tx.insert(printOrders).values({ ...value, number, createdAt: today() }).returning();
    await audit("create", "print order", row.id, `Created print order ${number}: ${value.quantity} copies at ${formatINR(value.costPerCopy)}`, tx);
  });
  refresh();
  return { ok: true };
}

export async function updatePrintOrder(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parsePrintOrder(pickStrings(input, KEYS));
  const all = { ...(Object.keys(errors).length ? {} : await refErrors(value)), ...errors };
  if (Object.keys(all).length) return { ok: false, errors: all };

  const [order] = await db.select().from(printOrders).where(eq(printOrders.id, id));
  if (!order) return gone;
  if (order.status === "received" || order.status === "cancelled") {
    return { ok: false, errors: { [FORM_ERROR]: `A ${order.status} order can't be edited.` } };
  }
  await db.transaction(async (tx) => {
    await tx.update(printOrders).set(value).where(eq(printOrders.id, id));
    await audit("update", "print order", id, `Updated print order ${order.number}`, tx);
  });
  refresh();
  return { ok: true };
}

/** Moves an order along: ordered -> printing, or ordered/printing -> cancelled. */
export async function setPrintOrderStatus(id: number, status: "printing" | "cancelled"): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [order] = await db.select().from(printOrders).where(eq(printOrders.id, id));
  if (!order) return gone;
  const allowed = status === "printing" ? order.status === "ordered" : order.status === "ordered" || order.status === "printing";
  if (!allowed) return { ok: false, errors: { [FORM_ERROR]: `A ${order.status} order can't be marked ${status}.` } };

  await db.transaction(async (tx) => {
    await tx.update(printOrders).set({ status }).where(eq(printOrders.id, id));
    await audit("update", "print order", id, `Print order ${order.number} marked ${status}`, tx);
  });
  refresh();
  return { ok: true };
}

/** The books arrived: add them to stock and book the printing cost as an expense. */
export async function receivePrintOrder(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseReceive(pickStrings(input, ["receivedQty", "receivedDate"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    // Lock the order so pressing "Receive" twice can't add the stock twice.
    const [order] = await tx.select().from(printOrders).where(eq(printOrders.id, id)).for("update");
    if (!order) return gone;
    if (order.status !== "ordered" && order.status !== "printing") {
      return { ok: false, errors: { [FORM_ERROR]: `A ${order.status} order can't be received.` } };
    }
    const [product] = await tx.select().from(products).where(eq(products.id, order.productId));
    if (!product) return { ok: false, errors: { [FORM_ERROR]: "The book for this order no longer exists." } };

    const cost = Math.round(value.receivedQty * order.costPerCopy * 100) / 100;
    await tx
      .update(printOrders)
      .set({ status: "received", receivedQty: value.receivedQty, receivedDate: value.receivedDate })
      .where(eq(printOrders.id, id));
    await moveStock(tx, order.productId, value.receivedQty, "print_receipt", `Print order ${order.number}`);
    if (cost > 0) {
      await tx.insert(expenses).values({
        description: `Printing: ${product.name} (${order.number})`,
        amount: cost,
        date: value.receivedDate,
        category: "Printing",
        printOrderId: id,
        createdAt: today(),
      });
    }
    await audit("update", "print order", id, `Received ${value.receivedQty} copies of "${product.name}" for ${order.number}; cost ${formatINR(cost)}`, tx);
    return { ok: true };
  });
  if (result.ok) refresh();
  return result;
}

export async function deletePrintOrder(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [order] = await db.select().from(printOrders).where(eq(printOrders.id, id));
  if (!order) return { ok: true };
  if (order.status === "received" || order.status === "printing") {
    return { ok: false, errors: { [FORM_ERROR]: `A ${order.status} order can't be deleted. Cancel it first if it won't be received.` } };
  }
  await db.transaction(async (tx) => {
    await tx.delete(printOrders).where(eq(printOrders.id, id));
    await audit("delete", "print order", id, `Deleted print order ${order.number}`, tx);
  });
  refresh();
  return { ok: true };
}
