"use server";

import { denied } from "@/lib/auth/current";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { expenses } from "@/db/schema";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { pickStrings, type ActionResult } from "@/lib/validation";
import { parseExpense } from "@/lib/validation-ops";

const KEYS = ["description", "amount", "date", "category"] as const;
const refresh = () => revalidatePath("/", "layout");

export async function createExpense(input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseExpense(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.transaction(async (tx) => {
    const [row] = await tx.insert(expenses).values({ ...value, createdAt: today() }).returning();
    await audit("create", "expense", row.id, `Added expense "${value.description}" ${formatINR(value.amount)} (${value.category})`, tx);
  });
  refresh();
  return { ok: true };
}

export async function updateExpense(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseExpense(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.transaction(async (tx) => {
    await tx.update(expenses).set(value).where(eq(expenses.id, id));
    await audit("update", "expense", id, `Updated expense "${value.description}" to ${formatINR(value.amount)}`, tx);
  });
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
  if (!row) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.delete(expenses).where(eq(expenses.id, id));
    await audit("delete", "expense", id, `Deleted expense "${row.description}" ${formatINR(row.amount)}`, tx);
  });
  refresh();
  return { ok: true };
}
