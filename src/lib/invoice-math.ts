// Invoice arithmetic. Pure, so the edit form (live totals) and the server (the real totals) always agree.

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface LineInput {
  quantity: number;
  rate: number; // list price per unit
  discountPercent: number;
  gstPercent: number;
}

export function computeLine(l: LineInput) {
  const unitPrice = round2(l.rate * (1 - l.discountPercent / 100)); // rate after discount
  const amount = round2(l.quantity * unitPrice); // before GST
  const gst = round2((amount * l.gstPercent) / 100);
  return { unitPrice, amount, gst };
}

export function computeTotals(lines: LineInput[]) {
  let subtotal = 0;
  let gst = 0;
  for (const l of lines) {
    const c = computeLine(l);
    subtotal += c.amount;
    gst += c.gst;
  }
  subtotal = round2(subtotal);
  gst = round2(gst);
  return { subtotal, gst, grandTotal: round2(subtotal + gst) };
}
