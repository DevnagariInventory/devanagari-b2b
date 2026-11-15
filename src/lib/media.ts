// Browser-safe helpers for book photos, which are stored in ImageKit (see lib/imagekit.ts).
const ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/+$/, "");

/** Public URL of a photo from its ImageKit path. `width` asks ImageKit for a smaller copy (much faster than the original). */
export const productImageUrl = (path: string, width?: number) =>
  `${ENDPOINT}${path.startsWith("/") ? path : "/" + path}${width ? `?tr=w-${width},q-80` : ""}`;

export const discountPercent = (price: number, mrp: number) =>
  mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
