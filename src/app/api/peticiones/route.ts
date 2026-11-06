import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createRequest } from "../../../lib/panel";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** POST /api/peticiones: { cuenta, red, formato, objetivo, media[], publicar, modo } with the x-api-key header. */
export async function POST(request: Request) {
  const key = process.env.NEXOPIX_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "La API todavía no está habilitada." }, { status: 503 });
  }
  if (!timingSafeEqual(digest(request.headers.get("x-api-key") ?? ""), digest(key))) {
    return NextResponse.json({ error: "Clave no válida." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }
  const result = await createRequest(body);
  return result.ok
    ? NextResponse.json({ id: result.pieceId, manual: result.manual }, { status: 201 })
    : NextResponse.json({ error: result.reason }, { status: 422 });
}
