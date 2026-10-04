"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const startSit = require("../src/routes/startSit");

const loser = { name: "Josh Allen", position: "QB", projected_points: 18.2, status: null };
const winner = { name: "Tyreek Hill", position: "WR", projected_points: 21.7, status: "questionable" };
const args = { loser, winner, pointsDelta: 3.5, slot: "WR" };
const FALLBACK = startSit.deterministicExplanation(args);

const stub = (fn) => ({ explainStartSit: fn });

test("deterministic start/sit explanation is built only from request facts", () => {
  assert.equal(
    FALLBACK,
    "Tyreek Hill (questionable) is projected for 21.7 pts against 18.2 for Josh Allen, a 3.5-point edge."
  );
});

test("grounded model rephrase is used", async () => {
  const text = "Tyreek Hill is projected 3.5 points ahead of Josh Allen.";
  assert.equal(await startSit.explainSafely(args, { llmService: stub(async () => text) }), text);
});

test("ungrounded or banned model output falls back to the deterministic text", async () => {
  for (const bad of [
    "Hill has a huge target share this week.",
    "Tyreek Hill is a guaranteed start over Mahomes.",
    "Tyreek Hill should score 25 points.",
    "Omen predicts Tyreek Hill beats the projections.",
    "Tyreek Hill is ahead. Josh Allen is behind. Start Tyreek Hill.",
    `Tyreek Hill ${"is ahead ".repeat(60)}`,
    "",
    null,
  ]) {
    assert.equal(await startSit.explainSafely(args, { llmService: stub(async () => bad) }), FALLBACK, String(bad));
  }
});

test("model error or sync throw falls back to the deterministic text", async () => {
  assert.equal(await startSit.explainSafely(args, { llmService: stub(async () => { throw new Error("down"); }) }), FALLBACK);
  assert.equal(await startSit.explainSafely(args, { llmService: stub(() => { throw new Error("sync"); }) }), FALLBACK);
});

test("a hung model call falls back at the timeout bound", async () => {
  const started = Date.now();
  const text = await startSit.explainSafely(args, {
    timeoutMs: 40,
    llmService: stub(() => new Promise(() => {})),
  });
  assert.equal(text, FALLBACK);
  assert.ok(Date.now() - started < 1000);
});

test("route always returns a string explanation even with no model bridge", async () => {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/start-sit", startSit);
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/start-sit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerA: { name: "Josh Allen", position: "QB", projected_points: 18.2 },
        playerB: { name: "Tyreek Hill", position: "WR", projected_points: 21.7 },
      }),
    });
    const body = await res.json();
    assert.equal(typeof body.explanation, "string");
    assert.match(body.explanation, /Tyreek Hill is projected for 21.7 pts/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
