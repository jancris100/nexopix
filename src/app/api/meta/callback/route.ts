import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, instagramConfig, profile, STATE_COOKIE } from "../../../../lib/instagram";
import { saveInstagramConnection } from "../../../../lib/panel";
import { encrypt, sameText } from "../../../../lib/secure";

/** GET /api/meta/callback: Instagram returns here with a code (or with the refusal of the owner). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const back = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/panel?red=${reason}`, request.url));
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/meta" });
    return response;
  };
  const [expected, attach] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split("|");
  const config = instagramConfig();
  if (!config || !expected || !sameText(params.get("state") ?? "", expected)) return back("vencida");
  if (params.get("error")) return back("cancelada");
  const code = params.get("code");
  if (!code) return back("vencida");

  try {
    const { token, expiresAt } = await exchangeCode(config, request.nextUrl.origin, code);
    const account = await profile(token);
    if (account.accountType && !["BUSINESS", "MEDIA_CREATOR", "CREATOR"].includes(account.accountType)) return back("no-profesional");
    await saveInstagramConnection(account, encrypt(token), expiresAt, attach || null);
    return back("conectada");
  } catch (error) {
    console.error("Instagram connection failed", error instanceof Error ? error.message : error);
    return back("error");
  }
}
