import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeUrl } from "./instagram";
import { decrypt, encrypt, sameText } from "./secure";
import { normalizeHandle } from "./handles";

test("tokens are encrypted and only the same key opens them", () => {
  process.env.NEXOPIX_SECRET = "a".repeat(40);
  const sealed = encrypt("IGQV-token-de-prueba");
  assert.notEqual(sealed, encrypt("IGQV-token-de-prueba"));
  assert.ok(!sealed.includes("IGQV"));
  assert.equal(decrypt(sealed), "IGQV-token-de-prueba");
  const tampered = sealed.slice(0, -2) + (sealed.endsWith("AA") ? "BB" : "AA");
  assert.throws(() => decrypt(tampered));
  process.env.NEXOPIX_SECRET = "b".repeat(40);
  assert.throws(() => decrypt(sealed));
  assert.ok(sameText("x", "x") && !sameText("x", "y"));
});

test("the authorization uses the login configuration and comes back here", () => {
  const url = new URL(authorizeUrl({ appId: "123", configId: "456" }, "https://nexopix.vercel.app", "estado"));
  assert.equal(url.origin + url.pathname, "https://www.facebook.com/dialog/oauth");
  assert.equal(url.searchParams.get("client_id"), "123");
  assert.equal(url.searchParams.get("config_id"), "456");
  assert.equal(url.searchParams.get("redirect_uri"), "https://nexopix.vercel.app/api/meta/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), null);
  assert.equal(url.searchParams.get("state"), "estado");
});

test("account names follow the network's rules", () => {
  assert.equal(normalizeHandle("instagram", " @Tico.Express_cr "), "@tico.express_cr");
  assert.equal(normalizeHandle("instagram", "con espacios"), null);
  assert.equal(normalizeHandle("instagram", "x".repeat(31)), null);
  assert.equal(normalizeHandle("facebook", "Página de INTENEXO"), "Página de INTENEXO");
  assert.equal(normalizeHandle("facebook", " "), null);
  assert.equal(normalizeHandle("tiktok", "@algo"), null);
});
