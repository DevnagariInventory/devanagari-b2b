"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import PrintingTabs from "./PrintingTabs";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtn, iconBtnDanger, primaryBtn, searchCls } from "@/components/ui/PageHeader";
import { createPress, deletePress, updatePress } from "@/app/printing-press/actions";
import type { PressRow } from "@/db/printing";
import { formatINR } from "@/lib/format";
import { parsePress, type PressRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof PressRaw>[] = [
  { key: "name", label: "Press name *", full: true, placeholder: "e.g. Sharma Offset Printers" },
  { key: "contactPerson", label: "Contact person" },
  { key: "mobile", label: "Mobile", inputMode: "tel" },
  { key: "email", label: "Email", inputMode: "email" },
  { key: "gstin", label: "GSTIN", maxLength: 15 },
  { key: "address", label: "Address", type: "textarea" },
];

type Dialog = { kind: "add" } | { kind: "edit"; row: PressRow } | { kind: "delete"; row: PressRow } | null;

const toRaw = (p: PressRow): PressRaw => ({
  name: p.name, contactPerson: p.contactPerson, mobile: p.mobile, email: p.email, address: p.address, gstin: p.gstin,
});

export default function PressesView({ presses }: { presses: PressRow[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const q = query.trim().toLowerCase();
  const shown = presses.filter(
    (p) => !q || [p.name, p.contactPerson, p.mobile, p.email].some((v) => v.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Production" title="Printing">
        <button onClick={() => setDialog({ kind: "add" })} className={primaryBtn}>
          <Plus className="h-5 w-5" />
          Add Press
        </button>
      </PageHeader>
      <PrintingTabs active="presses" />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative mb-4 max-w-[440px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, contact, mobile..." className={searchCls} />
        </div>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[820px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Press", "Contact", "Mobile", "GSTIN", "Orders", "Spent"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{p.name}</div>
                    {p.address && <div className="max-w-[320px] truncate text-sm text-muted-foreground">{p.address}</div>}
                  </td>
                  <td className="px-4 py-3">{p.contactPerson || "—"}</td>
                  <td className="px-4 py-3">{p.mobile || "—"}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.gstin || "—"}</td>
                  <td className="px-4 py-3">{p.orderCount}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR(p.spent)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDialog({ kind: "edit", row: p })} aria-label={"Edit " + p.name} className={iconBtn}>
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button onClick={() => setDialog({ kind: "delete", row: p })} aria-label={"Delete " + p.name} className={iconBtnDanger}>
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {presses.length === 0 ? "No printing presses yet. Add the press you print with." : "No presses match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="Add Printing Press" onClose={close} wide>
        <DataForm<PressRaw>
          fields={fields}
          initial={{ name: "", contactPerson: "", mobile: "", email: "", address: "", gstin: "" }}
          parse={parsePress}
          submitLabel="Add Press"
          onCancel={close}
          onSubmit={async (raw) => {
            const res = await createPress(raw);
            if (res.ok) close();
            return res;
          }}
        />
      </Modal>

      <Modal open={dialog?.kind === "edit"} title="Edit Printing Press" onClose={close} wide>
        {dialog?.kind === "edit" && (
          <DataForm<PressRaw>
            key={dialog.row.id}
            fields={fields}
            initial={toRaw(dialog.row)}
            parse={parsePress}
            submitLabel="Save Changes"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updatePress(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Printing Press"
        message={
          dialog?.kind === "delete" ? (
            <>Are you sure you want to delete <span className="font-semibold text-foreground">{dialog.row.name}</span>? This cannot be undone.</>
          ) : null
        }
        onConfirm={() => (dialog?.kind === "delete" ? deletePress(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
