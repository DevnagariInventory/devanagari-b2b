import { notFound } from "next/navigation";
import DocViewer from "@/components/ui/DocViewer";
import QuotationActions from "@/components/quotations/QuotationActions";
import { deleteQuotation } from "@/app/quotations/actions";
import { getQuotationDetail } from "@/db/quotations";
import { getUser } from "@/lib/auth/current";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { QUOTE_STYLE } from "@/lib/quote-style";

export const dynamic = "force-dynamic";

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qid = Number(id);
  const d = Number.isInteger(qid) ? await getQuotationDetail(qid) : null;
  if (!d) notFound();
  const me = await getUser();
  const { quotation: q } = d;

  return (
    <DocViewer
      backHref="/quotations"
      title={q.number}
      pdfUrl={`/quotations/${q.id}/pdf`}
      badge={{ text: d.state, className: QUOTE_STYLE[d.state] }}
      summary={[
        { label: "Customer", value: d.customer.name },
        { label: "Date", value: formatDate(q.date) },
        { label: "Valid until", value: q.validUntil ? formatDate(q.validUntil) : "No expiry" },
        { label: "Total", value: formatINR(d.grandTotal), strong: true },
        ...(q.createdBy ? [{ label: "Prepared by", value: q.createdBy }] : []),
      ]}
      whatsapp={{
        mobile: d.customer.mobile,
        message: `Hello ${d.customer.name},\nQuotation ${q.number} dated ${formatDate(q.date)} from ${d.company.name}.\nTotal: ${formatINR(d.grandTotal)}${q.validUntil ? `\nValid until ${formatDate(q.validUntil)}` : ""}`,
      }}
      remove={
        me?.role === "admin"
          ? {
              label: "Delete Quotation",
              message: (
                <>
                  Delete <span className="font-semibold text-foreground">{q.number}</span>? An invoice made from it is not affected.
                </>
              ),
              action: deleteQuotation.bind(null, q.id),
              afterHref: "/quotations",
            }
          : undefined
      }
    >
      <QuotationActions id={q.id} number={q.number} open={q.status === "open"} invoiceId={q.invoiceId} />
    </DocViewer>
  );
}
