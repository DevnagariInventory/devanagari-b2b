"use server";

import { denied } from "@/lib/auth/current";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { company } from "@/db/schema";
import { pickStrings, type ActionResult } from "@/lib/validation";
import { parseCompany } from "@/lib/validation-ops";

const KEYS = ["name", "address", "phone", "email", "gstin", "upiId", "invoicePrefix", "terms"] as const;

export async function saveCompany(input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseCompany(pickStrings(input, KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  await db.transaction(async (tx) => {
    await tx.insert(company).values({ id: 1, ...value }).onConflictDoUpdate({ target: company.id, set: value });
    await audit("update", "settings", 1, `Updated business profile "${value.name}"`, tx);
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
