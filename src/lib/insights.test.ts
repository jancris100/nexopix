import assert from "node:assert/strict";
import { test } from "node:test";
import { morningSummary, trackedLink } from "./insights";

test("marks each link with where it came from", () => {
  const link = new URL(trackedLink("https://intenexo.com/precios?plan=1", "instagram", { id: 7, pipeline: "reels" })!);
  assert.equal(link.searchParams.get("utm_source"), "instagram");
  assert.equal(link.searchParams.get("utm_medium"), "social");
  assert.equal(link.searchParams.get("utm_campaign"), "pieza-7");
  assert.equal(link.searchParams.get("plan"), "1");
  assert.match(trackedLink("https://a.test", "facebook", { id: 1, pipeline: "ads" })!, /utm_medium=paid/);
  assert.equal(trackedLink("", "instagram", { id: 1, pipeline: "reels" }), null);
});

test("the summary only counts what happened", () => {
  const pieces = [
    { id: 1, title: "Reel A", stage: 4, pipeline: "reels" },
    { id: 2, title: "Reel B", stage: 4, pipeline: "reels" },
    { id: 3, title: "Reel C", stage: 2, pipeline: "reels" },
  ];
  const lines = morningSummary(pieces, [{ pieceId: 1, clicks: 10, leads: 0 }, { pieceId: 2, clicks: 3, leads: 2 }], 1);
  assert.deepEqual(lines, [
    "2 piezas publicadas, con 13 clics y 2 consultas.",
    "La que más consultas trajo: Reel B.",
    "Tienes 1 pieza por aprobar.",
    "Hoy queda 1 tarea en la agenda.",
  ]);
});

test("an empty start says so", () => {
  const lines = morningSummary([], [], 0);
  assert.equal(lines[1], "Todavía ninguna pieza trajo consultas.");
  assert.equal(lines[2], "No tienes nada por aprobar.");
});
