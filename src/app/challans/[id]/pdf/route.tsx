import { renderToBuffer } from "@react-pdf/renderer";
import SimpleDocument from "@/lib/pdf/SimpleDocument";
import { getChallanDetail } from "@/db/challans";
import { customerLines, pdfResponse } from "@/db/documents";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cid = Number(id);
  const d = Number.isInteger(cid) ? await getChallanDetail(cid) : null;
  if (!d) return new Response("Challan not found", { status: 404 });
  const { challan: c } = d;
  const copies = d.items.reduce((s, i) => s + i.quantity, 0);

  const transport = [
    c.transporter && `Transporter: ${c.transporter}`,
    c.vehicleNo && `Vehicle: ${c.vehicleNo}`,
    c.lrNumber && `LR / docket: ${c.lrNumber}`,
    c.packages > 0 && `Packages: ${c.packages}`,
  ].filter(Boolean) as string[];

  const pdf = await renderToBuffer(
    <SimpleDocument
      docLabel="Delivery Challan"
      number={c.number}
      company={d.company}
      rightLines={[`Date: ${formatDate(c.date)}`, `Invoice: ${d.invoice.number}`]}
      partyLabel="Deliver to"
      party={{ name: d.customer.name, lines: [...customerLines(d.customer), ...(c.destination ? [`Destination: ${c.destination}`] : [])] }}
      sideBlock={transport.length ? { label: "Transport", lines: transport } : undefined}
      cols={[
        { h: "#", w: 24 },
        { h: "Item" },
        { h: "ISBN", w: 100 },
        { h: "Qty", w: 50, align: "right" },
      ]}
      rows={d.items.map((it, i) => [String(i + 1), { text: it.name, sub: it.sku, bold: true }, it.isbn || "-", String(it.quantity)])}
      totals={[{ label: "Total copies", value: String(copies), big: true }]}
      notes={[
        ...(c.notes ? [{ title: "Notes", text: c.notes }] : []),
        { title: "Receiver", text: "Goods received in good condition. Receiver's name, signature and stamp:" },
      ]}
      signLabel="Authorised Signatory"
      footerNote="This is a delivery challan, not a tax invoice."
    />
  );
  return pdfResponse(pdf, c.number, new URL(req.url).searchParams.has("download"));
}
