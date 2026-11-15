import { db } from "@/db";
import { audit } from "@/db/audit";
import {
  auditLogs, authors, categories, challans, company, creditNoteItems, creditNotes, customers, expenses, invoiceItems,
  invoices, payments, printOrders, printingPresses, productImages, products, quotationItems, quotations,
  royaltyPayments, stockMovements,
} from "@/db/schema";
import { denied } from "@/lib/auth/current";
import { today } from "@/lib/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Downloads every table as one JSON file. The data lives in Supabase, which also keeps its own automatic backups;
 * this file is an extra copy you can keep. Book photos are in ImageKit and are not part of it.
 * User accounts and password hashes are deliberately left out.
 */
export async function GET() {
  if (await denied("admin")) return new Response("Forbidden", { status: 403 });
  try {
    // One transaction with a single snapshot, so all tables are from the same moment.
    const data = await db.transaction(
      async (tx) => ({
        categories: await tx.select().from(categories),
        authors: await tx.select().from(authors),
        customers: await tx.select().from(customers),
        products: await tx.select().from(products),
        productImages: await tx.select().from(productImages),
        invoices: await tx.select().from(invoices),
        invoiceItems: await tx.select().from(invoiceItems),
        payments: await tx.select().from(payments),
        stockMovements: await tx.select().from(stockMovements),
        expenses: await tx.select().from(expenses),
        royaltyPayments: await tx.select().from(royaltyPayments),
        printingPresses: await tx.select().from(printingPresses),
        printOrders: await tx.select().from(printOrders),
        quotations: await tx.select().from(quotations),
        quotationItems: await tx.select().from(quotationItems),
        creditNotes: await tx.select().from(creditNotes),
        creditNoteItems: await tx.select().from(creditNoteItems),
        challans: await tx.select().from(challans),
        auditLogs: await tx.select().from(auditLogs),
        company: await tx.select().from(company),
      }),
      { isolationLevel: "repeatable read", accessMode: "read only" }
    );
    await audit("other", "settings", 1, "Downloaded a data backup");
    const body = JSON.stringify({ app: "devanagari-prakashan", exportedOn: today(), tables: data }, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="devanagari-backup-${today()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Backup failed", { status: 500 });
  }
}
