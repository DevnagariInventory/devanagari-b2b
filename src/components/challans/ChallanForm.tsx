"use client";

import { useRouter } from "next/navigation";
import DataForm, { type FieldDef } from "@/components/ui/DataForm";
import { createChallan } from "@/app/challans/actions";
import { parseChallan, type ChallanRaw } from "@/lib/validation-challan";

const fields: FieldDef<keyof ChallanRaw>[] = [
  { key: "date", label: "Dispatch date *", type: "date" },
  { key: "packages", label: "Number of packages / bundles", inputMode: "numeric" },
  { key: "transporter", label: "Transporter / courier" },
  { key: "vehicleNo", label: "Vehicle number" },
  { key: "lrNumber", label: "LR / docket number" },
  { key: "destination", label: "Destination" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export default function ChallanForm(props: {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  today: string;
  destination: string;
}) {
  const router = useRouter();
  return (
    <div className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">
        For {props.invoiceNumber} <span className="font-normal text-muted-foreground">· {props.customerName}</span>
      </h2>
      <DataForm<ChallanRaw>
        fields={fields}
        initial={{ date: props.today, transporter: "", vehicleNo: "", lrNumber: "", packages: "", destination: props.destination, notes: "" }}
        parse={parseChallan}
        submitLabel="Create Challan"
        onCancel={() => router.push(`/invoices/${props.invoiceId}`)}
        onSubmit={async (raw) => {
          const res = await createChallan(props.invoiceId, raw);
          if (res.ok) {
            router.push(`/challans/${res.id}`);
            router.refresh();
          }
          return res;
        }}
      />
    </div>
  );
}
