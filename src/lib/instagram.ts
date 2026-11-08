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

type Detail = { username?: string; profile_picture_url?: string; followers_count?: number };

async function getJson(url: URL): Promise<Record<string, unknown>> {
  return fetch(url)
    .then((response) => response.json())
    .catch(() => ({}));
}

/**
 * The Instagram accounts the owner gave access to. Meta reports them in different places depending on how the owner
 * logged in (Instagram or Facebook), so three sources are read and merged: the assigned accounts of the business
 * token, the accounts the permission itself was granted on (debug_token), and the accounts linked to the owner's Pages.
 * The returned note says what each source answered, without the token, for the server log.
 */
export async function assignedAccounts(token: string, config: { appId: string; secret: string }) {
  const ids = new Map<string, string | undefined>();
  const note: Record<string, unknown> = {};

  const assigned = new URL(`${GRAPH}/me/assigned_instagram_accounts`);
  assigned.searchParams.set("fields", "id,username");
  assigned.searchParams.set("access_token", token);
  const a = await getJson(assigned);
  const assignedList = Array.isArray(a.data) ? (a.data as { id: string; username?: string }[]) : [];
  for (const item of assignedList) ids.set(String(item.id), item.username);
  note.assigned = a.error ? (a.error as { message?: string }).message : assignedList.length;

  const debug = new URL(`${GRAPH}/debug_token`);
  debug.searchParams.set("input_token", token);
  debug.searchParams.set("access_token", `${config.appId}|${config.secret}`);
  const d = await getJson(debug);
  const data = (d.data ?? {}) as { type?: string; scopes?: string[]; granular_scopes?: { scope: string; target_ids?: string[] }[] };
  note.tokenType = data.type;
  note.scopes = data.scopes;
  for (const grant of data.granular_scopes ?? []) {
    if (!grant.scope.startsWith("instagram")) continue;
    for (const id of grant.target_ids ?? []) if (!ids.has(String(id))) ids.set(String(id), undefined);
  }
  note.granted = data.granular_scopes?.map((grant) => `${grant.scope}:${grant.target_ids?.length ?? "todas"}`);

  const pages = new URL(`${GRAPH}/me/accounts`);
  pages.searchParams.set("fields", "instagram_business_account{id,username}");
  pages.searchParams.set("access_token", token);
  const p = await getJson(pages);
  const pageList = Array.isArray(p.data) ? (p.data as { instagram_business_account?: { id: string; username?: string } }[]) : [];
  for (const page of pageList) {
    const linked = page.instagram_business_account;
    if (linked && !ids.has(String(linked.id))) ids.set(String(linked.id), linked.username);
  }
  note.pages = p.error ? (p.error as { message?: string }).message : pageList.length;

  const accounts = await Promise.all(
    [...ids.entries()].map(async ([id, knownName]) => {
      const detail = new URL(`${GRAPH}/${encodeURIComponent(id)}`);
      detail.searchParams.set("fields", "username,profile_picture_url,followers_count");
      detail.searchParams.set("access_token", token);
      const extra = (await getJson(detail)) as Detail;
      const username = extra.username ?? knownName;
      if (!username) return null;
      return {
        userId: id,
        username: String(username),
        avatarUrl: typeof extra.profile_picture_url === "string" ? extra.profile_picture_url : null,
        followers: typeof extra.followers_count === "number" ? extra.followers_count : null,
      } satisfies InstagramProfile;
    }),
  );
  return { accounts: accounts.filter((account): account is InstagramProfile => account !== null), note };
}
