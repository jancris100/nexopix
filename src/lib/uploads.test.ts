import assert from "node:assert/strict";
import { test } from "node:test";
import { reelParams } from "./instagram";
import { expiredMedia } from "./cleanup";
import { planUpload, slugOf } from "./uploads";

const now = new Date("2026-11-19T15:00:00Z");

test("an MP4 reel gets an unguessable path of its month and the size limit of its type", () => {
  const plan = planUpload({ filename: "Reel 01 – ¿Tu celular escucha?.mp4", contentType: "video/mp4", size: 18_000_000 }, now, "a1b2c3");
  assert.deepEqual(plan, { ok: true, pathname: "media/2026-11/a1b2c3-reel-01-tu-celular-escucha.mp4", contentType: "video/mp4", maximumSizeInBytes: 300 * 1024 * 1024 });
});

test("only MP4, JPEG and PNG of their size are uploaded", () => {
  assert.deepEqual(planUpload({ filename: "x.gif", contentType: "image/gif", size: 10 }, now), { ok: false, code: "upload_type" });
  assert.deepEqual(planUpload({ filename: "portada.jpg", contentType: "image/jpeg", size: 9 * 1024 * 1024 }, now), { ok: false, code: "upload_size", params: { max: 8 } });
  assert.deepEqual(planUpload({ filename: "", contentType: "video/mp4", size: 10 }, now), { ok: false, code: "upload_name" });
  assert.deepEqual(planUpload({ filename: "a.mp4", contentType: "video/mp4", size: 0 }, now), { ok: false, code: "upload_name" });
  assert.deepEqual(planUpload({ filename: "a.mp4", contentType: "video/mp4", size: "10" }, now), { ok: false, code: "upload_name" });
});

test("names become safe slugs", () => {
  assert.equal(slugOf("Portada Final (v2).JPG"), "portada-final-v2");
  assert.equal(slugOf("../../etc/passwd"), "etc-passwd");
  assert.equal(planUpload({ filename: "¿?.png", contentType: "image/png", size: 5 }, now, "ff").ok && "ok", "ok");
});

test("a reel carries its designed cover when the piece has one", () => {
  const withCover = reelParams(["https://store.test/r.mp4", "https://store.test/portada.jpg"], "Hola");
  assert.equal(withCover.video_url, "https://store.test/r.mp4");
  assert.equal(withCover.cover_url, "https://store.test/portada.jpg");
  assert.equal(withCover.share_to_feed, "true");
  assert.equal("cover_url" in reelParams(["https://store.test/r.mp4"], "Hola"), false);
  assert.throws(() => reelParams(["https://store.test/portada.jpg"], "Hola"), /MP4/);
});

test("uploads are deleted after 7 days, except the ones a piece still needs", () => {
  const day = 24 * 60 * 60 * 1000;
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * day);
  const blob = (name: string, daysAgo: number) => ({ url: `https://store.test/${name}`, pathname: name, uploadedAt: at(daysAgo) });
  const blobs = [
    blob("media/2026-11/a-reel-viejo.mp4", 8),
    blob("media/2026-11/b-portada-vieja.jpg", 7.5),
    blob("media/2026-11/c-reel-programado.mp4", 20),
    blob("media/2026-11/d-reel-nuevo.mp4", 2),
    blob("logos/marca.png", 90),
  ];
  const inUse = new Set(["https://store.test/media/2026-11/c-reel-programado.mp4"]);
  assert.deepEqual(expiredMedia(blobs, inUse, now), ["https://store.test/media/2026-11/a-reel-viejo.mp4", "https://store.test/media/2026-11/b-portada-vieja.jpg"]);
});
