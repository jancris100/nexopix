import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanContent, fullCaption, isVideo, normalizeHashtags } from "./content";

test("hashtags are written however and come out clean, once each", () => {
  assert.equal(normalizeHashtags(" #promo, navidad ##promo   jugos"), "#promo #navidad #jugos");
  assert.equal(normalizeHashtags(""), "");
});

test("the caption goes with its hashtags after a blank line", () => {
  assert.equal(fullCaption({ caption: "Jugo en 10 segundos.", hashtags: "#jugo #navidad" }), "Jugo en 10 segundos.\n\n#jugo #navidad");
  assert.equal(fullCaption({ caption: "Solo texto", hashtags: "" }), "Solo texto");
});

test("content follows Instagram's limits and only takes public https files", () => {
  const ok = cleanContent({ idea: " Idea ", caption: " Texto ", hashtags: "a b", media: [" https://cdn.test/1.jpg ", ""] });
  assert.deepEqual(ok, { content: { idea: "Idea", caption: "Texto", hashtags: "#a #b", media: ["https://cdn.test/1.jpg"] } });
  assert.deepEqual(cleanContent({ caption: "x".repeat(2201) }), { issue: "caption_too_long" });
  assert.deepEqual(cleanContent({ hashtags: Array.from({ length: 31 }, (_, i) => `t${i}`).join(" ") }), { issue: "too_many_hashtags" });
  assert.deepEqual(cleanContent({ media: ["http://cdn.test/1.jpg"] }), { issue: "media_not_https" });
  assert.deepEqual(cleanContent({ media: Array.from({ length: 11 }, (_, i) => `https://cdn.test/${i}.jpg`) }), { issue: "too_many_media" });
});

test("videos are told apart by their extension", () => {
  assert.ok(isVideo("https://cdn.test/a.mp4"));
  assert.ok(isVideo("https://cdn.test/a.MOV?x=1"));
  assert.ok(!isVideo("https://cdn.test/a.jpg"));
});
