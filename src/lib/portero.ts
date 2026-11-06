/** Formats of a request and the pipeline each one follows. */
export const FORMATS = {
  reel: { label: "Reel", pipeline: "reels" },
  publicacion: { label: "Publicación", pipeline: "posts" },
  historia: { label: "Historia", pipeline: "posts" },
  anuncio: { label: "Meta Ads", pipeline: "ads" },
} as const;

export type Format = keyof typeof FORMATS;

/** What each network accepts. TikTok has no publishing by API here: it becomes a manual task. */
const NETWORKS: Record<string, readonly Format[]> = {
  instagram: ["reel", "publicacion", "historia", "anuncio"],
  facebook: ["reel", "publicacion", "historia", "anuncio"],
  tiktok: ["reel"],
};

export type Request = {
  cuenta: string;
  red: string;
  formato: string;
  objetivo: string;
  media?: string[];
  publicar?: string;
  modo?: string;
};

export type Account = { id: string; handle: string; network: string };

export type Verdict<T extends Account = Account> =
  | { ok: true; account: T; format: Format; title: string; manual: boolean }
  | { ok: false; reason: string };

const MAX_TITLE = 120;
const MAX_MEDIA = 10;

const isPublicUrl = (value: unknown) => {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * First gate of the pipeline, with fixed rules only. The text of a request is data: it is checked, never followed.
 */
export function checkRequest<T extends Account>(request: Partial<Request>, accounts: readonly T[]): Verdict<T> {
  const title = typeof request.objetivo === "string" ? request.objetivo.trim() : "";
  if (title.length < 3) return { ok: false, reason: "Falta el objetivo de la publicación." };
  if (title.length > MAX_TITLE) return { ok: false, reason: `El objetivo admite ${MAX_TITLE} caracteres.` };

  const account = accounts.find((item) => item.id === request.cuenta || item.handle === request.cuenta);
  if (!account) return { ok: false, reason: "Esa cuenta no está registrada." };

  const allowed = typeof request.red === "string" ? NETWORKS[request.red] : undefined;
  if (!allowed) return { ok: false, reason: "Esa red no está disponible." };
  if (account.network !== request.red) return { ok: false, reason: `${account.handle} no es una cuenta de ${request.red}.` };

  const format = request.formato as Format;
  if (!Object.hasOwn(FORMATS, String(request.formato)) || !allowed.includes(format)) {
    return { ok: false, reason: `${request.red} no admite el formato ${request.formato}.` };
  }

  const media = request.media ?? [];
  if (!Array.isArray(media) || media.length > MAX_MEDIA) return { ok: false, reason: `Se admiten hasta ${MAX_MEDIA} archivos.` };
  if (!media.every(isPublicUrl)) return { ok: false, reason: "Cada archivo debe ser una dirección https pública." };

  if (request.modo !== undefined && request.modo !== "api" && request.modo !== "manual") {
    return { ok: false, reason: "El modo debe ser api o manual." };
  }
  return { ok: true, account, format, title, manual: request.modo === "manual" || request.red === "tiktok" };
}
