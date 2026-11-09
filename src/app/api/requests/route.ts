import { NextResponse } from "next/server";
import { apiError, refuseWithoutKey } from "../../../lib/apikey";
import { cleanTraceId } from "../../../lib/events";
import { recordIntake } from "../../../lib/intake";
import { createRequest, requestStatus } from "../../../lib/panel";

/**
 * POST /api/requests with the x-api-key header:
 * { account, network, format, goal, reference?, source?, product?, media?, publishOn?, notes?, mode? }
 * 201 with the new piece, or 200 with the piece already made for that reference.
 */
export async function POST(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const traceId = cleanTraceId(request.headers.get("x-trace-id"));
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    await recordIntake({ outcome: "refused", body: null, code: "body_not_json", traceId });
    return apiError(request, 400, { code: "body_not_json" });
  }
  const result = await createRequest(body, undefined, traceId);
  if (!result.ok) {
    await recordIntake({ outcome: "refused", body, code: result.issue.code, params: result.issue.params ?? null, traceId });
    return apiError(request, 422, result.issue);
  }
  await recordIntake({ outcome: result.duplicate ? "repeated" : "accepted", body, pieceId: result.pieceId, traceId });
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
