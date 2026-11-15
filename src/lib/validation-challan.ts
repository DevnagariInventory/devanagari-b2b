import type { FieldErrors } from "./validation";

export interface ChallanRaw {
  date: string;
  transporter: string;
  vehicleNo: string;
  lrNumber: string;
  packages: string;
  destination: string;
  notes: string;
}

export const CHALLAN_KEYS = ["date", "transporter", "vehicleNo", "lrNumber", "packages", "destination", "notes"] as const;

export function parseChallan(raw: ChallanRaw) {
  const errors: FieldErrors = {};
  const date = raw.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = "Enter a valid date";
  const packages = raw.packages.trim() === "" ? 0 : Number(raw.packages);
  if (!Number.isInteger(packages) || packages < 0 || packages > 100000) errors.packages = "Enter a whole number";
  const limit = (key: keyof ChallanRaw, max: number) => {
    if (raw[key].trim().length > max) errors[key] = `Keep it under ${max} characters`;
  };
  limit("transporter", 100);
  limit("vehicleNo", 30);
  limit("lrNumber", 50);
  limit("destination", 150);
  limit("notes", 300);
  return {
    errors,
    value: {
      date,
      transporter: raw.transporter.trim(),
      vehicleNo: raw.vehicleNo.trim().toUpperCase(),
      lrNumber: raw.lrNumber.trim(),
      packages,
      destination: raw.destination.trim(),
      notes: raw.notes.trim(),
    },
  };
}
