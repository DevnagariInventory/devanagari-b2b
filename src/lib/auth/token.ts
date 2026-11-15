import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// A session is a signed cookie: base64url(payload) + "." + HMAC. No server-side session store is needed,
// but every request still re-checks the user in the database (see current.ts), so deactivating someone takes effect at once.

export const SESSION_COOKIE = "dp_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  uid: number;
  role: "admin" | "staff";
  exp: number; // unix seconds
  v: string; // fingerprint of the password: changing the password signs everyone out
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is not set (or too short) in .env. Add a long random string.");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export const passwordFingerprint = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);

export function createToken(s: Omit<Session, "exp">): string {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (typeof s.uid !== "number" || (s.role !== "admin" && s.role !== "staff") || s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}
