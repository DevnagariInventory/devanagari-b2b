import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import InvoiceDocument from "@/lib/pdf/InvoiceDocument";
import { getInvoiceDetail, type InvoiceDetail } from "@/db/invoices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** What the QR code contains: a UPI payment link if a UPI ID is configured, otherwise a text summary. */
function qrPayload(inv: InvoiceDetail): string {
  const upi = inv.company.upiId.trim();
  if (upi && inv.balance > 0) {
    const q = new URLSearchParams({
      pa: upi,
      pn: inv.company.name,
      am: inv.balance.toFixed(2),
      cu: "INR",
      tn: `Invoice ${inv.number}`,
    });
    return `upi://pay?${q.toString()}`;
  }
  return [
    inv.company.name,
    `Invoice ${inv.number}`,
    `Date ${inv.date}`,
    `Total INR ${inv.grandTotal.toFixed(2)}`,
    inv.company.gstin && `GSTIN ${inv.company.gstin}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoiceId = Number(id);
  const invoice = Number.isInteger(invoiceId) ? await getInvoiceDetail(invoiceId) : null;
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const qrDataUrl = await QRCode.toDataURL(qrPayload(invoice), { margin: 0, width: 240, errorCorrectionLevel: "M" });
  const pdf = await renderToBuffer(<InvoiceDocument invoice={invoice} qrDataUrl={qrDataUrl} />);

  const download = new URL(req.url).searchParams.has("download");
  const filename = `${invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
