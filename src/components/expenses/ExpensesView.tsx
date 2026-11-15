"use client";

import { useMemo, useState } from "react";
import { CalendarDays, IndianRupee, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtn, iconBtnDanger, primaryBtn, searchCls, selectCls } from "@/components/ui/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { createExpense, deleteExpense, updateExpense } from "@/app/expenses/actions";
import type { Expense } from "@/db/schema";
import { formatDate, monthStart, today } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { EXPENSE_CATEGORIES, parseExpense, type ExpenseRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof ExpenseRaw>[] = [
  { key: "description", label: "Description *", full: true, placeholder: "e.g. Printing cost for Nibandh Sanhita" },
  { key: "amount", label: "Amount (₹) *", inputMode: "decimal" },
  { key: "date", label: "Date *", type: "date" },
  { key: "category", label: "Category", suggestions: EXPENSE_CATEGORIES },
];

type Dialog = { kind: "add" } | { kind: "edit"; row: Expense } | { kind: "delete"; row: Expense } | null;

export default function ExpensesView({ expenses }: { expenses: Expense[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const categories = useMemo(() => [...new Set(expenses.map((e) => e.category))].sort(), [expenses]);

  const q = query.trim().toLowerCase();
  const shown = expenses.filter(
    (e) =>
      (!category || e.category === category) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
  );

  const total = shown.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter((e) => e.date >= monthStart() && e.date <= today()).reduce((s, e) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of shown) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Money" title="Expenses">
        <button onClick={() => setDialog({ kind: "add" })} className={primaryBtn}>
          <Plus className="h-5 w-5" />
          Add Expense
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={category || from || to || q ? "Filtered total" : "Total expenses"} value={formatINR(total)} icon={IndianRupee} tone="purple" hint={`${shown.length} entr${shown.length === 1 ? "y" : "ies"}`} />
        <StatCard label="This month" value={formatINR(thisMonth)} icon={CalendarDays} tone="blue" />
        <StatCard label="Top category" value={top ? top[0] : "—"} icon={Tag} tone="amber" hint={top ? formatINR(top[1]) : undefined} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search description..." className={searchCls} />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={selectCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="text-sm font-medium text-muted-foreground">
            From
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={selectCls + " mt-1 block text-foreground"} />
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            To
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={selectCls + " mt-1 block text-foreground"} />
          </label>
          {(from || to || category || query) && (
            <button
              onClick={() => { setFrom(""); setTo(""); setCategory(""); setQuery(""); }}
              className="h-11 px-2 text-base text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Date", "Description", "Category", "Amount"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 font-semibold">
                    {e.description}
                    {e.printOrderId !== null && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">from print order</span>}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-3 py-1 text-sm">{e.category}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatINR(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDialog({ kind: "edit", row: e })} aria-label={"Edit " + e.description} className={iconBtn}>
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button onClick={() => setDialog({ kind: "delete", row: e })} aria-label={"Delete " + e.description} className={iconBtnDanger}>
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {expenses.length === 0 ? "No expenses yet. Add your first expense." : "No expenses match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="Add Expense" onClose={close}>
        <DataForm<ExpenseRaw>
          fields={fields}
          initial={{ description: "", amount: "", date: today(), category: "General" }}
          parse={parseExpense}
          submitLabel="Add Expense"
          onCancel={close}
          onSubmit={async (raw) => {
            const res = await createExpense(raw);
            if (res.ok) close();
            return res;
          }}
        />
      </Modal>

      <Modal open={dialog?.kind === "edit"} title="Edit Expense" onClose={close}>
        {dialog?.kind === "edit" && (
          <DataForm<ExpenseRaw>
            key={dialog.row.id}
            fields={fields}
            initial={{
              description: dialog.row.description,
              amount: String(dialog.row.amount),
              date: dialog.row.date,
              category: dialog.row.category,
            }}
            parse={parseExpense}
            submitLabel="Save Changes"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updateExpense(dialog.row.id, raw);
              if (res.ok) close();
              return res;
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title="Delete Expense"
        message={
          dialog?.kind === "delete" ? (
            <>
              Delete <span className="font-semibold text-foreground">{dialog.row.description}</span> ({formatINR(dialog.row.amount)})?
              Profit figures will change. This cannot be undone.
            </>
          ) : null
        }
        onConfirm={() => (dialog?.kind === "delete" ? deleteExpense(dialog.row.id) : Promise.resolve({ ok: true as const }))}
        onClose={close}
      />
    </div>
  );
}
