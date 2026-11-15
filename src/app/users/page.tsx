import { asc } from "drizzle-orm";
import UsersView from "@/components/users/UsersView";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";

export const metadata = { title: "Users · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return (
    <UsersView
      meId={me.id}
      users={rows.map((u) => ({
        id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, active: u.active, lastLoginAt: u.lastLoginAt,
      }))}
    />
  );
}
