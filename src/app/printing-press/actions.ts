"use server";

import { denied } from "@/lib/auth/current";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { printOrders, printingPresses } from "@/db/schema";
import { today } from "@/lib/date";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parsePress } from "@/lib/validation-ops";

const KEYS = ["name", "contactPerson", "mobile", "email", "address", "gstin"] as const;
const refresh = () => revalidatePath("/", "layout");

export async function createPress(input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parsePress(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(printingPresses).values({ ...value, createdAt: today() }).returning();
    await audit("create", "printing press", row.id, `Added printing press "${value.name}"`, tx);
  });
  refresh();
  return { ok: true };
}

export async function updatePress(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parsePress(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };
  await db.transaction(async (tx) => {
    await tx.update(printingPresses).set(value).where(eq(printingPresses.id, id));
    await audit("update", "printing press", id, `Updated printing press "${value.name}"`, tx);
  });
  refresh();
  return { ok: true };
}

export async function deletePress(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [press] = await db.select().from(printingPresses).where(eq(printingPresses.id, id));
  if (!press) return { ok: true };
  const [{ n: used }] = await db.select({ n: count() }).from(printOrders).where(eq(printOrders.pressId, id));
  if (used > 0) {
    return {
      ok: false,
      errors: { [FORM_ERROR]: `This press has ${used} print order${used === 1 ? "" : "s"}, so it can't be deleted.` },
    };
  }
  await db.transaction(async (tx) => {
    await tx.delete(printingPresses).where(eq(printingPresses.id, id));
    await audit("delete", "printing press", id, `Deleted printing press "${press.name}"`, tx);
  });
  refresh();
  return { ok: true };
}
