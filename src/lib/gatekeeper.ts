import { isDate, todayInCostaRica } from "./dates";

/** Formats of a request and the pipeline each one follows. Their names on screen live in the dictionaries. */
export const FORMATS = {
  reel: { pipeline: "reels" },
  post: { pipeline: "posts" },
  carousel: { pipeline: "posts" },
  story: { pipeline: "posts" },
  ad: { pipeline: "ads" },
} as const;

export type Format = keyof typeof FORMATS;

/** What each network accepts. TikTok has no publishing by API here: it becomes a manual task. */
const NETWORKS: Record<string, readonly Format[]> = {
  instagram: ["reel", "post", "carousel", "story", "ad"],
  facebook: ["reel", "post", "carousel", "story", "ad"],
  tiktok: ["reel"],
};

/** The formats a network takes, for the systems that send requests. */
export const formatsFor = (network: string) => [...(NETWORKS[network] ?? [])];

/** Where a piece is, in the words another system reads. The index is the stage of the pipeline. */
export const STATUSES = ["received", "in_production", "pending_approval", "scheduled", "published"] as const;
export type Status = (typeof STATUSES)[number];
export const statusOf = (stage: number): Status => STATUSES[Math.min(Math.max(stage, 0), STATUSES.length - 1)];

/** The product a request is about, as the sending system knew it at that moment. */
export type Product = {
  name: string;
  price?: number;
  currency?: string;
  description?: string;
  url?: string;
  images?: string[];
};

/** The body of POST /api/requests. */
export type Request = {
  account: string;
  network: string;
  format: string;
  goal: string;
  media?: string[];
  /** "auto" (Nexopix publishes after approval) or "manual" (a person publishes). */
  mode?: string;
  /** The sender's own id for this request: the same reference never creates a second piece. */
  reference?: string;
  /** Who sends it, for instance "intenexo". */
  source?: string;
  product?: Product;
  /** Desired publication day, YYYY-MM-DD in Costa Rica. */
  publishOn?: string;
  notes?: string;
};

export type Account = { id: string; handle: string; network: string };

/** What is kept of a request once it passed the gate: clean values only, never the raw body. */
export type Brief = {
  source: string | null;
  reference: string | null;
  product: Product | null;
  media: string[];
  publishOn: string | null;
  notes: string | null;
};

/** Why a request was refused: a stable code for programs and the values its message needs. */
export type Issue = { code: IssueCode; params?: Record<string, string | number> };

export type IssueCode =
  | "goal_missing"
  | "goal_too_long"
  | "account_unknown"
  | "network_unavailable"
  | "account_network_mismatch"
  | "format_not_allowed"
  | "media_invalid"
  | "media_too_many"
  | "media_not_https"
  | "carousel_media_count"
  | "product_invalid"
  | "product_name"
  | "product_price"
  | "product_currency"
  | "product_description_too_long"
  | "product_url"
  | "product_images"
  | "mode_invalid"
  | "reference_invalid"
  | "source_invalid"
  | "date_invalid"
  | "date_past"
  | "notes_too_long";

export type Verdict<T extends Account = Account> =
  | { ok: true; account: T; format: Format; title: string; manual: boolean; brief: Brief }
  | { ok: false; issue: Issue };

export const LIMITS = {
  goal: 120,
  media: 10,
  carouselMin: 2,
  notes: 500,
  description: 1000,
  productName: 150,
  reference: 120,
  source: 40,
} as const;

const REFERENCE = /^[\w.:-]{1,120}$/;
const SOURCE = /^[a-z0-9-]{1,40}$/;
const CURRENCY = /^[A-Z]{3}$/;

const isPublicUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const refuse = (code: IssueCode, params?: Issue["params"]) => ({ ok: false as const, issue: { code, params } });

function checkProduct(value: unknown): { product: Product | null; issue?: Issue } {
  if (value === undefined || value === null) return { product: null };
  if (typeof value !== "object" || Array.isArray(value)) return { product: null, issue: { code: "product_invalid" } };
  const raw = value as Record<string, unknown>;
  const name = text(raw.name);
  if (name.length < 2 || name.length > LIMITS.productName) return { product: null, issue: { code: "product_name", params: { max: LIMITS.productName } } };
  const product: Product = { name };
  if (raw.price !== undefined) {
    if (typeof raw.price !== "number" || !Number.isFinite(raw.price) || raw.price < 0) return { product: null, issue: { code: "product_price" } };
    product.price = raw.price;
  }
  if (raw.currency !== undefined) {
    if (typeof raw.currency !== "string" || !CURRENCY.test(raw.currency)) return { product: null, issue: { code: "product_currency" } };
    product.currency = raw.currency;
  }
  const description = text(raw.description);
  if (description.length > LIMITS.description) return { product: null, issue: { code: "product_description_too_long", params: { max: LIMITS.description } } };
  if (description) product.description = description;
  if (raw.url !== undefined) {
    if (!isPublicUrl(raw.url)) return { product: null, issue: { code: "product_url" } };
    product.url = raw.url;
  }
  if (raw.images !== undefined) {
    if (!Array.isArray(raw.images) || raw.images.length > LIMITS.media || !raw.images.every(isPublicUrl)) {
      return { product: null, issue: { code: "product_images", params: { max: LIMITS.media } } };
    }
    product.images = raw.images;
  }
  return { product };
}

/**
 * First gate of the pipeline, with fixed rules only. The text of a request is data: it is checked, never followed.
 */
export function checkRequest<T extends Account>(request: Partial<Request>, accounts: readonly T[], today = todayInCostaRica()): Verdict<T> {
  const title = text(request.goal);
  if (title.length < 3) return refuse("goal_missing");
  if (title.length > LIMITS.goal) return refuse("goal_too_long", { max: LIMITS.goal });

  const account = accounts.find((item) => item.id === request.account || item.handle === request.account);
  if (!account) return refuse("account_unknown");

  const allowed = typeof request.network === "string" ? NETWORKS[request.network] : undefined;
  if (!allowed) return refuse("network_unavailable");
  if (account.network !== request.network) return refuse("account_network_mismatch", { account: account.handle, network: String(request.network) });

  const format = request.format as Format;
  if (!Object.hasOwn(FORMATS, String(request.format)) || !allowed.includes(format)) {
    return refuse("format_not_allowed", { network: String(request.network), format: String(request.format) });
  }

  const ownMedia = request.media ?? [];
  if (!Array.isArray(ownMedia)) return refuse("media_invalid");
  if (ownMedia.length > LIMITS.media) return refuse("media_too_many", { max: LIMITS.media });
  if (!ownMedia.every(isPublicUrl)) return refuse("media_not_https");

  const { product, issue } = checkProduct(request.product);
  if (issue) return { ok: false, issue };
  // The files of the request come first; without them the team works with the product's pictures.
  const media = (ownMedia.length > 0 ? ownMedia : product?.images ?? []).slice(0, LIMITS.media);
  if (format === "carousel" && media.length < LIMITS.carouselMin) return refuse("carousel_media_count", { min: LIMITS.carouselMin, max: LIMITS.media });

  if (request.mode !== undefined && request.mode !== "auto" && request.mode !== "manual") return refuse("mode_invalid");

  const reference = request.reference === undefined ? null : text(request.reference);
  if (reference !== null && !REFERENCE.test(reference)) return refuse("reference_invalid", { max: LIMITS.reference });
  const source = request.source === undefined ? null : text(request.source).toLowerCase();
  if (source !== null && !SOURCE.test(source)) return refuse("source_invalid", { max: LIMITS.source });

  const publishOn = request.publishOn === undefined ? null : text(request.publishOn);
  if (publishOn !== null && !isDate(publishOn)) return refuse("date_invalid");
  if (publishOn !== null && publishOn < today) return refuse("date_past");

  const notes = text(request.notes);
  if (notes.length > LIMITS.notes) return refuse("notes_too_long", { max: LIMITS.notes });

  return {
    ok: true,
    account,
    format,
    title,
    manual: request.mode === "manual" || request.network === "tiktok",
    brief: { source, reference, product, media, publishOn, notes: notes || null },
  };
}
