"use server";

import { denied } from "@/lib/auth/current";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { customers, invoices } from "@/db/schema";
import { today } from "@/lib/date";
import { FORM_ERROR, parseCustomer, pickStrings, type ActionResult } from "@/lib/validation";

const KEYS = ["name", "mobile", "email", "city", "gstin", "address", "state", "pincode"] as const;
const refresh = () => revalidatePath("/", "layout");

export async function createCustomer(input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseCustomer(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.insert(customers).values({ ...value, createdAt: today() });
  await audit("create", "customer", value.name, `Added customer "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function updateCustomer(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseCustomer(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.update(customers).set(value).where(eq(customers.id, id));
  await audit("update", "customer", id, `Updated customer "${value.name}"`);
  refresh();
  return { ok: true };
}

export async function deleteCustomer(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [{ n: used }] = await db.select({ n: count() }).from(invoices).where(eq(invoices.customerId, id));
  if (used > 0) {
    return {
      ok: false,
      errors: { [FORM_ERROR]: `This customer has ${used} invoice${used === 1 ? "" : "s"}, so it can't be deleted.` },
    };
  }
  const [gone] = await db.select().from(customers).where(eq(customers.id, id));
  await db.delete(customers).where(eq(customers.id, id));
  await audit("delete", "customer", id, `Deleted customer "${gone?.name ?? id}"`);
  refresh();
  return { ok: true };
}
