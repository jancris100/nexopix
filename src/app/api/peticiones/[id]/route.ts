import { NextResponse } from "next/server";
import { refuseWithoutKey } from "../../../../lib/apikey";
import { requestStatus } from "../../../../lib/panel";

/** GET /api/peticiones/{id}: where the piece is and, once published, its link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: "No existe esa petición." }, { status: 404 });
  const status = await requestStatus({ id: Number(id) });
  return status ? NextResponse.json(status) : NextResponse.json({ error: "No existe esa petición." }, { status: 404 });
}
