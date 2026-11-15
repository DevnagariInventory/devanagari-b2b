"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode as BarcodeIcon, Boxes, FileText, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { outlineBtn, primaryBtn } from "@/components/ui/PageHeader";
import Barcode from "./Barcode";
import { deleteProduct } from "@/app/products/actions";
import { isValidEan13 } from "@/lib/validation";

interface Props {
  id: number;
  name: string;
  isbn: string;
  canInvoice: boolean;
}

/** Buttons under the price on a product page: invoice it, edit, restock, barcode, delete. */
export default function ProductActions({ id, name, isbn, canInvoice }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"barcode" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {canInvoice ? (
          <Link href={`/invoices/new?product=${id}`} className={primaryBtn}>
            <FileText className="h-5 w-5" />
            Create Invoice
          </Link>
        ) : (
          <span
            title="Only active books with stock can be invoiced"
            className="flex h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-muted px-5 text-base font-medium text-muted-foreground"
          >
            <FileText className="h-5 w-5" />
            Create Invoice
          </span>
        )}
        <Link href={`/products/${id}/edit`} className={outlineBtn}>
          <Pencil className="h-5 w-5" />
          Edit
        </Link>
        <Link href={`/inventory?q=${encodeURIComponent(name)}`} className={outlineBtn}>
          <Boxes className="h-5 w-5" />
          Stock
        </Link>
        <button onClick={() => setDialog("barcode")} className={outlineBtn}>
          <BarcodeIcon className="h-5 w-5" />
          Barcode
        </button>
        <button
          onClick={() => setDialog("delete")}
          className="flex h-11 items-center gap-2 rounded-lg border border-red-500/40 px-4 text-base font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
        >
          <Trash2 className="h-5 w-5" />
          Delete
        </button>
      </div>

      <Modal open={dialog === "barcode"} title="Product Barcode" onClose={close}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-semibold">{name}</p>
          {isValidEan13(isbn) ? (
            <Barcode code={isbn} />
          ) : (
            <p className="py-6 text-base text-muted-foreground">
              This product has no valid ISBN. Edit the product and add a 13-digit ISBN to generate a barcode.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete Product"
        message={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">{name}</span>? Its photos and
            stock history are removed too. This cannot be undone.
          </>
        }
        onConfirm={async () => {
          const res = await deleteProduct(id);
          if (res.ok) router.push("/products");
          return res;
        }}
        onClose={close}
      />
    </>
  );
}
