/** Instagram names: letters, digits, dot and underscore, up to 30. Facebook pages: free text up to 80. */
export function normalizeHandle(network: string, value: string) {
  const text = value.trim();
  if (network === "instagram") {
    const name = text.replace(/^@/, "").toLowerCase();
    return /^[a-z0-9._]{1,30}$/.test(name) ? `@${name}` : null;
  }
  if (network === "facebook") {
    return text.length >= 2 && text.length <= 80 ? text : null;
  }
  return null;
}
