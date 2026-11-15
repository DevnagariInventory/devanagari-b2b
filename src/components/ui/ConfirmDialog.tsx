"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "./Modal";
import { FORM_ERROR, type ActionResult } from "@/lib/validation";

interface Props {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** Runs the delete. On `ok` the dialog closes; otherwise the error is shown in the dialog. */
  onConfirm: () => Promise<ActionResult>;
  onClose: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await onConfirm();
      if (res.ok) onClose();
      else setError(res.errors[FORM_ERROR] ?? "Something went wrong. Please try again.");
    });
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-base text-muted-foreground">{message}</p>
      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="h-11 rounded-lg border border-border px-5 text-base font-medium hover:bg-muted">
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={pending}
          className="h-11 rounded-lg bg-red-600 px-5 text-base font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
