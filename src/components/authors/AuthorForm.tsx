"use client";

import { useState, useTransition } from "react";
import { Field, FormFooter, formErrorOf, inputCls, type SubmitFn } from "@/components/ui/Field";
import { parseAuthor, type AuthorRaw, type FieldErrors } from "@/lib/validation";

interface Props {
  initial?: AuthorRaw;
  onSubmit: SubmitFn<AuthorRaw>;
  onCancel: () => void;
}

export default function AuthorForm({ initial, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<AuthorRaw>(initial ?? { name: "", mobile: "", email: "", royaltyPercent: "10" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: local } = parseAuthor(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = await onSubmit(v);
      if (!res.ok) setErrors(res.errors);
    });
  };

  const text = (key: keyof AuthorRaw, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} error={errors[key]}>
      <input
        {...props}
        value={v[key]}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
        className={inputCls(errors[key])}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {text("name", "Name *", { autoFocus: true, placeholder: "Author name" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("mobile", "Mobile", { inputMode: "numeric", placeholder: "10-digit number" })}
        {text("email", "Email", { type: "email", placeholder: "name@example.com" })}
      </div>
      {text("royaltyPercent", "Royalty (% of sale) *", { inputMode: "decimal" })}
      <FormFooter
        submitLabel={initial ? "Save Changes" : "Add Author"}
        pending={pending}
        formError={formErrorOf(errors)}
        onCancel={onCancel}
      />
    </form>
  );
}
