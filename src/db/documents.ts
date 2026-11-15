import { eq } from "drizzle-orm";
import { db } from "./index";
import { company, type Company, type Customer } from "./schema";

const EMPTY_COMPANY: Company = {
  id: 1, name: "Your Company", address: "", phone: "", email: "", gstin: "", terms: "", upiId: "", invoicePrefix: "DP-",
};

export async function getCompany(): Promise<Company> {
  const [row] = await db.select().from(company).where(eq(company.id, 1));
  return row ?? EMPTY_COMPANY;
}

/** The lines printed under a customer's name on a document. */
export function customerLines(c: Customer): string[] {
  const place = [c.city, c.state, c.pincode].filter(Boolean).join(", ");
  return [c.mobile, c.email, c.address, place, c.gstin ? `GSTIN: ${c.gstin}` : ""].filter(Boolean);
}

/** A PDF response: inline for preview, attachment when ?download is present. */
export function pdfResponse(pdf: Uint8Array, filename: string, download: boolean) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename.replace(/[^\w.-]+/g, "_")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
