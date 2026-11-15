export const MOVEMENT_LABEL: Record<string, string> = {
  sale: "Sale",
  sale_edit: "Invoice edited",
  sale_void: "Invoice deleted",
  purchase: "Stock added",
  adjustment: "Adjustment",
  print_receipt: "Printed copies received",
  return: "Return",
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
