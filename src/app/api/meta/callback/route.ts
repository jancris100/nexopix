import { NextResponse, type NextRequest } from "next/server";
import { assignedAccounts, exchangeCode, metaConfig, STATE_COOKIE } from "../../../../lib/instagram";
import { saveInstagramConnection } from "../../../../lib/panel";
import { encrypt, sameText } from "../../../../lib/secure";

/** GET /api/meta/callback: Meta returns here with a code (or with the refusal of the owner). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const back = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/panel?red=${reason}`, request.url));
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/meta" });
    return response;
  };
  const [expected, attach] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split("|");
  const config = metaConfig();
  if (!config || !expected || !sameText(params.get("state") ?? "", expected)) return back("vencida");
  if (params.get("error")) return back("cancelada");
  const code = params.get("code");
  if (!code) return back("vencida");

  try {
    const { token, expiresAt } = await exchangeCode(config, request.nextUrl.origin, code);
    const { accounts, note } = await assignedAccounts(token, config);
    console.log("Instagram accounts found", accounts.length, JSON.stringify(note));
    if (accounts.length === 0) return back("sin-cuentas");
    const sealed = encrypt(token);
    for (const [index, account] of accounts.entries()) {
      await saveInstagramConnection(account, sealed, expiresAt, index === 0 ? attach || null : null);
    }
    return back("conectada");
  } catch (error) {
    console.error("Instagram connection failed", error instanceof Error ? error.message : error);
    return back("error");
  }
}
