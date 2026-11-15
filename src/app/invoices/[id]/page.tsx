import { notFound } from "next/navigation";
import InvoiceViewer from "@/components/invoices/InvoiceViewer";
import { getInvoiceDetail } from "@/db/invoices";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const invoice = Number.isInteger(invoiceId) ? await getInvoiceDetail(invoiceId) : null;
  if (!invoice) notFound();

  return (
    <InvoiceViewer
      invoice={{
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        status: invoice.status,
        paymentMode: invoice.paymentMode,
        grandTotal: invoice.grandTotal,
        paid: invoice.paid,
        balance: invoice.balance,
        credited: invoice.credited,
        creditNotes: invoice.creditNotes,
        customer: { name: invoice.customer.name, mobile: invoice.customer.mobile, email: invoice.customer.email },
        companyName: invoice.company.name,
        payments: invoice.payments.map((p) => ({
          id: p.id, amount: p.amount, date: p.date, mode: p.mode, reference: p.reference, note: p.note,
        })),
      }}
    />
  );
}
