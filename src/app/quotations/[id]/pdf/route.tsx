import { renderToBuffer } from "@react-pdf/renderer";
import SimpleDocument from "@/lib/pdf/SimpleDocument";
import { customerLines, pdfResponse } from "@/db/documents";
import { getQuotationDetail } from "@/db/quotations";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const qid = Number(id);
  const d = Number.isInteger(qid) ? await getQuotationDetail(qid) : null;
  if (!d) return new Response("Quotation not found", { status: 404 });
  const { quotation: q } = d;

  const pdf = await renderToBuffer(
    <SimpleDocument
      docLabel="Quotation"
      number={q.number}
      company={d.company}
      rightLines={[`Date: ${formatDate(q.date)}`, q.validUntil ? `Valid until: ${formatDate(q.validUntil)}` : "Valid until: not specified"]}
      partyLabel="Quotation for"
      party={{ name: d.customer.name, lines: customerLines(d.customer) }}
      cols={[
        { h: "#", w: 24 },
        { h: "Item" },
        { h: "Qty", w: 40, align: "right" },
        { h: "Rate", w: 74, align: "right" },
        { h: "Disc", w: 46, align: "right" },
        { h: "GST", w: 42, align: "right" },
        { h: "Amount", w: 84, align: "right" },
      ]}
      rows={d.items.map((it, i) => [
        String(i + 1),
        { text: it.name, sub: it.sku, bold: true },
        String(it.quantity),
        formatINR(it.rate),
        `${it.discountPercent}%`,
        `${it.gstPercent}%`,
        { text: formatINR(it.amount), bold: true },
      ])}
      totals={[
        { label: "Subtotal", value: formatINR(d.subtotal) },
        { label: "GST", value: formatINR(d.gst) },
        { label: "Total", value: formatINR(d.grandTotal), big: true },
      ]}
      notes={[
        ...(q.notes ? [{ title: "Notes", text: q.notes }] : []),
        ...(d.company.terms ? [{ title: "Terms & Conditions", text: d.company.terms }] : []),
        { title: "Please note", text: "This is a quotation, not a tax invoice. Stock is not reserved until an invoice is issued." },
      ]}
      footerNote="We look forward to your order."
    />
  );
  return pdfResponse(pdf, q.number, new URL(req.url).searchParams.has("download"));
}
