// Rules for uploaded book photos. The files themselves are stored in ImageKit (lib/imagekit.ts).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 8;

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Does the file's first bytes match the image type it claims to be? (The browser-sent type can't be trusted.) */
export function looksLikeImage(buf: Buffer, ext: string): boolean {
  if (ext === "jpg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (ext === "png") return buf.subarray(0, 4).toString("hex") === "89504e47";
  if (ext === "gif") return buf.subarray(0, 3).toString("ascii") === "GIF";
  if (ext === "webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}
