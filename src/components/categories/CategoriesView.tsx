"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CategoryForm from "./CategoryForm";
import { createCategory, deleteCategory, updateCategory } from "@/app/categories/actions";
import type { CategoryRow } from "@/db/queries";
import { formatDate } from "@/lib/date";
import type { CategoryRaw } from "@/lib/validation";

type Dialog = { kind: "add" } | { kind: "edit"; row: CategoryRow } | { kind: "delete"; row: CategoryRow } | null;

export default function CategoriesView({ categories }: { categories: CategoryRow[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => [c.name, c.description].some((v) => v.toLowerCase().includes(q)));
  }, [categories, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">Catalog</p>
          <h1 className="mt-1 text-3xl font-semibold">Categories</h1>
        </div>
        <button
          onClick={() => setDialog({ kind: "add" })}
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative max-w-[440px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Name", "Description", "Products", "Added"].map((h) => (
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
                  <td className="px-4 py-4 font-semibold">{c.name}</td>
                  <td className="max-w-[360px] px-4 py-4 text-muted-foreground">{c.description || "-"}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{c.productCount}</span>
                  </td>
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
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {categories.length === 0 ? "No categories yet. Add your first category." : "No categories match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="Add Category" onClose={close}>
        <CategoryForm
          onCancel={close}
          onSubmit={async (raw: CategoryRaw) => {
            const res = await createCategory(raw);
            if (res.ok) close();
            return res;
          }}
        />
      </Modal>

      <Modal open={dialog?.kind === "edit"} title="Edit Category" onClose={close}>
        {dialog?.kind === "edit" && (
          <CategoryForm
            key={dialog.row.id}
            initial={{ name: dialog.row.name, description: dialog.row.description }}
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updateCategory(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Category"
        message={
          dialog?.kind === "delete" ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-foreground">{dialog.row.name}</span>?
              This cannot be undone.
            </>
          ) : null
        }
        onConfirm={() => (dialog?.kind === "delete" ? deleteCategory(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
