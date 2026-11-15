"use client";

import { useId, useState, useTransition } from "react";
import { Field, FormFooter, formErrorOf, inputCls, type SubmitFn } from "./Field";
import type { FieldErrors } from "@/lib/validation";

export interface FieldDef<K extends string = string> {
  key: K;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "password";
  options?: { value: string; label: string }[];
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text" | "tel" | "email";
  /** Spans both columns. */
  full?: boolean;
  /** Suggestions shown while typing (the user can still type anything). */
  suggestions?: readonly string[];
  readOnly?: boolean;
  maxLength?: number;
  rows?: number;
}

/** Any object whose values are all strings (interfaces included). */
type StringRecord<Raw> = { [K in keyof Raw]: string };

interface Props<Raw extends StringRecord<Raw>> {
  fields: FieldDef<Extract<keyof Raw, string>>[];
  initial: Raw;
  parse: (raw: Raw) => { errors: FieldErrors };
  onSubmit: SubmitFn<Raw>;
  submitLabel: string;
  onCancel: () => void;
  /** For inline (non-modal) forms that have nothing to cancel. */
  hideCancel?: boolean;
  /** Extra content between the fields and the buttons. */
  footerNote?: React.ReactNode;
}

/** A form described by data: validates with the shared parser, then calls the server action. */
export default function DataForm<Raw extends StringRecord<Raw>>({
  fields, initial, parse, onSubmit, submitLabel, onCancel, hideCancel, footerNote,
}: Props<Raw>) {
  const [v, setV] = useState<Raw>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const listId = useId();

  const set = (key: string, value: string) => setV((cur) => ({ ...cur, [key]: value }) as Raw);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: local } = parse(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = await onSubmit(v);
      if (!res.ok) setErrors(res.errors);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f, i) => {
          const err = errors[f.key];
          const common = {
            value: v[f.key] ?? "",
            onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) =>
              set(f.key, e.target.value),
            readOnly: f.readOnly,
            placeholder: f.placeholder,
          };
          return (
            <div key={f.key} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Field label={f.label} error={err}>
                {f.type === "select" ? (
                  <select
                    value={common.value}
                    onChange={common.onChange}
                    className={inputCls(err)}
                    disabled={f.readOnly}
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    {...common}
                    rows={f.rows ?? 3}
                    maxLength={f.maxLength}
                    className={inputCls(err).replace("h-11", "py-2")}
                  />
                ) : (
                  <>
                    <input
                      {...common}
                      type={f.type === "date" ? "date" : f.type === "password" ? "password" : "text"}
                      autoComplete={f.type === "password" ? "new-password" : undefined}
                      inputMode={f.inputMode}
                      maxLength={f.maxLength}
                      autoFocus={i === 0}
                      list={f.suggestions ? `${listId}-${f.key}` : undefined}
                      className={inputCls(err) + (f.readOnly ? " bg-muted text-muted-foreground" : "")}
                    />
                    {f.suggestions && (
                      <datalist id={`${listId}-${f.key}`}>
                        {f.suggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
              </Field>
            </div>
          );
        })}
      </div>
      {footerNote}
      <FormFooter
        submitLabel={submitLabel}
        pending={pending}
        formError={formErrorOf(errors)}
        onCancel={onCancel}
        hideCancel={hideCancel}
      />
    </form>
  );
}
