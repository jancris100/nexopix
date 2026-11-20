import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { apiError, refuseWithoutKey } from "../../../../lib/apikey";
import { planUpload, UPLOAD_TOKEN_MINUTES } from "../../../../lib/uploads";

/**
 * POST /api/media/upload with the x-api-key header: { filename, contentType, size }.
 * Answers { pathname, clientToken, expiresAt }: the sender uploads the file straight to the blob store with that
 * token (put from @vercel/blob/client, access "public", multipart for videos) and then sends the public address it
 * got back in media of POST /api/requests. The token only allows that path, that type and that size, for 30 minutes.
 */
export async function POST(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return apiError(request, 503, { code: "uploads_disabled" });

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(request, 400, { code: "body_not_json" });
  const plan = planUpload(body);
  if (!plan.ok) return apiError(request, 422, { code: plan.code, params: plan.params });

  const validUntil = Date.now() + UPLOAD_TOKEN_MINUTES * 60_000;
  const clientToken = await generateClientTokenFromReadWriteToken({
    token,
    pathname: plan.pathname,
    allowedContentTypes: [plan.contentType],
    maximumSizeInBytes: plan.maximumSizeInBytes,
    validUntil,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return NextResponse.json({ pathname: plan.pathname, contentType: plan.contentType, clientToken, expiresAt: new Date(validUntil).toISOString() }, { status: 201 });
}
