import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import PageHeader from "@/components/ui/PageHeader";
import { nextNumber } from "@/db/numbering";
import { listCustomers, listProducts } from "@/db/queries";
import { quotations } from "@/db/schema";
import { today } from "@/lib/date";

export const metadata = { title: "New Quotation · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const [products, allCustomers, number] = await Promise.all([
    listProducts(),
    listCustomers(),
    nextNumber(quotations, quotations.number, "QT-"),
  ]);
  const customers = allCustomers.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <Link href="/quotations" className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Sales" title="New Quotation" />
      <InvoiceForm
        kind="quotation"
        number={number}
        initial={{
          customerId: customers.some((c) => String(c.id) === customer) ? String(customer) : "",
          date: today(),
          paymentMode: "cash",
          paidAmount: "",
          validUntil: "",
          notes: "",
          items: [{ productId: "", quantity: "1", rate: "", discountPercent: "0", gstPercent: "0" }],
        }}
        customers={customers}
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, gst: p.gst, stock: p.stock, active: p.status === "active" }))}
        heldQty={{}}
      />
    </div>
  );
}
