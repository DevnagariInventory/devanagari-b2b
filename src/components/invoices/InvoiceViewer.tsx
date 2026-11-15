"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, Download, ExternalLink, IndianRupee, Mail, MessageCircle, Pencil, Printer, Receipt, Trash2, Truck, Undo2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import { outlineBtn, primaryBtn } from "@/components/ui/PageHeader";
import { deleteInvoice } from "@/app/invoices/actions";
import { addPayment, deletePayment } from "@/app/payments/actions";
import { today, formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { PAYMENT_MODES } from "@/lib/validation";
import { parsePayment, type PaymentRaw } from "@/lib/validation-ops";

export interface ViewerInvoice {
  id: number;
  number: string;
  date: string;
  status: "paid" | "partial" | "pending";
  paymentMode: string;
  grandTotal: number;
  paid: number;
  balance: number;
  credited: number;
  creditNotes: { id: number; number: string; date: string; total: number }[];
  customer: { name: string; mobile: string; email: string };
  companyName: string;
  payments: { id: number; amount: number; date: string; mode: string; reference: string; note: string }[];
}

type Dialog = { kind: "pay" } | { kind: "delete" } | { kind: "deletePayment"; id: number; amount: number } | null;

const STATUS_STYLE = {
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  partial: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
} as const;

const modeOptions = PAYMENT_MODES.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }));

const payFields: FieldDef<keyof PaymentRaw>[] = [
  { key: "amount", label: "Amount (₹) *", inputMode: "decimal" },
  { key: "date", label: "Date *", type: "date" },
  { key: "mode", label: "Payment mode *", type: "select", options: modeOptions },
  { key: "reference", label: "Reference / UTR / cheque no.", placeholder: "Optional" },
  { key: "note", label: "Note", full: true, placeholder: "Optional" },
];

/** "9876543210" or "09876543210" -> "919876543210" for wa.me links. */
function whatsappNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? "91" + digits : digits;
}

export default function InvoiceViewer({ invoice: inv }: { invoice: ViewerInvoice }) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const pdfUrl = `/invoices/${inv.id}/pdf`;
  const message =
    `Hello ${inv.customer.name},\n` +
    `Invoice ${inv.number} dated ${formatDate(inv.date)} from ${inv.companyName}.\n` +
    `Total: ${formatINR(inv.grandTotal - inv.credited)}  Paid: ${formatINR(inv.paid)}  Balance: ${formatINR(inv.balance)}\n` +
    `Thank you for your business.`;
  const whatsappHref = `https://wa.me/${whatsappNumber(inv.customer.mobile)}?text=${encodeURIComponent(message)}`;
  const mailHref =
    `mailto:${inv.customer.email}?subject=${encodeURIComponent(`Invoice ${inv.number} from ${inv.companyName}`)}` +
    `&body=${encodeURIComponent(message)}`;

  const print = () => {
    try {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
    } catch {
      window.open(pdfUrl, "_blank"); // some browsers block printing a PDF inside a frame
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          Back
        </Link>
        <div className="flex flex-wrap gap-2">
          {inv.balance > 0 && (
            <button onClick={() => setDialog({ kind: "pay" })} className={primaryBtn}>
              <IndianRupee className="h-5 w-5" />
              Add Payment
            </button>
          )}
          <Link href={`/invoices/${inv.id}/edit`} className={outlineBtn}>
            <Pencil className="h-5 w-5" />
            Edit
          </Link>
          <button onClick={print} className={outlineBtn}>
            <Printer className="h-5 w-5" />
            Print
          </button>
          <a href={`/invoices/${inv.id}/thermal`} target="_blank" rel="noreferrer" className={outlineBtn}>
            <Receipt className="h-5 w-5" />
            Thermal
          </a>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className={outlineBtn}>
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
          <a href={mailHref} className={outlineBtn}>
            <Mail className="h-5 w-5" />
            Email
          </a>
          <Link href={`/credit-notes/new?invoice=${inv.id}`} className={outlineBtn}>
            <Undo2 className="h-5 w-5" />
            Return / Credit note
          </Link>
          <Link href={`/challans/new?invoice=${inv.id}`} className={outlineBtn}>
            <Truck className="h-5 w-5" />
            Delivery challan
          </Link>
          <Link href={`/invoices/new?from=${inv.id}`} className={outlineBtn}>
            <Copy className="h-5 w-5" />
            Duplicate
          </Link>
          <a href={pdfUrl} target="_blank" rel="noreferrer" className={outlineBtn}>
            <ExternalLink className="h-5 w-5" />
            Open
          </a>
          <a href={`${pdfUrl}?download=1`} className={outlineBtn}>
            <Download className="h-5 w-5" />
            Download
          </a>
          <button
            onClick={() => setDialog({ kind: "delete" })}
            className="flex h-11 items-center gap-2 rounded-lg border border-red-500/40 px-4 text-base font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 className="h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,860px)_1fr]">
        {/* The preview is the real PDF, so what you see here is exactly what gets downloaded or printed. */}
        <iframe
          ref={frame}
          title={`Invoice ${inv.number}`}
          src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
          className="block h-[calc(100vh-190px)] min-h-[600px] w-full rounded-lg border border-border bg-white shadow-lg"
        />

        <aside className="space-y-4 xl:max-w-[420px]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{inv.number}</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLE[inv.status]}`}>
                {inv.status}
              </span>
            </div>
            <p className="mt-1 text-base text-muted-foreground">{inv.customer.name}</p>
            <dl className="mt-4 space-y-2 text-base">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-semibold">{formatINR(inv.grandTotal)}</dd>
              </div>
              {inv.credited > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Returned (credit notes)</dt>
                  <dd>-{formatINR(inv.credited)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Received</dt>
                <dd>{formatINR(inv.paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Balance due</dt>
                <dd className={`font-semibold ${inv.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatINR(inv.balance)}
                </dd>
              </div>
            </dl>
          </div>

          {inv.creditNotes.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Credit notes</h2>
              <ul className="mt-3 divide-y divide-border">
                {inv.creditNotes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/credit-notes/${c.id}`} className="font-semibold hover:text-primary">
                      {c.number}
                    </Link>
                    <span className="text-sm text-muted-foreground">{formatDate(c.date)}</span>
                    <span className="font-semibold">{formatINR(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Payments</h2>
            {inv.payments.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{formatINR(p.amount)}</div>
                      <div className="text-sm capitalize text-muted-foreground">
                        {formatDate(p.date)} · {p.mode}
                        {p.reference && ` · ${p.reference}`}
                      </div>
                      {p.note && <div className="text-sm text-muted-foreground">{p.note}</div>}
                    </div>
                    <button
                      onClick={() => setDialog({ kind: "deletePayment", id: p.id, amount: p.amount })}
                      aria-label={`Remove payment of ${formatINR(p.amount)}`}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Modal open={dialog?.kind === "pay"} title={`Add Payment · ${inv.number}`} onClose={close}>
        {dialog?.kind === "pay" && (
          <DataForm<PaymentRaw>
            fields={payFields}
            initial={{
              amount: String(inv.balance),
              date: today(),
              mode: inv.paymentMode,
              reference: "",
              note: "",
            }}
            parse={parsePayment}
            submitLabel="Record Payment"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await addPayment(inv.id, raw);
              if (res.ok) {
                close();
                router.refresh();
              }
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Invoice"
        message={
          <>
            Delete <span className="font-semibold text-foreground">{inv.number}</span>? Its payments are removed and the
            books are returned to stock. This cannot be undone. (Invoices with credit notes cannot be deleted.)
          </>
        }
        onConfirm={async () => {
          const res = await deleteInvoice(inv.id);
          if (res.ok) router.push("/invoices");
          return res;
        }}
        onClose={close}
      />

      <ConfirmDialog
        open={dialog?.kind === "deletePayment"}
        title="Remove Payment"
        confirmLabel="Remove"
        message={
          dialog?.kind === "deletePayment" ? (
            <>
              Remove the payment of <span className="font-semibold text-foreground">{formatINR(dialog.amount)}</span>?
              The balance due goes back up.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (dialog?.kind !== "deletePayment") return { ok: true as const };
          const res = await deletePayment(dialog.id);
          if (res.ok) router.refresh();
          return res;
        }}
        onClose={close}
      />
    </div>
  );
}
