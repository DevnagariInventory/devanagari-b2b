"use server";

import { denied } from "@/lib/auth/current";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { authors } from "@/db/schema";
import { today } from "@/lib/date";
import { parseAuthor, pickStrings, type ActionResult } from "@/lib/validation";

const KEYS = ["name", "mobile", "email", "royaltyPercent"] as const;
const refresh = () => revalidatePath("/", "layout");

export async function createAuthor(input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseAuthor(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.insert(authors).values({ ...value, createdAt: today() });
  await audit("create", "author", value.name, `Added author "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function updateAuthor(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseAuthor(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.update(authors).set(value).where(eq(authors.id, id));
  await audit("update", "author", id, `Updated author "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function deleteAuthor(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  // Products keep existing; their author just becomes empty (ON DELETE SET NULL).
  const [gone] = await db.select().from(authors).where(eq(authors.id, id));
  await db.delete(authors).where(eq(authors.id, id));
  await audit("delete", "author", id, `Deleted author "${gone?.name ?? id}"`);
  refresh();
  return { ok: true };
}
