import { NextResponse } from "next/server";
import { apiError, refuseWithoutKey } from "../../../lib/apikey";
import { cleanTraceId } from "../../../lib/events";
import { createRequest, requestStatus } from "../../../lib/panel";

/**
 * POST /api/requests with the x-api-key header:
 * { account, network, format, goal, reference?, source?, product?, media?, publishOn?, notes?, mode? }
 * 201 with the new piece, or 200 with the piece already made for that reference.
 */
export async function POST(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(request, 400, { code: "body_not_json" });
  const result = await createRequest(body, undefined, cleanTraceId(request.headers.get("x-trace-id")));
  if (!result.ok) return apiError(request, 422, result.issue);
  return NextResponse.json(
    { id: result.pieceId, status: result.status, manual: result.manual, duplicate: result.duplicate },
    { status: result.duplicate ? 200 : 201 },
  );
}

/** GET /api/requests?source=...&reference=...: the status of a request by the sender's own id. */
export async function GET(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const params = new URL(request.url).searchParams;
  const reference = params.get("reference");
  if (!reference) return apiError(request, 400, { code: "reference_missing" });
  const status = await requestStatus({ reference, source: params.get("source") ?? undefined });
  return status ? NextResponse.json(status) : apiError(request, 404, { code: "not_found" });
}
