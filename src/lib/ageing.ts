// Safe for browser code (no database imports): the age bands used on the Receivables page.
export const AGE_BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "Over 90 days"] as const;
export const bucketOf = (age: number) => (age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3);
