import { redirect } from "next/navigation";

// Print orders and printing presses are now one page, /printing.
export default function PrintOrdersRedirect() {
  redirect("/printing");
}
