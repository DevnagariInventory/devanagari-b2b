"use client";

import { useState, useTransition } from "react";
import { Field, FormFooter, formErrorOf, inputCls, type SubmitFn } from "@/components/ui/Field";
import { parseCustomer, type CustomerRaw, type FieldErrors } from "@/lib/validation";

interface Props {
  initial?: CustomerRaw;
  onSubmit: SubmitFn<CustomerRaw>;
  onCancel: () => void;
}

export default function CustomerForm({ initial, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<CustomerRaw>(initial ?? { name: "", mobile: "", email: "", city: "", gstin: "", address: "", state: "", pincode: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: local } = parseCustomer(v);
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const res = await onSubmit(v);
      if (!res.ok) setErrors(res.errors);
    });
  };

  const text = (key: keyof CustomerRaw, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
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
      {text("name", "Name *", { autoFocus: true, placeholder: "Customer or company name" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("mobile", "Mobile *", { inputMode: "numeric", placeholder: "10-digit number" })}
        {text("email", "Email", { type: "email", placeholder: "name@example.com" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("city", "City", { placeholder: "e.g. Indore" })}
        {text("gstin", "GSTIN", { placeholder: "Optional", maxLength: 15 })}
      </div>
      <Field label="Address" error={errors.address}>
        <textarea
          rows={2}
          value={v.address}
          onChange={(e) => setV({ ...v, address: e.target.value })}
          placeholder="Street, area (printed on invoices)"
          className={inputCls(errors.address) + " h-auto py-2"}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("state", "State", { placeholder: "e.g. Madhya Pradesh" })}
        {text("pincode", "Pincode", { inputMode: "numeric", maxLength: 6, placeholder: "6 digits" })}
      </div>
      <FormFooter
        submitLabel={initial ? "Save Changes" : "Add Customer"}
        pending={pending}
        formError={formErrorOf(errors)}
        onCancel={onCancel}
      />
    </form>
  );
}
