"use server";

import { denied } from "@/lib/auth/current";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { listRoyalty } from "@/db/royalty";
import { authors, royaltyPayments } from "@/db/schema";
import { today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parseRoyaltyPayment } from "@/lib/validation-ops";

const refresh = () => revalidatePath("/", "layout");

export async function payRoyalty(authorId: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseRoyaltyPayment(pickStrings(input, ["amount", "date", "mode", "note"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [author] = await db.select().from(authors).where(eq(authors.id, authorId));
  if (!author) return { ok: false, errors: { [FORM_ERROR]: "This author no longer exists." } };

  const due = (await listRoyalty()).find((r) => r.id === authorId)?.due ?? 0;
  if (value.amount > due) {
    return { ok: false, errors: { amount: due > 0 ? `Only ${formatINR(due)} is due` : "No royalty is due for this author" } };
  }

  await db.transaction(async (tx) => {
    await tx.insert(royaltyPayments).values({ ...value, authorId, createdAt: today() });
    await audit("create", "royalty", authorId, `Paid ${formatINR(value.amount)} royalty to ${author.name} (${value.mode})`, tx);
  });
  refresh();
  return { ok: true };
}

export async function deleteRoyaltyPayment(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [pay] = await db.select().from(royaltyPayments).where(eq(royaltyPayments.id, id));
  if (!pay) return { ok: true };
  const [author] = await db.select().from(authors).where(eq(authors.id, pay.authorId));
  await db.transaction(async (tx) => {
    await tx.delete(royaltyPayments).where(eq(royaltyPayments.id, id));
    await audit("delete", "royalty", pay.authorId, `Removed royalty payment of ${formatINR(pay.amount)} to ${author?.name ?? "author"}`, tx);
  });
  refresh();
  return { ok: true };
}
