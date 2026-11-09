import { and, desc, eq } from "drizzle-orm";
import type { getDb } from "../db";
import { pieceVersions } from "../db/schema";

type Db = Awaited<ReturnType<typeof getDb>>;
type Tx = Pick<Db, "insert" | "select">;

/** What a version holds. Instagram allows 2200 characters of caption and 30 hashtags. */
export type ContentValues = { idea: string; caption: string; hashtags: string; media: string[] };

export const CONTENT_LIMITS = { idea: 2000, caption: 2200, hashtags: 30, media: 10 } as const;

export type ContentIssue = "caption_too_long" | "idea_too_long" | "too_many_hashtags" | "media_not_https" | "too_many_media";

const isHttps = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/** Hashtags written with or without # and separated by spaces or commas become "#a #b". */
export function normalizeHashtags(text: string) {
  return [...new Set(text.split(/[\s,]+/).map((tag) => tag.replace(/^#+/, "").trim()).filter(Boolean))].map((tag) => `#${tag}`).join(" ");
}

/** Cleans what a person or an agent wrote; the reason comes back when it does not fit. */
export function cleanContent(values: Partial<ContentValues>): { content: ContentValues } | { issue: ContentIssue } {
  const idea = String(values.idea ?? "").trim();
  const caption = String(values.caption ?? "").trim();
  const hashtags = normalizeHashtags(String(values.hashtags ?? ""));
  const media = (Array.isArray(values.media) ? values.media : []).map((item) => String(item).trim()).filter(Boolean);
  if (idea.length > CONTENT_LIMITS.idea) return { issue: "idea_too_long" };
  if (caption.length + (hashtags ? hashtags.length + 2 : 0) > CONTENT_LIMITS.caption) return { issue: "caption_too_long" };
  if (hashtags.split(" ").filter(Boolean).length > CONTENT_LIMITS.hashtags) return { issue: "too_many_hashtags" };
  if (media.length > CONTENT_LIMITS.media) return { issue: "too_many_media" };
  if (!media.every(isHttps)) return { issue: "media_not_https" };
  return { content: { idea, caption, hashtags, media } };
}

export async function latestVersion(db: Pick<Db, "select">, pieceId: number) {
  const [row] = await db.select().from(pieceVersions).where(eq(pieceVersions.pieceId, pieceId)).orderBy(desc(pieceVersions.version)).limit(1);
  return row ?? null;
}

/** Writes the next version of a piece and returns its number. */
export async function writeVersion(db: Tx, pieceId: number, content: ContentValues, author: string, note?: string | null) {
  const current = await latestVersion(db, pieceId);
  const version = (current?.version ?? 0) + 1;
  await db.insert(pieceVersions).values({ pieceId, version, ...content, author, note: note ?? null });
  return version;
}

/** The text that goes to Instagram: the caption and, after a blank line, the hashtags. */
export const fullCaption = (content: Pick<ContentValues, "caption" | "hashtags">) => [content.caption.trim(), content.hashtags.trim()].filter(Boolean).join("\n\n");

export const isVideo = (url: string) => /\.(mp4|mov|m4v)(\?|#|$)/i.test(url);

export async function versionsOf(db: Pick<Db, "select">, pieceId: number) {
  return db.select().from(pieceVersions).where(and(eq(pieceVersions.pieceId, pieceId))).orderBy(desc(pieceVersions.version));
}
