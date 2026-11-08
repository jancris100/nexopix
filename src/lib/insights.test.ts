import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaryFor } from "../i18n/dictionaries";
import { summaryFacts, trackedLink } from "./insights";

test("marks each link with where it came from", () => {
  const link = new URL(trackedLink("https://intenexo.com/precios?plan=1", "instagram", { id: 7, pipeline: "reels" })!);
  assert.equal(link.searchParams.get("utm_source"), "instagram");
  assert.equal(link.searchParams.get("utm_medium"), "social");
  assert.equal(link.searchParams.get("utm_campaign"), "piece-7");
  assert.equal(link.searchParams.get("plan"), "1");
  assert.match(trackedLink("https://a.test", "facebook", { id: 1, pipeline: "ads" })!, /utm_medium=paid/);
  assert.equal(trackedLink("", "instagram", { id: 1, pipeline: "reels" }), null);
});

test("the summary only counts what happened, in both languages", () => {
  const pieces = [
    { id: 1, title: "Reel A", stage: 4, pipeline: "reels" },
    { id: 2, title: "Reel B", stage: 4, pipeline: "reels" },
    { id: 3, title: "Reel C", stage: 2, pipeline: "reels" },
  ];
  const facts = summaryFacts(pieces, [{ pieceId: 1, clicks: 10, leads: 0 }, { pieceId: 2, clicks: 3, leads: 2 }], 1);
  assert.deepEqual(facts, { published: 2, clicks: 13, leads: 2, best: "Reel B", toApprove: 1, pendingToday: 1 });
  const es = dictionaryFor("es").results.summary;
  assert.equal(es.published(facts.published, facts.clicks, facts.leads), "2 piezas publicadas, con 13 clics y 2 consultas.");
  assert.equal(es.today(1), "Hoy queda 1 tarea en la agenda.");
  const en = dictionaryFor("en").results.summary;
  assert.equal(en.published(facts.published, facts.clicks, facts.leads), "2 pieces published, with 13 clicks and 2 leads.");
  assert.equal(en.toApprove(1), "You have 1 piece to approve.");
});

test("an empty start says so", () => {
  const facts = summaryFacts([], [], 0);
  assert.equal(facts.best, null);
  assert.equal(dictionaryFor("es").results.summary.toApprove(facts.toApprove), "No tienes nada por aprobar.");
});

test("weeks count from the first week with publications", async () => {
  const { weekNumber, weekRange, mondayOf } = await import("./dates");
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
  assert.equal(weekNumber("2026-11-02", "2026-11-02"), 1);
  assert.equal(weekNumber("2026-11-02", "2026-11-16"), 3);
  assert.equal(weekRange("2026-11-02"), "2 al 8 nov");
  assert.equal(weekRange("2026-12-28"), "28 dic al 3 ene");
  assert.equal(weekRange("2026-11-02", "en"), "Nov 2 to 8");
});

test("both dictionaries have the same texts", async () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
      : [prefix];
  assert.deepEqual(keys(dictionaryFor("en")).sort(), keys(dictionaryFor("es")).sort());
});
