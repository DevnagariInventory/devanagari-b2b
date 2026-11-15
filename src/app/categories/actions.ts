"use server";

import { denied } from "@/lib/auth/current";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { categories, products } from "@/db/schema";
import { today } from "@/lib/date";
import { FORM_ERROR, parseCategory, pickStrings, type ActionResult } from "@/lib/validation";

const KEYS = ["name", "description"] as const;
const refresh = () => revalidatePath("/", "layout");

async function nameTaken(name: string, exceptId?: number) {
  const sameName = sql`lower(${categories.name}) = lower(${name})`;
  const where = exceptId === undefined ? sameName : and(sameName, ne(categories.id, exceptId));
  const [{ n }] = await db.select({ n: count() }).from(categories).where(where);
  return n > 0;
}

export async function createCategory(input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseCategory(pickStrings(input, KEYS));
  if (!errors.name && (await nameTaken(value.name))) errors.name = "A category with this name already exists";
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.insert(categories).values({ ...value, createdAt: today() });
  await audit("create", "category", value.name, `Added category "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function updateCategory(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseCategory(pickStrings(input, KEYS));
  if (!errors.name && (await nameTaken(value.name, id))) errors.name = "A category with this name already exists";
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.update(categories).set(value).where(eq(categories.id, id));
  await audit("update", "category", id, `Updated category "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [{ n: used }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  if (used > 0) {
    return {
      ok: false,
      errors: { [FORM_ERROR]: `This category is used by ${used} product${used === 1 ? "" : "s"}. Move or delete them first.` },
    };
  }
  const [gone] = await db.select().from(categories).where(eq(categories.id, id));
  await db.delete(categories).where(eq(categories.id, id));
  await audit("delete", "category", id, `Deleted category "${gone?.name ?? id}"`);
  refresh();
  return { ok: true };
}
