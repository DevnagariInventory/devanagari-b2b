// Creates an admin account (or resets an existing user's password) from the command line.
// There is no sign-up page, so this is how the first admin is made and how access is recovered.
//   npm run create-admin -- <username> "<Full name>" [email]
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const [, , usernameArg, ...nameParts] = process.argv;
const username = (usernameArg ?? "").trim().toLowerCase();
if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
  console.error('Usage: npm run create-admin -- <username> "<Full name>" [email]   (username: 3-30 letters, numbers, . - _)');
  process.exit(1);
}
const emailArg = nameParts.find((x) => x.includes("@"));
const email = (emailArg ?? "").trim().toLowerCase();
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error("That email address does not look valid.");
  process.exit(1);
}
const name = nameParts.filter((x) => x !== emailArg).join(" ").trim() || "Administrator";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = (process.env.DATABASE_URL ?? env.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
// A random password unless you choose one: ADMIN_PASSWORD="..." npm run create-admin -- ...
let password = process.env.ADMIN_PASSWORD ?? "";
if (password && (password.length < 8 || password.length > 200)) {
  console.error("ADMIN_PASSWORD must be 8-200 characters.");
  process.exit(1);
}
if (!password) {
  for (const b of randomBytes(12)) password += alphabet[b % alphabet.length];
  password += "-7";
}
const salt = randomBytes(16);
const hash = `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
const d = new Date();
const p = (x) => String(x).padStart(2, "0");
const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const [existing] = await sql`select id from users where username = ${username}`;
  if (existing) {
    await sql`update users set password_hash = ${hash}, email = case when ${email} <> '' then ${email} else email end, role = 'admin', active = true, failed_attempts = 0, locked_until = '' where id = ${existing.id}`;
    console.log(`Updated "${username}": now an active admin with a new password.`);
  } else {
    await sql`insert into users (name, username, email, password_hash, role, created_at) values (${name}, ${username}, ${email}, ${hash}, 'admin', ${today})`;
    console.log(`Created admin "${username}".`);
  }
  console.log(`Password: ${password}   (change it under Users after signing in)`);
} finally {
  await sql.end();
}
