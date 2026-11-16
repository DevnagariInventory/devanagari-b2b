import { renderToBuffer } from "@react-pdf/renderer";
import SimpleDocument from "@/lib/pdf/SimpleDocument";
import { customerLines, pdfResponse } from "@/db/documents";
import { getStatement } from "@/db/statements";
import { formatDate, fyStart, today } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") && ISO.test(sp.get("from")!) ? sp.get("from")! : fyStart();
  const to = sp.get("to") && ISO.test(sp.get("to")!) ? sp.get("to")! : today();
  const cid = Number(id);
  const s = Number.isInteger(cid) ? await getStatement(cid, from, to) : null;
  if (!s) return new Response("Customer not found", { status: 404 });

  const pdf = await renderToBuffer(
    <SimpleDocument
      docLabel="Statement of Account"
      number={s.customer.name}
      company={s.company}
      rightLines={[`${formatDate(from)} to ${formatDate(to)}`, `Printed ${formatDate(today())}`]}
      partyLabel="Account of"
      party={{ name: s.customer.name, lines: customerLines(s.customer) }}
      sideBlock={{
        label: "Balance",
        lines: [
          s.closing > 0.004 ? `Due from customer: ${formatINR(s.closing)}` : s.closing < -0.004 ? `Payable to customer: ${formatINR(-s.closing)}` : "Nothing due",
        ],
      }}
      cols={[
        { h: "Date", w: 62 },
        { h: "Particulars" },
        { h: "Billed", w: 74, align: "right" },
        { h: "Received", w: 74, align: "right" },
        { h: "Balance", w: 78, align: "right" },
      ]}
      rows={[
        [" ", { text: "Opening balance" }, "", "", formatINR(s.opening)],
        ...s.entries.map((e) => [
          formatDate(e.date),
          e.description,
          e.debit ? formatINR(e.debit) : "",
          e.credit ? formatINR(e.credit) : "",
          { text: formatINR(e.balance), bold: true },
        ]),
      ]}
      totals={[
        { label: "Total billed", value: formatINR(s.totalDebit) },
        { label: "Total received", value: formatINR(s.totalCredit) },
        { label: "Closing balance", value: formatINR(s.closing), big: true },
      ]}
      notes={[{ title: "Note", text: "A positive balance means the amount is due to us. Please ignore if already paid." }]}
      footerNote="This is a computer-generated statement."
    />
  );
  return pdfResponse(pdf, `Statement-${s.customer.name}-${to}`, sp.has("download"));
}
