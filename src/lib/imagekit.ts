// ImageKit storage for book photos. Uses ImageKit's REST API directly (no SDK needed).
// Env: IMAGEKIT_PRIVATE_KEY (secret, server only) and NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT.

export const PRODUCT_FOLDER = "/devanagari-prakashan/products";

function authHeader() {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new Error("IMAGEKIT_PRIVATE_KEY is not set in .env");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

export interface StoredImage {
  fileId: string;
  path: string;
}

/** Upload one image. Throws with a readable message if ImageKit refuses it. */
export async function uploadImage(data: Buffer, fileName: string, folder = PRODUCT_FOLDER): Promise<StoredImage> {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(data)]), fileName);
  body.append("fileName", fileName);
  body.append("folder", folder);
  body.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: authHeader() },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { fileId?: string; filePath?: string; message?: string };
  if (!res.ok || !json.fileId || !json.filePath) {
    throw new Error(json.message ?? `ImageKit upload failed (${res.status})`);
  }
  return { fileId: json.fileId, path: json.filePath };
}

/** Delete an image from ImageKit. A file that is already gone (404) counts as deleted. */
export async function deleteImage(fileId: string): Promise<void> {
  const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  });
  if (!res.ok && res.status !== 404) {
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(json.message ?? `ImageKit delete failed (${res.status})`);
  }
}
