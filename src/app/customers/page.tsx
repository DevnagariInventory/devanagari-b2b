import CustomersView from "@/components/customers/CustomersView";
import { listCustomers } from "@/db/queries";

export const metadata = { title: "Customers · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  return <CustomersView customers={await listCustomers()} />;
}
