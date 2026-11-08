import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Systems outside the panel (INTENEXO among them) identify themselves with the x-api-key header. */
export function refuseWithoutKey(request: Request) {
  const key = process.env.NEXOPIX_API_KEY;
  if (!key) return NextResponse.json({ error: "La API todavía no está habilitada." }, { status: 503 });
  if (!timingSafeEqual(digest(request.headers.get("x-api-key") ?? ""), digest(key))) {
    return NextResponse.json({ error: "Clave no válida." }, { status: 401 });
  }
  return null;
}
