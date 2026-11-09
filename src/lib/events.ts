import type { getDb } from "../db";
import { pieceEvents } from "../db/schema";

/** Event types of a piece. The words for people are in the dictionaries; the API returns these codes. */
export type EventType =
  | "received"
  | "repeated"
  | "routed"
  | "advanced"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published"
  | "content_updated"
  | "publish_failed";

/** Who acted: the gatekeeper and the router at the door, an agent of the pipeline, or the person. */
export type Actor = "gatekeeper" | "router" | "strategist" | "writer" | "human" | "scheduler" | "analyst";

type Writer = Pick<Awaited<ReturnType<typeof getDb>>, "insert">;
type Detail = Record<string, string | number | boolean | null>;

export async function recordEvent(db: Writer, pieceId: number, type: EventType, actor: Actor, detail?: Detail, traceId?: string | null) {
  await db.insert(pieceEvents).values({ pieceId, type, actor, detail: detail ?? null, traceId: traceId ?? null });
}

/** The agent working at each stage: the one who moves a piece out of it. */
export const STAGE_ACTORS: Actor[] = ["strategist", "writer", "human", "scheduler", "analyst"];

/** A trace id as other systems send it (x-trace-id): letters, digits and hyphens, at most 64. */
export const cleanTraceId = (value: string | null | undefined) => (value && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null);
