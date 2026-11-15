import Link from "next/link";
import { notFound } from "next/navigation";
import DocViewer from "@/components/ui/DocViewer";
import { deleteChallan } from "@/app/challans/actions";
import { getChallanDetail } from "@/db/challans";
import { getUser } from "@/lib/auth/current";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = Number(id);
  const d = Number.isInteger(cid) ? await getChallanDetail(cid) : null;
  if (!d) notFound();
  const me = await getUser();
  const { challan: c } = d;
  const copies = d.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <DocViewer
      backHref="/challans"
      title={c.number}
      pdfUrl={`/challans/${c.id}/pdf`}
      summary={[
        { label: "Customer", value: d.customer.name },
        { label: "Invoice", value: d.invoice.number },
        { label: "Date", value: formatDate(c.date) },
        { label: "Copies", value: String(copies), strong: true },
        { label: "Packages", value: c.packages ? String(c.packages) : "-" },
        { label: "Transporter", value: c.transporter || "-" },
        { label: "Vehicle", value: c.vehicleNo || "-" },
        { label: "LR number", value: c.lrNumber || "-" },
      ]}
      whatsapp={{
        mobile: d.customer.mobile,
        message:
          `Hello ${d.customer.name},\nYour books (invoice ${d.invoice.number}) were dispatched on ${formatDate(c.date)} from ${d.company.name}.` +
          `${c.transporter ? `\nTransporter: ${c.transporter}` : ""}${c.lrNumber ? `\nLR no: ${c.lrNumber}` : ""}${c.packages ? `\nPackages: ${c.packages}` : ""}`,
      }}
      remove={
        me?.role === "admin"
          ? {
              label: "Delete Challan",
              message: (
                <>
                  Delete <span className="font-semibold text-foreground">{c.number}</span>? The invoice and stock are not affected.
                </>
              ),
              action: deleteChallan.bind(null, c.id),
              afterHref: "/challans",
            }
          : undefined
      }
    >
      <Link href={`/invoices/${d.invoice.id}`} className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-base font-medium hover:bg-muted">
        View invoice
      </Link>
    </DocViewer>
  );
}
