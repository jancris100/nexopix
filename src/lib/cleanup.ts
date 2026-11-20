/**
 * Uploaded files (reels and covers in media/) are kept 7 days: once Instagram published a reel it keeps its own copy,
 * so the store only holds what is still on its way. A file that belongs to a piece not yet published is never
 * deleted, however old it is: a reel scheduled two weeks ahead keeps its video until it goes out.
 */
export const MEDIA_PREFIX = "media/";
export const MEDIA_RETENTION_DAYS = 7;
/** Deletions per run of the scheduler, so a run never takes long. */
export const MEDIA_DELETE_LIMIT = 100;

export type StoredBlob = { url: string; pathname: string; uploadedAt: Date };

/** The files to delete: under media/, older than the retention, and not used by a piece still on its way. */
export function expiredMedia(blobs: readonly StoredBlob[], inUse: ReadonlySet<string>, now = new Date(), days = MEDIA_RETENTION_DAYS) {
  const limit = now.getTime() - days * 24 * 60 * 60 * 1000;
  return blobs
    .filter((blob) => blob.pathname.startsWith(MEDIA_PREFIX) && blob.uploadedAt.getTime() < limit && !inUse.has(blob.url))
    .map((blob) => blob.url);
}
