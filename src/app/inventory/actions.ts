"use server";

import { denied } from "@/lib/auth/current";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { moveStock } from "@/db/stock";
import { products } from "@/db/schema";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parseStockAdjust } from "@/lib/validation-ops";

export async function adjustStock(productId: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseStockAdjust(pickStrings(input, ["mode", "quantity", "note"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const result = await db.transaction(async (tx): Promise<ActionResult> => {
      // Lock the book while we work out the change, so the numbers can't shift under us.
      const [p] = await tx.select().from(products).where(eq(products.id, productId)).for("update");
      if (!p) return { ok: false, errors: { [FORM_ERROR]: "This book no longer exists." } };

      let delta: number;
      if (value.mode === "add") delta = value.quantity;
      else if (value.mode === "remove") {
        if (value.quantity > p.stock) return { ok: false, errors: { quantity: `Only ${p.stock} in stock` } };
        delta = -value.quantity;
      } else {
        delta = value.quantity - p.stock;
        if (delta === 0) return { ok: false, errors: { quantity: `Stock is already ${p.stock}` } };
      }

      const label = value.mode === "add" ? "Stock added" : value.mode === "remove" ? "Stock removed" : "Stock count set";
      await moveStock(tx, productId, delta, value.mode === "add" ? "purchase" : "adjustment", value.note || label);
      await audit("update", "inventory", productId, `${label} for "${p.name}": ${delta > 0 ? "+" : ""}${delta} (now ${p.stock + delta})`, tx);
      return { ok: true };
    });
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (e) {
    if (e instanceof Error && /below zero/.test(e.message)) {
      return { ok: false, errors: { quantity: "Stock changed meanwhile. Try again." } };
    }
    throw e;
  }
}
