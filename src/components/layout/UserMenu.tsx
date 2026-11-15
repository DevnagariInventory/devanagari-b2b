"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, UserCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import { logout } from "@/app/login/actions";
import { changeOwnPassword } from "@/app/users/actions";
import { parseChangePassword, type ChangePasswordRaw } from "@/lib/validation-users";

const fields: FieldDef<keyof ChangePasswordRaw>[] = [
  { key: "current", label: "Current password *", type: "password", full: true },
  { key: "password", label: "New password * (8+ characters)", type: "password", full: true },
  { key: "confirm", label: "Repeat new password *", type: "password", full: true },
];

export default function UserMenu({ name, role }: { name: string; role: "admin" | "staff" }) {
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const signOut = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-base hover:bg-muted"
      >
        <UserCircle className="h-6 w-6 text-muted-foreground" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[140px] truncate font-medium">{name}</span>
          <span className="block text-xs capitalize text-muted-foreground">{role}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[48px] z-20 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setChanging(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base hover:bg-muted"
          >
            <KeyRound className="h-[18px] w-[18px]" />
            Change password
          </button>
          <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base hover:bg-muted">
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      )}

      <Modal open={changing} title="Change password" onClose={() => setChanging(false)}>
        {changing && (
          <DataForm<ChangePasswordRaw>
            fields={fields}
            initial={{ current: "", password: "", confirm: "" }}
            parse={parseChangePassword}
            submitLabel="Change password"
            onCancel={() => setChanging(false)}
            footerNote={<p className="text-sm text-muted-foreground">You will be asked to sign in again with the new password.</p>}
            onSubmit={async (raw) => {
              const res = await changeOwnPassword(raw);
              if (res.ok) {
                await logout();
                window.location.href = "/login";
              }
              return res;
            }}
          />
        )}
      </Modal>
    </div>
  );
}
