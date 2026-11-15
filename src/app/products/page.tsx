import ProductsView from "@/components/products/ProductsView";
import { listAuthors, listCategories, listProducts } from "@/db/queries";

export const metadata = { title: "Products · Devanagari Prakashan" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category = "" } = await searchParams;
  const [categoryRows, authorRows, products] = await Promise.all([listCategories(), listAuthors(), listProducts()]);
  const categories = categoryRows.map(({ id, name }) => ({ id, name }));
  const authors = authorRows
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ProductsView
      products={products}
      categories={categories}
      authors={authors}
      initialCategory={categories.some((c) => String(c.id) === category) ? category : ""}
    />
  );
}
