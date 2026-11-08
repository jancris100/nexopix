import { NextResponse } from "next/server";
import { apiError, refuseWithoutKey } from "../../../../lib/apikey";
import { requestStatus } from "../../../../lib/panel";

/** GET /api/requests/{id}: where the piece is and, once published, its link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return apiError(request, 404, { code: "not_found" });
  const status = await requestStatus({ id: Number(id) });
  return status ? NextResponse.json(status) : apiError(request, 404, { code: "not_found" });
}
