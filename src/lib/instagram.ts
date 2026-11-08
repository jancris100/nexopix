/**
 * Instagram API with Instagram Login: the owner of a professional account authorizes Nexopix, which keeps a long-lived
 * token (about 60 days) to read the profile and, later, publish.
 */
export const STATE_COOKIE = "np_oauth";

export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

export function instagramConfig() {
  const id = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  return id && secret ? { id, secret } : null;
}

export const callbackUrl = (origin: string) => `${origin}/api/meta/callback`;

export function authorizeUrl(appId: string, origin: string, state: string) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", callbackUrl(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

async function read(response: Response, step: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error || body.error_message) {
    const reason = body.error_message ?? body.error?.message ?? body.error_description ?? `respuesta ${response.status}`;
    throw new Error(`Instagram rechazó ${step}: ${reason}`);
  }
  return body;
}

/** The code of the redirect becomes a short token, then a long-lived one. */
export async function exchangeCode(config: { id: string; secret: string }, origin: string, code: string) {
  const form = new URLSearchParams({
    client_id: config.id,
    client_secret: config.secret,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(origin),
    code: code.replace(/#_$/, ""),
  });
  const short = await read(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form }), "el código");
  const long = new URL("https://graph.instagram.com/access_token");
  long.searchParams.set("grant_type", "ig_exchange_token");
  long.searchParams.set("client_secret", config.secret);
  long.searchParams.set("access_token", short.access_token);
  const lasting = await read(await fetch(long), "el permiso de larga duración");
  return { token: String(lasting.access_token), expiresAt: new Date(Date.now() + Number(lasting.expires_in ?? 0) * 1000) };
}

export type InstagramProfile = { userId: string; username: string; accountType: string; avatarUrl: string | null; followers: number | null };

export async function profile(token: string): Promise<InstagramProfile> {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "user_id,username,account_type,profile_picture_url,followers_count");
  url.searchParams.set("access_token", token);
  const body = await read(await fetch(url), "el perfil");
  return {
    userId: String(body.user_id ?? body.id),
    username: String(body.username),
    accountType: String(body.account_type ?? ""),
    avatarUrl: body.profile_picture_url ?? null,
    followers: typeof body.followers_count === "number" ? body.followers_count : null,
  };
}
