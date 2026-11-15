import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import PageHeader from "@/components/ui/PageHeader";
import { getInvoiceForEdit, nextInvoiceNumber } from "@/db/invoices";
import { listCustomers, listProducts } from "@/db/queries";
import { today } from "@/lib/date";
import type { InvoiceRaw } from "@/lib/validation";

export const metadata = { title: "New Invoice · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

type Search = { from?: string; product?: string; customer?: string };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { from, product, customer } = await searchParams;
  const [products, allCustomers, number] = await Promise.all([listProducts(), listCustomers(), nextInvoiceNumber()]);
  const customers = allCustomers
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const blankLine = { productId: "", quantity: "1", rate: "", discountPercent: "0", gstPercent: "0" };
  let initial: InvoiceRaw = {
    customerId: customers.some((c) => String(c.id) === customer) ? String(customer) : "",
    date: today(),
    paymentMode: "cash",
    paidAmount: "",
    items: [blankLine],
  };

  // Start from an existing invoice (Duplicate): same customer and lines, today's date, nothing paid yet.
  const source = from && Number.isInteger(Number(from)) ? await getInvoiceForEdit(Number(from)) : null;
  if (source) {
    initial = {
      customerId: String(source.customerId),
      date: today(),
      paymentMode: source.paymentMode,
      paidAmount: "",
      items: source.items.map((it) => ({
        productId: String(it.productId),
        quantity: String(it.quantity),
        rate: String(it.rate),
        discountPercent: String(it.discountPercent),
        gstPercent: String(it.gstPercent),
      })),
    };
  } else {
    // Start with one specific book (the "Create invoice" button on a product page).
    const p = products.find((x) => String(x.id) === product && x.status === "active");
    if (p) initial.items = [{ ...blankLine, productId: String(p.id), rate: String(p.price), gstPercent: String(p.gst) }];
  }

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Sales" title={source ? `Duplicate of ${source.number}` : "New Invoice"} />

      <InvoiceForm
        number={number}
        initial={initial}
        customers={customers}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          gst: p.gst,
          stock: p.stock,
          active: p.status === "active",
        }))}
        heldQty={{}}
      />
    </div>
  );
}
