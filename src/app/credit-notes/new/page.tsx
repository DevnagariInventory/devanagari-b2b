import PageHeader from "@/components/ui/PageHeader";
import CreditNoteForm from "@/components/credit-notes/CreditNoteForm";
import InvoicePicker from "@/components/credit-notes/InvoicePicker";
import { getReturnable, listInvoicesForPicker } from "@/db/credit-notes";
import { today } from "@/lib/date";

export const metadata = { title: "New Credit Note · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function NewCreditNotePage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams;
  const invoiceId = Number(invoice);
  const data = Number.isInteger(invoiceId) && invoiceId > 0 ? await getReturnable(invoiceId) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="New Credit Note" />
      {data ? (
        <CreditNoteForm
          key={data.invoice.id}
          today={today()}
          invoice={{
            id: data.invoice.id,
            number: data.invoice.number,
            customerName: data.invoice.customerName,
            total: data.invoice.total,
            credited: data.invoice.creditedAmount,
            paid: data.invoice.paidAmount,
          }}
          lines={data.lines.map((l) => ({
            invoiceItemId: l.invoiceItemId,
            name: l.name,
            sku: l.sku,
            sold: l.sold,
            returned: l.returned,
            unitPrice: l.unitPrice,
            gstPercent: l.gstPercent,
          }))}
        />
      ) : (
        <InvoicePicker invoices={await listInvoicesForPicker()} notFound={Boolean(invoice)} />
      )}
    </div>
  );
}
