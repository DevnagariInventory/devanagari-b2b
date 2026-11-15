"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Pencil, XCircle } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { outlineBtn, primaryBtn } from "@/components/ui/PageHeader";
import { cancelQuotation, convertQuotation } from "@/app/quotations/actions";

export default function QuotationActions({ id, number, open, invoiceId }: { id: number; number: string; open: boolean; invoiceId: number | null }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"convert" | "cancel" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      {invoiceId !== null && (
        <Link href={`/invoices/${invoiceId}`} className={primaryBtn}>
          <FileText className="h-5 w-5" />
          View invoice
        </Link>
      )}
      {open && (
        <>
          <button onClick={() => setDialog("convert")} className={primaryBtn}>
            <FileText className="h-5 w-5" />
            Convert to Invoice
          </button>
          <Link href={`/quotations/${id}/edit`} className={outlineBtn}>
            <Pencil className="h-5 w-5" />
            Edit
          </Link>
          <button onClick={() => setDialog("cancel")} className={outlineBtn}>
            <XCircle className="h-5 w-5" />
            Cancel quote
          </button>
        </>
      )}

      <ConfirmDialog
        open={dialog === "convert"}
        title="Convert to Invoice"
        confirmLabel="Create invoice"
        message={`Create an invoice from ${number} using today's date? The books are taken from stock now.`}
        onConfirm={async () => {
          const res = await convertQuotation(id);
          if (res.ok) router.push(`/invoices/${res.id}`);
          return res;
        }}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        title="Cancel Quotation"
        confirmLabel="Cancel quotation"
        message={`Mark ${number} as cancelled? It stays on record but can no longer be converted.`}
        onConfirm={async () => {
          const res = await cancelQuotation(id);
          if (res.ok) router.refresh();
          return res;
        }}
        onClose={close}
      />
    </>
  );
}
