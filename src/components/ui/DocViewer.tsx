"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, MessageCircle, Printer, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { outlineBtn } from "@/components/ui/PageHeader";
import type { ActionResult } from "@/lib/validation";

interface Props {
  backHref: string;
  title: string;
  pdfUrl: string;
  /** Rows for the summary card beside the preview. */
  summary: { label: string; value: string; strong?: boolean }[];
  badge?: { text: string; className: string };
  /** Text pre-filled in a WhatsApp message, with the customer's mobile. Leave out to hide the button. */
  whatsapp?: { mobile: string; message: string };
  /** Extra buttons (links) shown with the standard ones. */
  children?: React.ReactNode;
  /** Extra cards under the summary. */
  side?: React.ReactNode;
  /** Present only for people allowed to delete. */
  remove?: { label: string; message: React.ReactNode; action: () => Promise<ActionResult>; afterHref: string };
}

function whatsappNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? "91" + digits : digits;
}

export default function DocViewer({ backHref, title, pdfUrl, summary, badge, whatsapp, children, side, remove }: Props) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [confirming, setConfirming] = useState(false);

  const print = () => {
    try {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
    } catch {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          Back
        </Link>
        <div className="flex flex-wrap gap-2">
          {children}
          <button onClick={print} className={outlineBtn}>
            <Printer className="h-5 w-5" />
            Print
          </button>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsappNumber(whatsapp.mobile)}?text=${encodeURIComponent(whatsapp.message)}`}
              target="_blank"
              rel="noreferrer"
              className={outlineBtn}
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          )}
          <a href={pdfUrl} target="_blank" rel="noreferrer" className={outlineBtn}>
            <ExternalLink className="h-5 w-5" />
            Open
          </a>
          <a href={`${pdfUrl}?download=1`} className={outlineBtn}>
            <Download className="h-5 w-5" />
            Download
          </a>
          {remove && (
            <button
              onClick={() => setConfirming(true)}
              className="flex h-11 items-center gap-2 rounded-lg border border-red-500/40 px-4 text-base font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="h-5 w-5" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,860px)_1fr]">
        <iframe
          ref={frame}
          title={title}
          src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
          className="block h-[70vh] min-h-[420px] sm:h-[calc(100vh-190px)] sm:min-h-[600px] w-full rounded-lg border border-border bg-white shadow-lg"
        />
        <aside className="space-y-4 xl:max-w-[420px]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              {badge && <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${badge.className}`}>{badge.text}</span>}
            </div>
            <dl className="mt-4 space-y-2 text-base">
              {summary.map((r) => (
                <div key={r.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className={`text-right ${r.strong ? "font-semibold" : ""}`}>{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {side}
        </aside>
      </div>

      {remove && (
        <ConfirmDialog
          open={confirming}
          title={remove.label}
          message={remove.message}
          onConfirm={async () => {
            const res = await remove.action();
            if (res.ok) router.push(remove.afterHref);
            return res;
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
