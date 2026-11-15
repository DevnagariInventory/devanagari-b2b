import { eq } from "drizzle-orm";
import SettingsView from "@/components/settings/SettingsView";
import { db } from "@/db";
import { nextInvoiceNumber } from "@/db/invoices";
import { company } from "@/db/schema";

export const metadata = { title: "Settings · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [[c], nextNumber] = await Promise.all([db.select().from(company).where(eq(company.id, 1)), nextInvoiceNumber()]);
  return (
    <SettingsView
      initial={{
        name: c?.name ?? "",
        address: c?.address ?? "",
        phone: c?.phone ?? "",
        email: c?.email ?? "",
        gstin: c?.gstin ?? "",
        upiId: c?.upiId ?? "",
        invoicePrefix: c?.invoicePrefix ?? "DP-",
        terms: c?.terms ?? "",
      }}
      nextNumber={nextNumber}
    />
  );
}
