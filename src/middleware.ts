import { NextResponse, type NextRequest } from "next/server";
import { hasSession, SESSION_COOKIE } from "./lib/session";

/** The panel, its actions and the network connections need the session when the panel has a password. */
export async function middleware(request: NextRequest) {
  if (await hasSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Inicia sesión en el panel." }, { status: 401 });
  }
  const login = new URL("/entrar", request.url);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/panel/:path*", "/api/meta/:path*"] };
