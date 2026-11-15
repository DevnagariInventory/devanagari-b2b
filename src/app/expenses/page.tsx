import { desc } from "drizzle-orm";
import ExpensesView from "@/components/expenses/ExpensesView";
import { db } from "@/db";
import { expenses } from "@/db/schema";

export const metadata = { title: "Expenses · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const rows = await db.select().from(expenses).orderBy(desc(expenses.date), desc(expenses.id));
  return <ExpensesView expenses={rows} />;
}
