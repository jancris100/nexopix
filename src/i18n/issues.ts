import type { Issue, IssueCode } from "../lib/gatekeeper";
import type { Locale } from "./locale";

/** Errors of the API itself, before the Portero looks at a request. */
export type ApiErrorCode = "api_disabled" | "invalid_key" | "body_not_json" | "not_found" | "reference_missing" | "id_invalid";

type Params = Record<string, string | number>;
type Messages = Record<IssueCode | ApiErrorCode, (params: Params) => string>;

const en: Messages = {
  goal_missing: () => "Write what you want to publish.",
  goal_too_long: (p) => `The goal allows up to ${p.max} characters.`,
  account_unknown: () => "That account is not registered.",
  network_unavailable: () => "That network is not available.",
  account_network_mismatch: (p) => `${p.account} is not a ${p.network} account.`,
  format_not_allowed: (p) => `${p.network} does not accept the format ${p.format}.`,
  media_invalid: () => "media must be a list of addresses.",
  media_too_many: (p) => `Up to ${p.max} files are allowed.`,
  media_not_https: () => "Each file must be a public https address.",
  carousel_media_count: (p) => `A carousel needs ${p.min} to ${p.max} images.`,
  product_invalid: () => "product must be an object.",
  product_name: (p) => `The product needs a name of 2 to ${p.max} characters.`,
  product_price: () => "The price must be a number of zero or more.",
  product_currency: () => "The currency must be a 3-letter code, such as CRC or USD.",
  product_description_too_long: (p) => `The description allows up to ${p.max} characters.`,
  product_url: () => "The product url must be an https address.",
  product_images: (p) => `The product images must be up to ${p.max} public https addresses.`,
  mode_invalid: () => "mode must be auto or manual.",
  reference_invalid: (p) => `The reference allows letters, numbers and . : _ - up to ${p.max} characters.`,
  source_invalid: (p) => `The source allows lowercase letters, numbers and hyphens, up to ${p.max} characters.`,
  date_invalid: () => "The date must look like YYYY-MM-DD.",
  date_past: () => "The requested date has already passed.",
  notes_too_long: (p) => `Notes allow up to ${p.max} characters.`,
  api_disabled: () => "The API is not enabled yet.",
  invalid_key: () => "Invalid key.",
  body_not_json: () => "The body must be a JSON object.",
  not_found: () => "That request does not exist.",
  reference_missing: () => "The reference is missing.",
  id_invalid: () => "That request does not exist.",
};

const es: Messages = {
  goal_missing: () => "Escribe qué quieres publicar.",
  goal_too_long: (p) => `El objetivo admite hasta ${p.max} caracteres.`,
  account_unknown: () => "Esa cuenta no está registrada.",
  network_unavailable: () => "Esa red no está disponible.",
  account_network_mismatch: (p) => `${p.account} no es una cuenta de ${p.network}.`,
  format_not_allowed: (p) => `${p.network} no admite el formato ${p.format}.`,
  media_invalid: () => "media debe ser una lista de direcciones.",
  media_too_many: (p) => `Se admiten hasta ${p.max} archivos.`,
  media_not_https: () => "Cada archivo debe ser una dirección https pública.",
  carousel_media_count: (p) => `Un carrusel necesita de ${p.min} a ${p.max} imágenes.`,
  product_invalid: () => "product debe ser un objeto.",
  product_name: (p) => `El producto necesita un nombre de 2 a ${p.max} caracteres.`,
  product_price: () => "El precio debe ser un número de cero o más.",
  product_currency: () => "La moneda debe ser un código de 3 letras, como CRC o USD.",
  product_description_too_long: (p) => `La descripción admite hasta ${p.max} caracteres.`,
  product_url: () => "El enlace del producto debe ser una dirección https.",
  product_images: (p) => `Las imágenes del producto deben ser hasta ${p.max} direcciones https públicas.`,
  mode_invalid: () => "mode debe ser auto o manual.",
  reference_invalid: (p) => `La referencia admite letras, números y . : _ - hasta ${p.max} caracteres.`,
  source_invalid: (p) => `El origen admite minúsculas, números y guiones, hasta ${p.max} caracteres.`,
  date_invalid: () => "La fecha debe tener la forma AAAA-MM-DD.",
  date_past: () => "La fecha deseada ya pasó.",
  notes_too_long: (p) => `Las notas admiten hasta ${p.max} caracteres.`,
  api_disabled: () => "La API todavía no está habilitada.",
  invalid_key: () => "Clave no válida.",
  body_not_json: () => "El cuerpo debe ser un objeto JSON.",
  not_found: () => "No existe esa petición.",
  reference_missing: () => "Falta la referencia.",
  id_invalid: () => "No existe esa petición.",
};

export const ISSUE_MESSAGES: Record<Locale, Messages> = { en, es };

export const issueMessage = (issue: Issue | { code: ApiErrorCode; params?: Params }, locale: Locale) =>
  ISSUE_MESSAGES[locale][issue.code](issue.params ?? {});
