import { NextResponse } from "next/server";
import { refuseWithoutKey } from "../../../lib/apikey";
import { createRequest, requestStatus } from "../../../lib/panel";

/**
 * POST /api/peticiones with the x-api-key header:
 * { cuenta, red, formato, objetivo, referencia?, origen?, producto?, media?, fecha?, notas?, modo? }
 * 201 with the new piece, or 200 with the piece already made for that reference.
 */
export async function POST(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }
  const result = await createRequest(body);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });
  return NextResponse.json(
    { id: result.pieceId, estado: result.state, manual: result.manual, repetida: result.duplicate },
    { status: result.duplicate ? 200 : 201 },
  );
}

/** GET /api/peticiones?referencia=...&origen=...: the state of a request by the sender's own id. */
export async function GET(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const params = new URL(request.url).searchParams;
  const reference = params.get("referencia");
  if (!reference) return NextResponse.json({ error: "Falta la referencia." }, { status: 400 });
  const status = await requestStatus({ reference, origin: params.get("origen") ?? undefined });
  return status ? NextResponse.json(status) : NextResponse.json({ error: "No existe esa petición." }, { status: 404 });
}
