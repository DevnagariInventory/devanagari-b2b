import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { listCustomers, listProducts } from "@/db/queries";
import { getQuotationForEdit } from "@/db/quotations";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qid = Number(id);
  const q = Number.isInteger(qid) ? await getQuotationForEdit(qid) : null;
  if (!q) notFound();
  if (q.status !== "open") redirect(`/quotations/${qid}`);
  const [allCustomers, allProducts] = await Promise.all([listCustomers(), listProducts()]);

  return (
    <div className="space-y-6">
      <Link href={`/quotations/${qid}`} className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">Sales</p>
        <h1 className="mt-1 text-3xl font-semibold">Edit Quotation {q.number}</h1>
      </div>
      <InvoiceForm
        kind="quotation"
        invoiceId={qid}
        number={q.number}
        initial={{
          customerId: String(q.customerId),
          date: q.date,
          paymentMode: "cash",
          paidAmount: "",
          validUntil: q.validUntil,
          notes: q.notes,
          items: q.items.map((it) => ({
            productId: String(it.productId),
            quantity: String(it.quantity),
            rate: String(it.rate),
            discountPercent: String(it.discountPercent),
            gstPercent: String(it.gstPercent),
          })),
        }}
        customers={allCustomers.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))}
        products={allProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, gst: p.gst, stock: p.stock, active: p.status === "active" }))}
        heldQty={{}}
      />
    </div>
  );
}
