import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProductEditor from "@/components/products/ProductEditor";
import PageHeader from "@/components/ui/PageHeader";
import { db } from "@/db";
import { getProductImages } from "@/db/products";
import { listAuthors, listCategories } from "@/db/queries";
import { products } from "@/db/schema";
import { productToRaw } from "@/lib/product-form";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const [product] = Number.isInteger(productId)
    ? await db.select().from(products).where(eq(products.id, productId))
    : [];
  if (!product) notFound();
  const [categories, authors, images] = await Promise.all([listCategories(), listAuthors(), getProductImages(productId)]);

  return (
    <div className="space-y-6">
      <Link
        href={`/products/${productId}`}
        className="flex w-fit items-center gap-2 text-base text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>
      <PageHeader eyebrow="Catalog" title={`Edit · ${product.name}`} />
      <ProductEditor
        key={product.id}
        productId={productId}
        initial={productToRaw(product)}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        authors={authors.map(({ id, name }) => ({ id, name }))}
        images={images.map(({ id, path }) => ({ id, path }))}
      />
    </div>
  );
}
