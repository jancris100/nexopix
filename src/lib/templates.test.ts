import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRequest } from "./gatekeeper";
import { absoluteMedia, benefitsFrom, cleanColor, cleanCreative, creativePath, isCreativePath, templatesFor } from "./templates";

const accounts = [{ id: "a", handle: "@ticoexpresscr", network: "instagram" }];
const valid = { account: "@ticoexpresscr", network: "instagram", format: "post", goal: "Audífonos Pro" };

test("a request can ask for a template that draws its format", () => {
  const verdict = checkRequest({ ...valid, template: "offer", creative: { headline: "  Lanzamiento  ", cta: "Compra ya", showPrice: true } }, accounts);
  assert.ok(verdict.ok);
  assert.equal(verdict.brief.template, "offer");
  assert.deepEqual(verdict.brief.creative, { headline: "Lanzamiento", cta: "Compra ya", showPrice: true });
});

test("unknown templates and oversized creative are refused with their codes", () => {
  const code = (request: object) => {
    const verdict = checkRequest({ ...valid, ...request }, accounts);
    return verdict.ok ? "ok" : verdict.issue.code;
  };
  assert.equal(code({ template: "poster" }), "template_unknown");
  assert.equal(code({ format: "reel", template: "offer" }), "template_format");
  assert.equal(code({ creative: { headline: "x".repeat(61) } }), "creative_invalid");
  assert.equal(code({ creative: { showPrice: "yes" } }), "creative_invalid");
  assert.equal(code({ creative: { benefits: ["a", "b", "c", "d"] } }), "creative_invalid");
  assert.equal(code({ product: { name: "Audífonos", compareAtPrice: -5 } }), "product_compare_price");
});

test("helpers of the templates", () => {
  assert.deepEqual(cleanCreative(undefined), {});
  assert.equal(cleanColor("#0e7c66"), "#0E7C66");
  assert.equal(cleanColor("green"), null);
  assert.deepEqual(templatesFor("reel"), []);
  assert.ok(templatesFor("post").includes("offer"));
  assert.ok(isCreativePath(creativePath(12, 3)));
  assert.ok(!isCreativePath("https://cdn.test/a.jpg"));
  process.env.NEXOPIX_PUBLIC_URL = "https://nexopix.test";
  assert.deepEqual(absoluteMedia([creativePath(12, 3), "https://cdn.test/a.jpg"]), ["https://nexopix.test/api/creative/12/3.jpg", "https://cdn.test/a.jpg"]);
  delete process.env.NEXOPIX_PUBLIC_URL;
});

test("benefits come from the product description", () => {
  assert.deepEqual(benefitsFrom("Sonido envolvente con cancelación de ruido. Hasta 30 horas de batería.\n• Bluetooth 5.3"), [
    "Sonido envolvente con cancelación de ruido",
    "Hasta 30 horas de batería",
    "Bluetooth 5.3",
  ]);
  assert.deepEqual(benefitsFrom(null), []);
});
