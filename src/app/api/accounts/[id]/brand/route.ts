import { NextResponse } from "next/server";
import { apiError, refuseWithoutKey } from "../../../../../lib/apikey";
import { saveBrandKit } from "../../../../../lib/panel";

/**
 * PUT /api/accounts/{id}/brand: the brand kit the templates draw with, sent by the system that owns the brand
 * (INTENEXO sends the company's logo and color). { logoUrl?, brandColor?, accentColor?, defaultTemplate? }
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(request, 400, { code: "body_not_json" });
  const problem = await saveBrandKit(decodeURIComponent(id), body);
  if (problem === "account_unknown") return apiError(request, 404, { code: "account_unknown" });
  if (problem) return apiError(request, 422, { code: problem });
  return NextResponse.json({ ok: true });
}
