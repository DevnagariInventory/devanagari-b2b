import { redirect } from "next/navigation";

export default function PrintingPressRedirect() {
  redirect("/printing?tab=presses");
}
