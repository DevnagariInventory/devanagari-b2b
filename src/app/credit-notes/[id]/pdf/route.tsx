import { renderToBuffer } from "@react-pdf/renderer";
import SimpleDocument from "@/lib/pdf/SimpleDocument";
import { getCreditNoteDetail } from "@/db/credit-notes";
import { customerLines, pdfResponse } from "@/db/documents";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cnId = Number(id);
  const d = Number.isInteger(cnId) ? await getCreditNoteDetail(cnId) : null;
  if (!d) return new Response("Credit note not found", { status: 404 });
  const { note } = d;

  const pdf = await renderToBuffer(
    <SimpleDocument
      docLabel="Credit Note"
      number={note.number}
      company={d.company}
      rightLines={[`Date: ${formatDate(note.date)}`, `Against invoice ${d.invoice.number}`]}
      partyLabel="Credit to"
      party={{ name: d.customer.name, lines: customerLines(d.customer) }}
      sideBlock={{
        label: "Details",
        lines: [
          note.reason ? `Reason: ${note.reason}` : "Goods returned",
          note.restock ? "Books returned to stock" : "Books not restocked",
          ...(note.refundAmount > 0 ? [`Refunded: ${formatINR(note.refundAmount)} (${note.refundMode})`] : []),
        ],
      }}
      cols={[
        { h: "#", w: 24 },
        { h: "Item" },
        { h: "Qty", w: 40, align: "right" },
        { h: "Price", w: 80, align: "right" },
        { h: "GST", w: 42, align: "right" },
        { h: "Amount", w: 86, align: "right" },
      ]}
      rows={d.items.map((it, i) => [
        String(i + 1),
        { text: it.name, sub: it.sku, bold: true },
        String(it.quantity),
        formatINR(it.unitPrice),
        `${it.gstPercent}%`,
        { text: formatINR(it.amount), bold: true },
      ])}
      totals={[
        { label: "Subtotal", value: formatINR(d.subtotal) },
        { label: "GST", value: formatINR(d.gst) },
        { label: "Credit Total", value: formatINR(note.total), big: true },
      ]}
      notes={[{ title: "Note", text: "This credit note reduces the amount payable on the invoice named above." }]}
      footerNote="This is a computer-generated credit note."
    />
  );
  return pdfResponse(pdf, note.number, new URL(req.url).searchParams.has("download"));
}
