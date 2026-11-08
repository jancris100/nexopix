/**
 * Instagram API with Unified Login: the owner logs in with Instagram or Facebook (no Facebook Page needed) through a
 * Facebook Login for Business configuration, and Nexopix receives a business system user token for the Instagram
 * accounts the owner chose. Everything is called on graph.facebook.com.
 */
export const STATE_COOKIE = "np_oauth";

const GRAPH = "https://graph.facebook.com/v27.0";
/** The configuration asks for 60 days; the exchange does not always say so. */
const DEFAULT_TOKEN_DAYS = 60;

/** App and configuration ids are public (they travel in the login URL); only the secret stays on the server. */
export function metaConfig() {
  const appId = process.env.META_APP_ID || "2011995049488687";
  const configId = process.env.META_CONFIG_ID || "2235398597328606";
  const secret = process.env.META_APP_SECRET;
  return secret ? { appId, configId, secret } : null;
}

export const callbackUrl = (origin: string) => `${origin}/api/meta/callback`;

export function authorizeUrl(config: { appId: string; configId: string }, origin: string, state: string) {
  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("config_id", config.configId);
  url.searchParams.set("redirect_uri", callbackUrl(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

async function read(response: Response, step: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(`Meta rechazó ${step}: ${body.error?.message ?? `respuesta ${response.status}`}`);
  }
  return body;
}

/** The code of the redirect becomes the business token. Server side only: it carries the app secret. */
export async function exchangeCode(config: { appId: string; secret: string }, origin: string, code: string) {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.secret);
  url.searchParams.set("redirect_uri", callbackUrl(origin));
  url.searchParams.set("code", code);
  const body = await read(await fetch(url), "el código");
  const seconds = Number(body.expires_in) > 0 ? Number(body.expires_in) : DEFAULT_TOKEN_DAYS * 24 * 3600;
  return { token: String(body.access_token), expiresAt: new Date(Date.now() + seconds * 1000) };
}

export type InstagramProfile = { userId: string; username: string; avatarUrl: string | null; followers: number | null };

/** The Instagram accounts the owner gave access to, with their picture and followers when Meta returns them. */
export async function assignedAccounts(token: string): Promise<InstagramProfile[]> {
  const list = new URL(`${GRAPH}/me/assigned_instagram_accounts`);
  list.searchParams.set("fields", "id,username");
  list.searchParams.set("access_token", token);
  const body = await read(await fetch(list), "la lista de cuentas");
  const accounts: { id: string; username: string }[] = body.data ?? [];
  return Promise.all(
    accounts.map(async (account) => {
      const detail = new URL(`${GRAPH}/${encodeURIComponent(account.id)}`);
      detail.searchParams.set("fields", "username,profile_picture_url,followers_count");
      detail.searchParams.set("access_token", token);
      type Detail = { username?: string; profile_picture_url?: string; followers_count?: number };
      const extra: Detail = await fetch(detail).then((response) => (response.ok ? response.json() : {})).catch(() => ({}));
      return {
        userId: String(account.id),
        username: String(extra.username ?? account.username),
        avatarUrl: typeof extra.profile_picture_url === "string" ? extra.profile_picture_url : null,
        followers: typeof extra.followers_count === "number" ? extra.followers_count : null,
      };
    }),
  );
}
