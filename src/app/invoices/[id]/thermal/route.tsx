import { renderToBuffer } from "@react-pdf/renderer";
import ThermalDocument from "@/lib/pdf/ThermalDocument";
import { getInvoiceDetail } from "@/db/invoices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoiceId = Number(id);
  const invoice = Number.isInteger(invoiceId) ? await getInvoiceDetail(invoiceId) : null;
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const pdf = await renderToBuffer(<ThermalDocument invoice={invoice} />);
  const filename = `${invoice.number.replace(/[^\w.-]+/g, "_")}-receipt.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
