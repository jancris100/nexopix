import { randomBytes } from "node:crypto";

/**
 * Files a sender may upload to the blob store before asking for a piece. A reel is an MP4 (Instagram takes up to
 * 300 MB, our reels weigh 12 to 22 MB) and its cover an image. The file never passes through our functions (they
 * take about 4.5 MB per request): the sender gets a short-lived token for one path and uploads straight to the store.
 */
export const UPLOAD_TYPES = {
  "video/mp4": { extension: "mp4", maxMb: 300 },
  "image/jpeg": { extension: "jpg", maxMb: 8 },
  "image/png": { extension: "png", maxMb: 8 },
} as const;

export type UploadType = keyof typeof UPLOAD_TYPES;

/** Minutes the upload token lasts: enough for a big file on a slow line, short enough to be useless if it leaks. */
export const UPLOAD_TOKEN_MINUTES = 30;

export type UploadPlan =
  | { ok: true; pathname: string; contentType: UploadType; maximumSizeInBytes: number }
  | { ok: false; code: "upload_type" | "upload_size" | "upload_name"; params?: Record<string, number> };

const isUploadType = (value: unknown): value is UploadType => typeof value === "string" && Object.hasOwn(UPLOAD_TYPES, value);

/** Combining accents left by NFD normalization (á → a + ´). */
const ACCENTS = /[̀-ͯ]/g;

/** "Reel 01 – Tecno Curiosos.mp4" → "reel-01-tecno-curiosos" (letters, digits and hyphens only). */
export function slugOf(filename: string) {
  return filename
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Checks what the sender wants to upload and picks where it goes: media/<year-month>/<random>-<name>.<ext>. The
 * random part makes each address impossible to guess and never overwrites another file.
 */
export function planUpload(input: { filename?: unknown; contentType?: unknown; size?: unknown }, now = new Date(), random = randomBytes(6).toString("hex")): UploadPlan {
  const filename = typeof input.filename === "string" ? input.filename.trim() : "";
  const size = typeof input.size === "number" && Number.isInteger(input.size) ? input.size : NaN;
  if (!filename || !(size > 0)) return { ok: false, code: "upload_name" };
  if (!isUploadType(input.contentType)) return { ok: false, code: "upload_type" };
  const type = UPLOAD_TYPES[input.contentType];
  const maximumSizeInBytes = type.maxMb * 1024 * 1024;
  if (size > maximumSizeInBytes) return { ok: false, code: "upload_size", params: { max: type.maxMb } };
  const month = now.toISOString().slice(0, 7);
  const slug = slugOf(filename) || "archivo";
  return { ok: true, pathname: `media/${month}/${random}-${slug}.${type.extension}`, contentType: input.contentType, maximumSizeInBytes };
}
