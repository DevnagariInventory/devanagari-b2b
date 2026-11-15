import Link from "next/link";
import { notFound } from "next/navigation";
import DocViewer from "@/components/ui/DocViewer";
import { deleteCreditNote } from "@/app/credit-notes/actions";
import { getCreditNoteDetail } from "@/db/credit-notes";
import { getUser } from "@/lib/auth/current";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CreditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cnId = Number(id);
  const d = Number.isInteger(cnId) ? await getCreditNoteDetail(cnId) : null;
  if (!d) notFound();
  const me = await getUser();
  const { note } = d;

  return (
    <DocViewer
      backHref="/credit-notes"
      title={note.number}
      pdfUrl={`/credit-notes/${note.id}/pdf`}
      summary={[
        { label: "Customer", value: d.customer.name },
        { label: "Invoice", value: d.invoice.number },
        { label: "Date", value: formatDate(note.date) },
        { label: "Credit total", value: formatINR(note.total), strong: true },
        { label: "Refunded", value: note.refundAmount > 0 ? `${formatINR(note.refundAmount)} (${note.refundMode})` : "None" },
        { label: "Stock", value: note.restock ? "Added back" : "Not restocked" },
        ...(note.reason ? [{ label: "Reason", value: note.reason }] : []),
      ]}
      whatsapp={{
        mobile: d.customer.mobile,
        message: `Hello ${d.customer.name},\nCredit note ${note.number} dated ${formatDate(note.date)} from ${d.company.name} for ${formatINR(note.total)} against invoice ${d.invoice.number}.`,
      }}
      remove={
        me?.role === "admin"
          ? {
              label: "Delete Credit Note",
              message: (
                <>
                  Delete <span className="font-semibold text-foreground">{note.number}</span>? The invoice goes back to how it was
                  {note.restock ? ", and the returned books leave stock again" : ""}. This cannot be undone.
                </>
              ),
              action: deleteCreditNote.bind(null, note.id),
              afterHref: "/credit-notes",
            }
          : undefined
      }
    >
      <Link
        href={`/invoices/${d.invoice.id}`}
        className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-base font-medium hover:bg-muted"
      >
        View invoice
      </Link>
    </DocViewer>
  );
}
