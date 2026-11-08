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
    throw new Error(`Meta refused ${step}: ${body.error?.message ?? `status ${response.status}`}`);
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
  const body = await read(await fetch(url), "the code");
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

export type InstagramPost = {
  id: string;
  accountId: string;
  caption: string;
  kind: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string;
  likes: number | null;
  comments: number | null;
};

/** The latest posts of an Instagram account, with the counts every post carries. */
export async function recentMedia(userId: string, token: string, accountId: string, limit = 60): Promise<InstagramPost[]> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(userId)}/media`);
  url.searchParams.set("fields", "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);
  const body = await read(await fetch(url, { cache: "no-store" }), "the posts");
  type Media = { id: string; caption?: string; media_type?: string; media_product_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp: string; like_count?: number; comments_count?: number };
  return ((body.data ?? []) as Media[]).map((media) => ({
    id: String(media.id),
    accountId,
    caption: media.caption ?? "",
    kind: media.media_product_type === "REELS" ? "reel" : media.media_product_type === "STORY" ? "story" : media.media_type === "CAROUSEL_ALBUM" ? "carousel" : media.media_type === "VIDEO" ? "video" : "photo",
    mediaUrl: media.media_type === "VIDEO" ? null : media.media_url ?? null,
    thumbnailUrl: media.thumbnail_url ?? null,
    permalink: media.permalink ?? null,
    timestamp: media.timestamp,
    likes: typeof media.like_count === "number" ? media.like_count : null,
    comments: typeof media.comments_count === "number" ? media.comments_count : null,
  }));
}

export type PostInsights = { views?: number; reach?: number; saved?: number; shares?: number; total_interactions?: number };

/** Views, reach, saves and shares. They need the insights permission; without it Meta says so and null comes back. */
export async function mediaInsights(mediaId: string, token: string): Promise<{ insights: PostInsights | null; reason: string | null }> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(mediaId)}/insights`);
  url.searchParams.set("metric", "views,reach,saved,shares,total_interactions");
  url.searchParams.set("access_token", token);
  const body = await fetch(url, { cache: "no-store" }).then((response) => response.json()).catch(() => ({}));
  if (body.error || !Array.isArray(body.data)) {
    const message = String(body.error?.message ?? "");
    return { insights: null, reason: /permission|instagram_manage_insights|\(#10\)|\(#200\)/i.test(message) ? "permission" : "unavailable" };
  }
  const insights: PostInsights = {};
  for (const metric of body.data as { name: keyof PostInsights; values?: { value: number }[]; total_value?: { value: number } }[]) {
    const value = metric.total_value?.value ?? metric.values?.[0]?.value;
    if (typeof value === "number") insights[metric.name] = value;
  }
  return { insights, reason: null };
}
