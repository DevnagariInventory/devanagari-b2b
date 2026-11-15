"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Hourglass, IndianRupee, Pencil, Plus, Printer, Search, Trash2, XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtn, iconBtnDanger, primaryBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import {
  createPrintOrder, deletePrintOrder, receivePrintOrder, setPrintOrderStatus, updatePrintOrder,
} from "@/app/print-orders/actions";
import type { PrintOrderRow } from "@/db/printing";
import { formatDate, today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { parsePrintOrder, parseReceive, type PrintOrderRaw, type ReceiveRaw } from "@/lib/validation-ops";

interface Props {
  orders: PrintOrderRow[];
  presses: { id: number; name: string }[];
  products: { id: number; name: string; sku: string }[];
}

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; row: PrintOrderRow }
  | { kind: "receive"; row: PrintOrderRow }
  | { kind: "cancel"; row: PrintOrderRow }
  | { kind: "delete"; row: PrintOrderRow }
  | null;

const STATUS_STYLE: Record<PrintOrderRow["status"], string> = {
  ordered: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  printing: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
};

const receiveFields: FieldDef<keyof ReceiveRaw>[] = [
  { key: "receivedQty", label: "Copies received *", inputMode: "numeric" },
  { key: "receivedDate", label: "Received on *", type: "date" },
];

export default function PrintOrdersView({ orders, presses, products }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const fields: FieldDef<keyof PrintOrderRaw>[] = [
    {
      key: "productId", label: "Book *", type: "select", full: true,
      options: [{ value: "", label: "Select a book" }, ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` }))],
    },
    {
      key: "pressId", label: "Printing press *", type: "select", full: true,
      options: [{ value: "", label: presses.length ? "Select a press" : "Add a printing press first" }, ...presses.map((p) => ({ value: String(p.id), label: p.name }))],
    },
    { key: "quantity", label: "Copies *", inputMode: "numeric" },
    { key: "costPerCopy", label: "Cost per copy (₹) *", inputMode: "decimal" },
    { key: "orderDate", label: "Order date *", type: "date" },
    { key: "expectedDate", label: "Expected delivery", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", rows: 2 },
  ];

  const q = query.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      (!status || o.status === status) &&
      (!q || [o.number, o.productName, o.pressName].some((v) => v.toLowerCase().includes(q)))
  );

  const open = orders.filter((o) => o.status === "ordered" || o.status === "printing");
  const stats = {
    open: open.length,
    onOrder: open.reduce((s, o) => s + o.quantity, 0),
    committed: open.reduce((s, o) => s + o.quantity * o.costPerCopy, 0),
    spent: orders.filter((o) => o.status === "received").reduce((s, o) => s + o.receivedQty * o.costPerCopy, 0),
  };

  const toRaw = (o: PrintOrderRow): PrintOrderRaw => ({
    pressId: String(o.pressId), productId: String(o.productId), quantity: String(o.quantity),
    costPerCopy: String(o.costPerCopy), orderDate: o.orderDate, expectedDate: o.expectedDate, notes: o.notes,
  });

  const small = "rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Production" title="Print Orders">
        <Link href="/printing-press" className="flex h-11 items-center rounded-lg border border-border bg-card px-4 text-base font-medium hover:bg-muted">
          Printing presses
        </Link>
        <button onClick={() => setDialog({ kind: "add" })} className={primaryBtn}>
          <Plus className="h-5 w-5" />
          New Print Order
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open orders" value={String(stats.open)} icon={ClipboardList} tone="blue" />
        <StatCard label="Copies on order" value={stats.onOrder.toLocaleString("en-IN")} icon={Hourglass} tone="amber" />
        <StatCard label="Committed cost" value={formatINR(stats.committed)} icon={IndianRupee} tone="purple" hint="open orders" />
        <StatCard label="Printing spend" value={formatINR(stats.spent)} icon={Printer} tone="green" hint="received" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, book or press..." className={searchCls} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectCls}>
            <option value="">All statuses</option>
            <option value="ordered">Ordered</option>
            <option value="printing">Printing</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Order", "Book", "Press", "Copies", "Cost", "Dates", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => {
                const live = o.status === "ordered" || o.status === "printing";
                return (
                  <tr key={o.id} className="border-b border-border last:border-0 align-top hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold">{o.number}</td>
                    <td className="px-4 py-3">
                      <Link href={`/products/${o.productId}`} className="font-medium hover:text-primary">{o.productName}</Link>
                      {o.notes && <div className="max-w-[240px] truncate text-sm text-muted-foreground">{o.notes}</div>}
                    </td>
                    <td className="px-4 py-3">{o.pressName}</td>
                    <td className="px-4 py-3">
                      {o.status === "received" ? `${o.receivedQty} / ${o.quantity}` : o.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-semibold">{formatINR((o.status === "received" ? o.receivedQty : o.quantity) * o.costPerCopy)}</div>
                      <div className="text-sm text-muted-foreground">{formatINR(o.costPerCopy)} / copy</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div>Ordered {formatDate(o.orderDate)}</div>
                      {o.status === "received" && o.receivedDate ? (
                        <div className="text-muted-foreground">Received {formatDate(o.receivedDate)}</div>
                      ) : o.expectedDate ? (
                        <div className={live && o.expectedDate < today() ? "font-medium text-red-600" : "text-muted-foreground"}>
                          Due {formatDate(o.expectedDate)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {o.status === "ordered" && (
                          <button onClick={async () => { await setPrintOrderStatus(o.id, "printing"); }} className={small}>
                            Start printing
                          </button>
                        )}
                        {live && (
                          <button onClick={() => setDialog({ kind: "receive", row: o })} className={small + " !border-emerald-500/50 text-emerald-700 dark:text-emerald-400"}>
                            <CheckCircle2 className="mr-1 inline h-4 w-4" />
                            Receive
                          </button>
                        )}
                        {live && (
                          <button onClick={() => setDialog({ kind: "edit", row: o })} aria-label={"Edit " + o.number} className={iconBtn}>
                            <Pencil className="h-[18px] w-[18px]" />
                          </button>
                        )}
                        {live && (
                          <button onClick={() => setDialog({ kind: "cancel", row: o })} aria-label={"Cancel " + o.number} className={iconBtnDanger}>
                            <XCircle className="h-[18px] w-[18px]" />
                          </button>
                        )}
                        {(o.status === "ordered" || o.status === "cancelled") && (
                          <button onClick={() => setDialog({ kind: "delete", row: o })} aria-label={"Delete " + o.number} className={iconBtnDanger}>
                            <Trash2 className="h-[18px] w-[18px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {orders.length === 0 ? "No print orders yet. Create one when you send a book to print." : "No orders match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="New Print Order" onClose={close} wide>
        <DataForm<PrintOrderRaw>
          fields={fields}
          initial={{ pressId: presses[0] ? String(presses[0].id) : "", productId: "", quantity: "", costPerCopy: "", orderDate: today(), expectedDate: "", notes: "" }}
          parse={parsePrintOrder}
          submitLabel="Create Order"
          onCancel={close}
          onSubmit={async (raw) => {
            const res = await createPrintOrder(raw);
            if (res.ok) close();
            return res;
          }}
        />
      </Modal>

      <Modal open={dialog?.kind === "edit"} title={dialog?.kind === "edit" ? `Edit ${dialog.row.number}` : ""} onClose={close} wide>
        {dialog?.kind === "edit" && (
          <DataForm<PrintOrderRaw>
            key={dialog.row.id}
            fields={fields}
            initial={toRaw(dialog.row)}
            parse={parsePrintOrder}
            submitLabel="Save Changes"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updatePrintOrder(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === "receive"} title={dialog?.kind === "receive" ? `Receive ${dialog.row.number}` : ""} onClose={close}>
        {dialog?.kind === "receive" && (
          <DataForm<ReceiveRaw>
            key={dialog.row.id}
            fields={receiveFields}
            initial={{ receivedQty: String(dialog.row.quantity), receivedDate: today() }}
            parse={parseReceive}
            submitLabel="Add to Stock"
            onCancel={close}
            footerNote={
              <p className="text-sm text-muted-foreground">
                {dialog.row.productName}: the copies are added to stock and {formatINR(dialog.row.costPerCopy)} per copy is
                recorded as a printing expense.
              </p>
            }
            onSubmit={async (raw) => {
              const res = await receivePrintOrder(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "cancel"}
        title="Cancel Print Order"
        confirmLabel="Cancel order"
        message={dialog?.kind === "cancel" ? <>Cancel <span className="font-semibold text-foreground">{dialog.row.number}</span>? Nothing is added to stock.</> : null}
        onConfirm={() => (dialog?.kind === "cancel" ? setPrintOrderStatus(dialog.row.id, "cancelled") : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Print Order"
        message={dialog?.kind === "delete" ? <>Delete <span className="font-semibold text-foreground">{dialog.row.number}</span>? This cannot be undone.</> : null}
        onConfirm={() => (dialog?.kind === "delete" ? deletePrintOrder(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
