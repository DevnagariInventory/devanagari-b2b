import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductEditor from "@/components/products/ProductEditor";
import PageHeader from "@/components/ui/PageHeader";
import { listAuthors, listCategories } from "@/db/queries";
import { emptyProductRaw } from "@/lib/product-form";

export const metadata = { title: "Add Product · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categoryRows, authorRows] = await Promise.all([listCategories(), listAuthors()]);
  const categories = categoryRows.map(({ id, name }) => ({ id, name }));
  const authors = authorRows.map(({ id, name }) => ({ id, name }));

  return (
    <div className="space-y-6">
      <Link href="/products" className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Catalog" title="Add Product" />
      <ProductEditor initial={emptyProductRaw(categories[0]?.id)} categories={categories} authors={authors} />
    </div>
  );
}
