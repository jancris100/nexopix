import { isDate, todayInCostaRica } from "./dates";

/** Formats of a request and the pipeline each one follows. */
export const FORMATS = {
  reel: { label: "Reel", pipeline: "reels" },
  publicacion: { label: "Publicación", pipeline: "posts" },
  carrusel: { label: "Carrusel", pipeline: "posts" },
  historia: { label: "Historia", pipeline: "posts" },
  anuncio: { label: "Meta Ads", pipeline: "ads" },
} as const;

export type Format = keyof typeof FORMATS;

/** What each network accepts. TikTok has no publishing by API here: it becomes a manual task. */
const NETWORKS: Record<string, readonly Format[]> = {
  instagram: ["reel", "publicacion", "carrusel", "historia", "anuncio"],
  facebook: ["reel", "publicacion", "carrusel", "historia", "anuncio"],
  tiktok: ["reel"],
};

/** The formats a network takes, for the systems that send requests. */
export const formatsFor = (network: string) => [...(NETWORKS[network] ?? [])];

/** Where a piece is, in the words another system reads. The index is the stage of the pipeline. */
export const STATES = ["recibida", "en_produccion", "por_aprobar", "programada", "publicada"] as const;
export const stateOf = (stage: number) => STATES[Math.min(Math.max(stage, 0), STATES.length - 1)];

/** The product a request is about, as the sending system knew it at that moment. */
export type Product = {
  nombre: string;
  precio?: number;
  moneda?: string;
  descripcion?: string;
  enlace?: string;
  imagenes?: string[];
};

export type Request = {
  cuenta: string;
  red: string;
  formato: string;
  objetivo: string;
  media?: string[];
  publicar?: string;
  modo?: string;
  /** The sender's own id for this request: the same reference never creates a second piece. */
  referencia?: string;
  /** Who sends it, for instance "intenexo". */
  origen?: string;
  producto?: Product;
  /** Desired publication day, YYYY-MM-DD in Costa Rica. */
  fecha?: string;
  notas?: string;
};

export type Account = { id: string; handle: string; network: string };

/** What is kept of a request once it passed the gate: clean values only, never the raw body. */
export type Brief = {
  origen: string | null;
  referencia: string | null;
  producto: Product | null;
  media: string[];
  fecha: string | null;
  notas: string | null;
};

export type Verdict<T extends Account = Account> =
  | { ok: true; account: T; format: Format; title: string; manual: boolean; brief: Brief }
  | { ok: false; reason: string };

const MAX_TITLE = 120;
const MAX_MEDIA = 10;
const MIN_CAROUSEL = 2;
const MAX_NOTES = 500;
const MAX_DESCRIPTION = 1000;
const REFERENCE = /^[\w.:-]{1,120}$/;
const ORIGIN = /^[a-z0-9-]{1,40}$/;
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

function checkProduct(value: unknown): { product: Product | null; reason?: string } {
  if (value === undefined || value === null) return { product: null };
  if (typeof value !== "object" || Array.isArray(value)) return { product: null, reason: "El producto debe ser un objeto." };
  const raw = value as Record<string, unknown>;
  const nombre = text(raw.nombre);
  if (nombre.length < 2 || nombre.length > 150) return { product: null, reason: "El producto necesita un nombre de 2 a 150 caracteres." };
  const product: Product = { nombre };
  if (raw.precio !== undefined) {
    if (typeof raw.precio !== "number" || !Number.isFinite(raw.precio) || raw.precio < 0) return { product: null, reason: "El precio debe ser un número positivo." };
    product.precio = raw.precio;
  }
  if (raw.moneda !== undefined) {
    if (typeof raw.moneda !== "string" || !CURRENCY.test(raw.moneda)) return { product: null, reason: "La moneda debe ser un código de 3 letras, como CRC o USD." };
    product.moneda = raw.moneda;
  }
  const descripcion = text(raw.descripcion);
  if (descripcion.length > MAX_DESCRIPTION) return { product: null, reason: `La descripción admite ${MAX_DESCRIPTION} caracteres.` };
  if (descripcion) product.descripcion = descripcion;
  if (raw.enlace !== undefined) {
    if (!isPublicUrl(raw.enlace)) return { product: null, reason: "El enlace del producto debe ser una dirección https." };
    product.enlace = raw.enlace;
  }
  if (raw.imagenes !== undefined) {
    if (!Array.isArray(raw.imagenes) || raw.imagenes.length > MAX_MEDIA || !raw.imagenes.every(isPublicUrl)) {
      return { product: null, reason: `Las imágenes del producto deben ser hasta ${MAX_MEDIA} direcciones https públicas.` };
    }
    product.imagenes = raw.imagenes;
  }
  return { product };
}

/**
 * First gate of the pipeline, with fixed rules only. The text of a request is data: it is checked, never followed.
 */
export function checkRequest<T extends Account>(request: Partial<Request>, accounts: readonly T[], today = todayInCostaRica()): Verdict<T> {
  const title = text(request.objetivo);
  if (title.length < 3) return { ok: false, reason: "Escribe qué quieres publicar." };
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

  const ownMedia = request.media ?? [];
  if (!Array.isArray(ownMedia) || ownMedia.length > MAX_MEDIA) return { ok: false, reason: `Se admiten hasta ${MAX_MEDIA} archivos.` };
  if (!ownMedia.every(isPublicUrl)) return { ok: false, reason: "Cada archivo debe ser una dirección https pública." };

  const { product, reason } = checkProduct(request.producto);
  if (reason) return { ok: false, reason };
  // The files of the request come first; without them the team works with the product's pictures.
  const media = (ownMedia.length > 0 ? ownMedia : product?.imagenes ?? []).slice(0, MAX_MEDIA);
  if (format === "carrusel" && media.length < MIN_CAROUSEL) {
    return { ok: false, reason: `Un carrusel necesita de ${MIN_CAROUSEL} a ${MAX_MEDIA} imágenes.` };
  }

  if (request.modo !== undefined && request.modo !== "api" && request.modo !== "manual") {
    return { ok: false, reason: "El modo debe ser api o manual." };
  }

  const reference = request.referencia === undefined ? null : text(request.referencia);
  if (reference !== null && !REFERENCE.test(reference)) return { ok: false, reason: "La referencia admite letras, números y . : _ - hasta 120 caracteres." };
  const origin = request.origen === undefined ? null : text(request.origen).toLowerCase();
  if (origin !== null && !ORIGIN.test(origin)) return { ok: false, reason: "El origen admite letras, números y guiones." };

  const date = request.fecha === undefined ? null : text(request.fecha);
  if (date !== null && !isDate(date)) return { ok: false, reason: "La fecha debe tener la forma AAAA-MM-DD." };
  if (date !== null && date < today) return { ok: false, reason: "La fecha deseada ya pasó." };

  const notes = text(request.notas);
  if (notes.length > MAX_NOTES) return { ok: false, reason: `Las notas admiten ${MAX_NOTES} caracteres.` };

  return {
    ok: true,
    account,
    format,
    title,
    manual: request.modo === "manual" || request.red === "tiktok",
    brief: { origen: origin, referencia: reference, producto: product, media, fecha: date, notas: notes || null },
  };
}
