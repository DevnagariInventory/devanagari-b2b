import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { FORM_ERROR } from "@/lib/validation";
import type { Role } from "./access";
import { SESSION_COOKIE, passwordFingerprint, readToken } from "./token";

/** The fingerprint ties a session to the password AND role it was issued for; change either and old sessions stop working. */
export const sessionFingerprint = (u: Pick<User, "passwordHash" | "role">) => passwordFingerprint(u.passwordHash + "|" + u.role);

/** The signed-in user (looked up in the database on every request), or null. */
export const getUser = cache(async (): Promise<User | null> => {
  const session = readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [u] = await db.select().from(users).where(eq(users.id, session.uid));
  if (!u || !u.active || sessionFingerprint(u) !== session.v) return null;
  return u;
});

/** For pages: send signed-out people to the login screen. */
export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

/** For admin-only pages: staff go back to the dashboard. */
export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}

/**
 * For server actions and API routes: null if the caller may proceed, otherwise an error result to return.
 * Every action calls this first, because actions can be invoked directly, not only through our pages.
 */
export async function denied(min: Role = "staff"): Promise<{ ok: false; errors: Record<string, string> } | null> {
  const u = await getUser();
  if (!u) return { ok: false, errors: { [FORM_ERROR]: "Your session has ended. Please sign in again." } };
  if (min === "admin" && u.role !== "admin") return { ok: false, errors: { [FORM_ERROR]: "Only an admin can do this." } };
  return null;
}

/** Name for the audit log; empty when there's no request (scripts, tests). */
export async function currentUserName(): Promise<string> {
  try {
    return (await getUser())?.name ?? "";
  } catch {
    return "";
  }
}
