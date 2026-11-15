"use client";

import { useState } from "react";
import { CheckCircle2, DatabaseBackup } from "lucide-react";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import PageHeader, { outlineBtn } from "@/components/ui/PageHeader";
import { saveCompany } from "@/app/settings/actions";
import { parseCompany, type CompanyRaw } from "@/lib/validation-ops";

const fields: FieldDef<keyof CompanyRaw>[] = [
  { key: "name", label: "Business name *", full: true },
  { key: "address", label: "Address", type: "textarea", rows: 2 },
  { key: "phone", label: "Phone", inputMode: "tel" },
  { key: "email", label: "Email", inputMode: "email" },
  { key: "gstin", label: "GSTIN", maxLength: 15 },
  { key: "upiId", label: "UPI ID (for the payment QR)", placeholder: "name@bank" },
  { key: "invoicePrefix", label: "Invoice number prefix *", maxLength: 10 },
  { key: "terms", label: "Terms & conditions (printed on invoices)", type: "textarea", rows: 3 },
];

export default function SettingsView({ initial, nextNumber }: { initial: CompanyRaw; nextNumber: string }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,720px)_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Business profile</h2>
          <p className="mt-1 text-base text-muted-foreground">
            These details are printed on every invoice. The next invoice will be numbered{" "}
            <span className="font-semibold text-foreground">{nextNumber}</span>.
          </p>
          <div className="mt-5">
            <DataForm<CompanyRaw>
              fields={fields}
              initial={initial}
              parse={parseCompany}
              submitLabel="Save Settings"
              onCancel={() => {}}
              hideCancel
              footerNote={
                saved ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Settings saved.
                  </p>
                ) : null
              }
              onSubmit={async (raw) => {
                setSaved(false);
                const res = await saveCompany(raw);
                if (res.ok) setSaved(true);
                return res;
              }}
            />
          </div>
        </section>

        <section className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Data &amp; backup</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Your data is stored online in Supabase and book photos in ImageKit. Download a copy of all your records
            (invoices, customers, books, payments and more) regularly and keep it somewhere safe. Photos stay in
            ImageKit and are not part of the file.
          </p>
          <a href="/settings/backup" className={outlineBtn + " mt-4 w-fit"}>
            <DatabaseBackup className="h-5 w-5" />
            Download backup
          </a>
        </section>
      </div>
    </div>
  );
}
