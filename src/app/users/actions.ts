"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { users } from "@/db/schema";
import { denied, getUser } from "@/lib/auth/current";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { today } from "@/lib/date";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parseChangePassword, parseEditUser, parseNewUser, parseResetPassword } from "@/lib/validation-users";

const refresh = () => revalidatePath("/users");
const fail = (msg: string): ActionResult => ({ ok: false, errors: { [FORM_ERROR]: msg } });

/** How many other active admins would remain if `exceptId` stopped being one. */
async function otherActiveAdmins(exceptId: number) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, exceptId)));
  return n;
}

export async function createUser(input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseNewUser(pickStrings(input, ["name", "username", "email", "role", "password"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, value.username));
  if (taken) return { ok: false, errors: { username: "That username is already taken" } };
  if (value.email) {
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, value.email));
    if (clash) return { ok: false, errors: { email: "That email address is already used by another user" } };
  }

  const hash = await hashPassword(value.password);
  const [row] = await db
    .insert(users)
    .values({ name: value.name, username: value.username, email: value.email, passwordHash: hash, role: value.role, createdAt: today() })
    .returning();
  await audit("create", "user", row.id, `Added ${value.role} user ${value.username} (${value.name})`);
  refresh();
  return { ok: true };
}

export async function updateUser(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const me = await getUser();
  const { errors, value } = parseEditUser(pickStrings(input, ["name", "email", "role", "active"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return fail("This user no longer exists.");

  if (value.email) {
    const [clash] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, value.email), ne(users.id, id)));
    if (clash) return { ok: false, errors: { email: "That email address is already used by another user" } };
  }

  const losesAdmin = u.role === "admin" && u.active && (value.role !== "admin" || !value.active);
  if (losesAdmin && me?.id === id) return fail("You can't remove your own admin access or switch off your own account.");
  if (losesAdmin && (await otherActiveAdmins(id)) === 0) return fail("There must be at least one active admin.");

  await db.update(users).set({ name: value.name, email: value.email, role: value.role, active: value.active }).where(eq(users.id, id));
  await audit("update", "user", id, `Updated user ${u.username}: ${value.role}, ${value.active ? "active" : "switched off"}`);
  refresh();
  return { ok: true };
}

export async function resetPassword(id: number, input: unknown): Promise<ActionResult> {
  const no = await denied("admin");
  if (no) return no;
  const { errors, value } = parseResetPassword(pickStrings(input, ["password"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return fail("This user no longer exists.");
  const hash = await hashPassword(value.password);
  // A new password also signs that person out everywhere (sessions are tied to the password).
  await db.update(users).set({ passwordHash: hash, failedAttempts: 0, lockedUntil: "" }).where(eq(users.id, id));
  await audit("update", "user", id, `Reset the password of ${u.username}`);
  refresh();
  return { ok: true };
}

/** Anyone can change their own password. They stay signed in only if they log in again, so the page reloads to /login. */
export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  const no = await denied("staff");
  if (no) return no;
  const me = await getUser();
  if (!me) return fail("Your session has ended. Please sign in again.");
  const { errors, value } = parseChangePassword(pickStrings(input, ["current", "password", "confirm"] as const));
  if (Object.keys(errors).length) return { ok: false, errors };

  if (!(await verifyPassword(value.current, me.passwordHash))) return { ok: false, errors: { current: "That is not your current password" } };
  const hash = await hashPassword(value.password);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, me.id));
  await audit("update", "user", me.id, `${me.username} changed their own password`);
  return { ok: true };
}
