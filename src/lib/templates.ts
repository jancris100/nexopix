import type { Format } from "./gatekeeper";

/**
 * Templates turn a product photo into an advert: the photo, a headline, the price and a call to action, in the colors
 * of the account. The layout and every word are drawn by code, never by an image model, so the price is always the
 * real one. Names and descriptions are in both languages; ids are the API codes.
 */
export const TEMPLATES = {
  offer: {
    name: { en: "Offer", es: "Oferta" },
    description: { en: "Big price, the old price struck through and a call to action.", es: "Precio grande, el precio anterior tachado y un llamado a comprar." },
    formats: ["post", "carousel", "story"],
  },
  launch: {
    name: { en: "Launch", es: "Lanzamiento" },
    description: { en: "A “New” badge, the product in the center and a short headline.", es: "Etiqueta de «Nuevo», el producto al centro y un titular corto." },
    formats: ["post", "carousel", "story"],
  },
  highlight: {
    name: { en: "Featured product", es: "Producto destacado" },
    description: { en: "Clean: the photo, the name and one benefit.", es: "Limpia: la foto, el nombre y un beneficio." },
    formats: ["post", "carousel", "story"],
  },
  benefits: {
    name: { en: "Benefits", es: "Beneficios" },
    description: { en: "The product with up to three benefits taken from its description.", es: "El producto con hasta tres beneficios sacados de su descripción." },
    formats: ["post", "carousel", "story"],
  },
} as const satisfies Record<string, { name: { en: string; es: string }; description: { en: string; es: string }; formats: Format[] }>;

export type TemplateId = keyof typeof TEMPLATES;

export const isTemplate = (value: unknown): value is TemplateId => typeof value === "string" && Object.hasOwn(TEMPLATES, value);

export const templatesFor = (format: string) => (Object.keys(TEMPLATES) as TemplateId[]).filter((id) => (TEMPLATES[id].formats as readonly string[]).includes(format));

/** What a template shows besides the product: all optional, all checked by the gatekeeper. */
export type Creative = {
  headline?: string;
  cta?: string;
  showPrice?: boolean;
  /** Up to three short benefits (the "benefits" template); taken from the product description when missing. */
  benefits?: string[];
};

export const CREATIVE_LIMITS = { headline: 60, cta: 24, benefit: 48, benefits: 3 } as const;

/** Cleans what came in; null when something does not fit. */
export function cleanCreative(value: unknown): Creative | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const text = (item: unknown) => (typeof item === "string" ? item.trim() : item === undefined ? "" : null) as string | null;
  const headline = text(raw.headline);
  const cta = text(raw.cta);
  if (headline === null || cta === null || headline.length > CREATIVE_LIMITS.headline || cta.length > CREATIVE_LIMITS.cta) return null;
  if (raw.showPrice !== undefined && typeof raw.showPrice !== "boolean") return null;
  let benefits: string[] | undefined;
  if (raw.benefits !== undefined) {
    if (!Array.isArray(raw.benefits) || raw.benefits.length > CREATIVE_LIMITS.benefits) return null;
    benefits = raw.benefits.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
    if (benefits.some((item) => item.length > CREATIVE_LIMITS.benefit)) return null;
  }
  return {
    ...(headline ? { headline } : {}),
    ...(cta ? { cta } : {}),
    ...(raw.showPrice !== undefined ? { showPrice: raw.showPrice as boolean } : {}),
    ...(benefits?.length ? { benefits } : {}),
  };
}

/** Where the drawn image of a version lives. Relative: the panel shows it as is, publishing makes it absolute. */
export const creativePath = (pieceId: number, version: number) => `/api/creative/${pieceId}/${version}.jpg`;
export const isCreativePath = (value: string) => /^\/api\/creative\/\d+\/\d+\.jpg$/.test(value);

/** The public address of this deployment, for Instagram to download the drawn images. */
export function publicBase() {
  if (process.env.NEXOPIX_PUBLIC_URL) return process.env.NEXOPIX_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://nexopix.vercel.app";
}

export const absoluteMedia = (media: string[]) => media.map((item) => (isCreativePath(item) ? `${publicBase()}${item}` : item));

/** A color as #RRGGBB, or null. */
export const cleanColor = (value: unknown) => (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim().toUpperCase() : null);

/** Benefits from a description: its list items or its sentences, short ones first. */
export function benefitsFrom(description: string | null | undefined) {
  if (!description) return [];
  return description
    .split(/[\n•·;]|(?<=\.)\s+/)
    .map((item) => item.replace(/^[-–*\s]+/, "").replace(/\.$/, "").trim())
    .filter((item) => item.length >= 6 && item.length <= CREATIVE_LIMITS.benefit)
    .slice(0, CREATIVE_LIMITS.benefits);
}
