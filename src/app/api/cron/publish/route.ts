import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { publishDue } from "../../../../lib/panel";

/** Publishing waits for Meta to process videos. */
export const maxDuration = 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * GET /api/cron/publish: the scheduler publishes every piece whose moment arrived. Vercel Cron calls it with
 * "Authorization: Bearer <CRON_SECRET>"; any other scheduler (GitHub Actions, cron-job.org) can call it the same way.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: { code: "cron_disabled", message: "CRON_SECRET is not set." } }, { status: 503 });
  if (!timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ error: { code: "invalid_key", message: "Invalid key." } }, { status: 401 });
  }
  const results = await publishDue();
  return NextResponse.json({ published: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length, results });
}
