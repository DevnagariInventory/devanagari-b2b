import crypto from "node:crypto";
import { count, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { audit } from "@/db/audit";
import { productImages, products } from "@/db/schema";
import { today } from "@/lib/date";
import { denied } from "@/lib/auth/current";
import { deleteImage, uploadImage } from "@/lib/imagekit";
import { IMAGE_TYPES, MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_BYTES, looksLikeImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST multipart/form-data with one or more `files`. Uploads them to ImageKit. Returns { saved, errors[] }. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (await denied("staff")) return Response.json({ saved: 0, errors: ["Please sign in again"] }, { status: 401 });
  const { id } = await ctx.params;
  const productId = Number(id);
  const [product] = Number.isInteger(productId)
    ? await db.select().from(products).where(eq(products.id, productId))
    : [];
  if (!product) return Response.json({ saved: 0, errors: ["Product not found"] }, { status: 404 });

  let files: File[];
  try {
    files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File);
  } catch {
    return Response.json({ saved: 0, errors: ["Could not read the upload"] }, { status: 400 });
  }
  if (files.length === 0) return Response.json({ saved: 0, errors: ["Choose at least one image"] }, { status: 400 });

  const [{ n }] = await db.select({ n: count() }).from(productImages).where(eq(productImages.productId, productId));
  const [{ m }] = await db.select({ m: max(productImages.sortOrder) }).from(productImages).where(eq(productImages.productId, productId));
  let existing = n;
  let order = (m ?? -1) + 1;

  const errors: string[] = [];
  let saved = 0;

  for (const file of files) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) { errors.push(`${file.name}: only JPG, PNG, WebP or GIF images are allowed`); continue; }
    if (file.size > MAX_IMAGE_BYTES) { errors.push(`${file.name}: larger than 5 MB`); continue; }
    if (existing >= MAX_IMAGES_PER_PRODUCT) { errors.push(`${file.name}: a book can have at most ${MAX_IMAGES_PER_PRODUCT} photos`); continue; }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(buf, ext)) { errors.push(`${file.name}: not a valid ${ext.toUpperCase()} image`); continue; }

    let stored;
    try {
      stored = await uploadImage(buf, `book-${productId}-${crypto.randomUUID().slice(0, 8)}.${ext}`);
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      continue;
    }
    try {
      await db.insert(productImages).values({ productId, fileId: stored.fileId, path: stored.path, sortOrder: order++, createdAt: today() });
    } catch (e) {
      // Don't leave an orphan file in ImageKit if we couldn't record it.
      await deleteImage(stored.fileId).catch(() => {});
      errors.push(`${file.name}: could not be saved`);
      continue;
    }
    existing++;
    saved++;
  }

  if (saved > 0) {
    await audit("update", "product", productId, `Added ${saved} photo${saved === 1 ? "" : "s"} to "${product.name}"`);
    revalidatePath("/", "layout");
  }
  return Response.json({ saved, errors }, { status: saved === 0 ? 400 : 200 });
}
