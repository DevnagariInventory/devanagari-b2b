import CategoriesView from "@/components/categories/CategoriesView";
import { listCategories } from "@/db/queries";

export const metadata = { title: "Categories · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  return <CategoriesView categories={await listCategories()} />;
}
