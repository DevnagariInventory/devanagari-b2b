"use client";

import { useState, useTransition } from "react";
import { Field, FormFooter, formErrorOf, inputCls, type SubmitFn } from "@/components/ui/Field";
import { parseCategory, type CategoryRaw, type FieldErrors } from "@/lib/validation";

interface Props {
  initial?: CategoryRaw;
  onSubmit: SubmitFn<CategoryRaw>;
  onCancel: () => void;
}

export default function CategoryForm({ initial, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<CategoryRaw>(initial ?? { name: "", description: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: local } = parseCategory(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = await onSubmit(v);
      if (!res.ok) setErrors(res.errors);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Name *" error={errors.name}>
        <input
          autoFocus
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="e.g. MPPSC (Mains)"
          className={inputCls(errors.name)}
        />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea
          rows={3}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          placeholder="Optional"
          className={inputCls(errors.description) + " h-auto py-2"}
        />
      </Field>
      <FormFooter
        submitLabel={initial ? "Save Changes" : "Add Category"}
        pending={pending}
        formError={formErrorOf(errors)}
        onCancel={onCancel}
      />
    </form>
  );
}
