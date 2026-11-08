import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Key for the tokens of the networks: NEXOPIX_SECRET, never stored next to the data. */
function key() {
  const secret = process.env.NEXOPIX_SECRET;
  if (!secret || secret.length < 32) throw new Error("NEXOPIX_SECRET debe tener al menos 32 caracteres.");
  return createHash("sha256").update(secret).digest();
}

export const canEncrypt = () => (process.env.NEXOPIX_SECRET ?? "").length >= 32;

/** AES-256-GCM: version, nonce, tag and text, all in one value. */
export function encrypt(text: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(value: string) {
  const [version, nonce, tag, body] = value.split(".");
  if (version !== "v1" || !nonce || !tag || !body) throw new Error("Invalid encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export const randomToken = () => randomBytes(24).toString("base64url");

/** Compares two texts in constant time. */
export function sameText(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
