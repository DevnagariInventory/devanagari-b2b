import type { ActionResult } from "@/lib/validation";
import { FORM_ERROR } from "@/lib/validation";

export const inputCls = (error?: string) =>
  "mt-1 h-11 w-full rounded-lg border bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 " +
  (error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
    : "border-border focus:border-primary focus:ring-primary/20");

/** Label + control + error message. The control goes inside so clicking the label focuses it. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">
        {label}
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

/** Cancel / Submit row, with an optional whole-form error above it. */
export function FormFooter({
  submitLabel,
  pending,
  formError,
  onCancel,
  hideCancel,
}: {
  submitLabel: string;
  pending: boolean;
  formError?: string;
  onCancel: () => void;
  hideCancel?: boolean;
}) {
  return (
    <div className="pt-2">
      {formError && <p className="mb-3 text-sm text-red-500">{formError}</p>}
      <div className="flex justify-end gap-3">
        {!hideCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-lg border border-border px-5 text-base font-medium hover:bg-muted"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  );
}

export type SubmitFn<Raw> = (raw: Raw) => Promise<ActionResult>;
export const formErrorOf = (errors: Record<string, string>) => errors[FORM_ERROR];
