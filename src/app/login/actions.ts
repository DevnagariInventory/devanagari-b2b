"use server";

import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, SESSION_SECONDS, createToken } from "@/lib/auth/token";
import { sessionFingerprint } from "@/lib/auth/current";
import { nowStamp } from "@/lib/date";
import { FORM_ERROR, pickStrings, type ActionResult } from "@/lib/validation";
import { parseLogin } from "@/lib/validation-users";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

// Used so a wrong username takes as long to reject as a wrong password (no hint which usernames exist).
const DUMMY_HASH = "00".repeat(16) + ":" + "00".repeat(64);

async function startSession(u: User) {
  const token = createToken({ uid: u.id, role: u.role, v: sessionFingerprint(u) });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function login(input: unknown): Promise<ActionResult> {
  const raw = pickStrings(input, ["username", "password"] as const);
  const { errors, value } = parseLogin(raw);
  if (Object.keys(errors).length) return { ok: false, errors };

  // People may type either their username or their email address.
  const [u] = await db.select().from(users).where(or(eq(users.username, value.username), eq(users.email, value.username)));
  const wrong: ActionResult = { ok: false, errors: { [FORM_ERROR]: "Wrong username or password." } };

  if (!u) {
    await verifyPassword(value.password, DUMMY_HASH);
    return wrong;
  }
  if (u.lockedUntil && u.lockedUntil > nowStamp()) {
    const mins = Math.max(1, Math.ceil((Date.parse(u.lockedUntil.replace(" ", "T")) - Date.now()) / 60000));
    return { ok: false, errors: { [FORM_ERROR]: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` } };
  }
  if (!(await verifyPassword(value.password, u.passwordHash))) {
    const failed = u.failedAttempts + 1;
    const lock = failed >= MAX_FAILURES ? nowStamp(new Date(Date.now() + LOCK_MINUTES * 60000)) : "";
    await db.update(users).set({ failedAttempts: lock ? 0 : failed, lockedUntil: lock }).where(eq(users.id, u.id));
    return wrong;
  }
  if (!u.active) return { ok: false, errors: { [FORM_ERROR]: "This account has been switched off. Ask an admin." } };

  await db.update(users).set({ failedAttempts: 0, lockedUntil: "", lastLoginAt: nowStamp() }).where(eq(users.id, u.id));
  await startSession(u);
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
