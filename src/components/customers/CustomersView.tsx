"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CustomerForm from "./CustomerForm";
import { createCustomer, deleteCustomer, updateCustomer } from "@/app/customers/actions";
import type { Customer } from "@/db/schema";
import { formatDate } from "@/lib/date";

type Dialog = { kind: "add" } | { kind: "edit"; row: Customer } | { kind: "delete"; row: Customer } | null;

export default function CustomersView({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.mobile, c.email].some((v) => v.toLowerCase().includes(q)));
  }, [customers, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">Master</p>
          <h1 className="mt-1 text-3xl font-semibold">Customers</h1>
        </div>
        <button
          onClick={() => setDialog({ kind: "add" })}
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Add Customer
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, mobile, email..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="rtable w-full min-w-[820px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Name", "Mobile", "Email", "City", "GSTIN", "Added"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">
                    {h}
                  </th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-4 font-semibold">
                    <Link href={`/customers/${c.id}`} className="hover:text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{c.mobile}</td>
                  <td className="px-4 py-4">{c.email || "-"}</td>
                  <td className="px-4 py-4">{c.city || "-"}</td>
                  <td className="px-4 py-4">{c.gstin || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-4">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setDialog({ kind: "edit", row: c })}
                        aria-label={"Edit " + c.name}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        onClick={() => setDialog({ kind: "delete", row: c })}
                        aria-label={"Delete " + c.name}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {customers.length === 0 ? "No customers yet. Add your first customer." : "No customers match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="Add Customer" onClose={close}>
        <CustomerForm
          onCancel={close}
          onSubmit={async (raw) => {
            const res = await createCustomer(raw);
            if (res.ok) close();
            return res;
          }}
        />
      </Modal>

      <Modal open={dialog?.kind === "edit"} title="Edit Customer" onClose={close}>
        {dialog?.kind === "edit" && (
          <CustomerForm
            key={dialog.row.id}
            initial={{
              name: dialog.row.name,
              mobile: dialog.row.mobile,
              email: dialog.row.email,
              city: dialog.row.city,
              gstin: dialog.row.gstin,
              address: dialog.row.address,
              state: dialog.row.state,
              pincode: dialog.row.pincode,
            }}
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updateCustomer(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Customer"
        message={
          dialog?.kind === "delete" ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-foreground">{dialog.row.name}</span>?
              This cannot be undone.
            </>
          ) : null
        }
        onConfirm={() => (dialog?.kind === "delete" ? deleteCustomer(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
