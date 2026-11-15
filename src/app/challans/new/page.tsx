import PageHeader from "@/components/ui/PageHeader";
import ChallanForm from "@/components/challans/ChallanForm";
import InvoicePicker from "@/components/credit-notes/InvoicePicker";
import { getInvoiceForChallan } from "@/db/challans";
import { listInvoicesForPicker } from "@/db/credit-notes";
import { today } from "@/lib/date";

export const metadata = { title: "New Delivery Challan · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function NewChallanPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams;
  const invoiceId = Number(invoice);
  const inv = Number.isInteger(invoiceId) && invoiceId > 0 ? await getInvoiceForChallan(invoiceId) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sales" title="New Delivery Challan" />
      {inv ? (
        <ChallanForm invoiceId={inv.id} invoiceNumber={inv.number} customerName={inv.customerName} today={today()} destination={inv.city} />
      ) : (
        <InvoicePicker
          invoices={await listInvoicesForPicker()}
          notFound={Boolean(invoice)}
          basePath="/challans/new"
          title="Which invoice are the books being dispatched for?"
        />
      )}
    </div>
  );
}
