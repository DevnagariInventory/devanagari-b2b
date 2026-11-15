import PressesView from "@/components/printing/PressesView";
import { listPresses } from "@/db/printing";

export const metadata = { title: "Printing Press · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function PrintingPressPage() {
  return <PressesView presses={await listPresses()} />;
}
