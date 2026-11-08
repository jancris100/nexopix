import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, metaConfig, STATE_COOKIE } from "../../../../lib/instagram";
import { canEncrypt, randomToken } from "../../../../lib/secure";
import { isProtected } from "../../../../lib/session";

/** GET /api/meta/connect?cuenta=<id>: sends the owner to Meta's login (Instagram or Facebook) to authorize. */
export function GET(request: NextRequest) {
  const back = (reason: string) => NextResponse.redirect(new URL(`/panel?red=${reason}`, request.url));
  const config = metaConfig();
  if (!config) return back("falta-app");
  // A real token never goes into an open panel or unencrypted.
  if (!isProtected() || !canEncrypt()) return back("falta-seguridad");
  if (!process.env.DATABASE_URL) return back("falta-base");

  const state = randomToken();
  const attach = request.nextUrl.searchParams.get("cuenta") ?? "";
  const response = NextResponse.redirect(authorizeUrl(config, request.nextUrl.origin, state));
  response.cookies.set(STATE_COOKIE, `${state}|${attach}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/meta", maxAge: 600 });
  return response;
}
