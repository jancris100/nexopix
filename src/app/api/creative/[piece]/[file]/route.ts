import { NextResponse } from "next/server";
import { creativeInput } from "../../../../../lib/panel";
import { renderCreative } from "../../../../../lib/render";

export const runtime = "nodejs";

/**
 * GET /api/creative/{piece}/{version}.jpg: the image a template draws for that version. Public, because Instagram
 * downloads it to publish; a version never changes, so the image can be cached for good.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ piece: string; file: string }> }) {
  const { piece, file } = await params;
  const match = /^(\d{1,6})\.jpg$/.exec(file);
  if (!/^\d{1,9}$/.test(piece) || !match) return new NextResponse(null, { status: 404 });
  const input = await creativeInput(Number(piece), Number(match[1]));
  if (!input) return new NextResponse(null, { status: 404 });
  try {
    const jpeg = await renderCreative(input);
    return new NextResponse(new Uint8Array(jpeg), {
      headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    console.error("Creative render failed", piece, match[1], error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 502 });
  }
}
