import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { getInvoiceForEdit } from "@/db/invoices";
import { listCustomers, listProducts } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const invoice = Number.isInteger(invoiceId) ? await getInvoiceForEdit(invoiceId) : null;
  if (!invoice) notFound();
  const [allCustomers, allProducts] = await Promise.all([listCustomers(), listProducts()]);

  const heldQty: Record<number, number> = {};
  for (const it of invoice.items) heldQty[it.productId] = (heldQty[it.productId] ?? 0) + it.quantity;

  return (
    <div className="space-y-6">
      <Link
        href={`/invoices/${invoiceId}`}
        className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">Sales</p>
        <h1 className="mt-1 text-3xl font-semibold">Edit Invoice {invoice.number}</h1>
      </div>

      <InvoiceForm
        invoiceId={invoiceId}
        number={invoice.number}
        initial={{
          customerId: String(invoice.customerId),
          date: invoice.date,
          paymentMode: invoice.paymentMode,
          paidAmount: String(invoice.paidAmount),
          items: invoice.items.map((it) => ({
            productId: String(it.productId),
            quantity: String(it.quantity),
            rate: String(it.rate),
            discountPercent: String(it.discountPercent),
            gstPercent: String(it.gstPercent),
          })),
        }}
        customers={allCustomers
          .map(({ id, name }) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))}
        products={allProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          gst: p.gst,
          stock: p.stock,
          active: p.status === "active",
        }))}
        heldQty={heldQty}
      />
    </div>
  );
}
