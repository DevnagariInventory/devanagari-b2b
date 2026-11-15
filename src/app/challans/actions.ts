"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { nextNumber } from "@/db/numbering";
import { lockNumbering } from "@/db/stock";
import { challans, invoices } from "@/db/schema";
import { denied, getUser } from "@/lib/auth/current";
import { today } from "@/lib/date";
import { FORM_ERROR, pickStrings, type ActionResult, type CreateResult } from "@/lib/validation";
import { CHALLAN_KEYS, parseChallan } from "@/lib/validation-challan";

const refresh = () => revalidatePath("/", "layout");

export async function createChallan(invoiceId: number, input: unknown): Promise<CreateResult> {
  const no = await denied("staff");
  if (no) return no;
  const { errors, value } = parseChallan(pickStrings(input, CHALLAN_KEYS));
  if (Object.keys(errors).length) return { ok: false, errors };

  const me = await getUser();
  const result = await db.transaction(async (tx): Promise<CreateResult> => {
    await lockNumbering(tx, "challan");
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) return { ok: false, errors: { [FORM_ERROR]: "This invoice no longer exists." } };
    const number = await nextNumber(challans, challans.number, "DC-", tx);
    const [row] = await tx
      .insert(challans)
      .values({ ...value, number, invoiceId, createdBy: me?.name ?? "", createdAt: today() })
      .returning();
    await audit("create", "challan", row.id, `Created delivery challan ${number} for invoice ${inv.number}`, tx);
    return { ok: true, id: row.id };
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteChallan(id: number): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const [row] = await db.select().from(challans).where(eq(challans.id, id));
  if (!row) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.delete(challans).where(eq(challans.id, id));
    await audit("delete", "challan", id, `Deleted delivery challan ${row.number}`, tx);
  });
  refresh();
  return { ok: true };
}
