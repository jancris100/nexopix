/** The panel's session works in the middleware (edge) and on the server: Web Crypto only. */
export const SESSION_COOKIE = "np_session";

export const panelPassword = () => process.env.NEXOPIX_PANEL_PASSWORD ?? "";

/** With a password, the panel asks for it. Without one it stays open, as a demo with nothing real in it. */
export const isProtected = () => panelPassword().length > 0;

export async function sessionValue() {
  const signing = process.env.NEXOPIX_SECRET || panelPassword();
  const keyData = new TextEncoder().encode(signing);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`panel:${panelPassword()}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hasSession(cookie: string | undefined) {
  if (!isProtected()) return true;
  if (!cookie) return false;
  const expected = await sessionValue();
  if (cookie.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= cookie.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
