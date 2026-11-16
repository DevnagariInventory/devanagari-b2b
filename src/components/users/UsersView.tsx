"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { iconBtn, primaryBtn } from "@/components/ui/PageHeader";
import { createUser, resetPassword, updateUser } from "@/app/users/actions";
import {
  parseEditUser, parseNewUser, parseResetPassword,
  type EditUserRaw, type NewUserRaw, type ResetPasswordRaw,
} from "@/lib/validation-users";

export interface UserRow {
  id: number;
  name: string;
  username: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  lastLoginAt: string;
}

type Dialog = { kind: "add" } | { kind: "edit"; row: UserRow } | { kind: "reset"; row: UserRow } | null;

const roleOptions = [
  { value: "staff", label: "Staff: billing, stock, customers" },
  { value: "admin", label: "Admin: everything" },
];

const addFields: FieldDef<keyof NewUserRaw>[] = [
  { key: "name", label: "Name *" },
  { key: "username", label: "Username *", placeholder: "e.g. rahul" },
  { key: "email", label: "Email address", placeholder: "name@example.com", full: true },
  { key: "role", label: "Role *", type: "select", options: roleOptions },
  { key: "password", label: "Password * (8+ characters)", type: "password" },
];
const editFields: FieldDef<keyof EditUserRaw>[] = [
  { key: "name", label: "Name *" },
  { key: "email", label: "Email address", placeholder: "name@example.com" },
  { key: "role", label: "Role *", type: "select", options: roleOptions },
  {
    key: "active", label: "Account", type: "select",
    options: [{ value: "yes", label: "Active: can sign in" }, { value: "no", label: "Switched off: cannot sign in" }],
  },
];
const resetFields: FieldDef<keyof ResetPasswordRaw>[] = [
  { key: "password", label: "New password * (8+ characters)", type: "password", full: true },
];

export default function UsersView({ users, meId }: { users: UserRow[]; meId: number }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const done = () => {
    close();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Users">
        <button onClick={() => setDialog({ kind: "add" })} className={primaryBtn}>
          <Plus className="h-5 w-5" />
          Add User
        </button>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-4 px-1 text-base text-muted-foreground">
          Admins can do everything. Staff can bill, take payments, manage customers, books and stock, but cannot delete
          records or see expenses, royalty, printing, reports, analytics, audit logs, settings or users.
        </p>
        <div className="overflow-x-auto">
          <table className="rtable w-full min-w-[760px] text-left text-base">
            <thead>
              <tr className="bg-muted text-sm uppercase tracking-wider text-muted-foreground">
                {["Name", "Username", "Email", "Role", "Status", "Last sign-in"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium first:rounded-l-lg">{h}</th>
                ))}
                <th className="rounded-r-lg px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-4 font-semibold">
                    {u.name}
                    {u.id === meId && <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>}
                  </td>
                  <td className="px-4 py-4">{u.username}</td>
                  <td className="px-4 py-4">{u.email || <span className="text-muted-foreground">-</span>}</td>
                  <td className="px-4 py-4 capitalize">{u.role}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        u.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.active ? "Active" : "Switched off"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{u.lastLoginAt || "Never"}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDialog({ kind: "edit", row: u })} aria-label={`Edit ${u.name}`} className={iconBtn}>
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button onClick={() => setDialog({ kind: "reset", row: u })} aria-label={`Reset password for ${u.name}`} className={iconBtn}>
                        <KeyRound className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={dialog?.kind === "add"} title="Add User" onClose={close}>
        {dialog?.kind === "add" && (
          <DataForm<NewUserRaw>
            fields={addFields}
            initial={{ name: "", username: "", email: "", role: "staff", password: "" }}
            parse={parseNewUser}
            submitLabel="Add User"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await createUser(raw);
              if (res.ok) done();
              return res;
            }}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === "edit"} title="Edit User" onClose={close}>
        {dialog?.kind === "edit" && (
          <DataForm<EditUserRaw>
            fields={editFields}
            initial={{ name: dialog.row.name, email: dialog.row.email, role: dialog.row.role, active: dialog.row.active ? "yes" : "no" }}
            parse={parseEditUser}
            submitLabel="Save Changes"
            onCancel={close}
            onSubmit={async (raw) => {
              const res = await updateUser(dialog.row.id, raw);
              if (res.ok) done();
              return res;
            }}
          />
        )}
      </Modal>

      <Modal open={dialog?.kind === "reset"} title={dialog?.kind === "reset" ? `New password for ${dialog.row.name}` : ""} onClose={close}>
        {dialog?.kind === "reset" && (
          <DataForm<ResetPasswordRaw>
            fields={resetFields}
            initial={{ password: "" }}
            parse={parseResetPassword}
            submitLabel="Set Password"
            onCancel={close}
            footerNote={<p className="text-sm text-muted-foreground">They will be signed out everywhere and must use the new password.</p>}
            onSubmit={async (raw) => {
              const res = await resetPassword(dialog.row.id, raw);
              if (res.ok) done();
              return res;
            }}
          />
        )}
      </Modal>
    </div>
  );
}
