"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSightEnricher, collectPlayers } = require("../src/services/sightEnrichment");
const { parseRef } = require("../src/services/footballWarehouse/sightRepository");

const block = { version: "v1", grade: 71, sight_points: 14.2 };
const runtime = (calls = []) => ({ mode: "warehouse", sightRepository: { readSight: async (args) => { calls.push(args); return new Map([["sleeper:4046", block]]); } } });

test("with the switch off nothing changes and nothing is read", async () => {
  const calls = [];
  const payload = { recommendation: { primary_player: { player_key: "sleeper:4046" } } };
  await createSightEnricher({ getRuntime: () => runtime(calls), env: {} })(payload);
  assert.equal(payload.recommendation.primary_player.sight, undefined);
  assert.equal(calls.length, 0);
});

test("with the switch on every player anywhere in the response gets Sight, in one read, for the chosen version", async () => {
  const calls = [];
  const payload = { candidates: [{ give: { player_key: "sleeper:4046" }, receive: { player_key: "espn:1" } }], teams: [{ players: [{ player_key: "sleeper:4046" }] }] };
  await createSightEnricher({ getRuntime: () => runtime(calls), env: { SIGHT_ENABLED: "true", SIGHT_VERSION: "v2" } })(payload);
  assert.deepEqual(payload.candidates[0].give.sight, block);
  assert.equal(payload.candidates[0].receive.sight, undefined, "no Sight read means no block, never a guess");
  assert.deepEqual(payload.teams[0].players[0].sight, block);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].version, "v2");
  assert.deepEqual(calls[0].playerKeys.sort(), ["espn:1", "sleeper:4046"]);
});

test("a warehouse failure leaves the response as it was", async () => {
  const payload = { players: [{ player_key: "sleeper:4046" }] };
  const broken = { mode: "warehouse", sightRepository: { readSight: async () => { throw new Error("down"); } } };
  await createSightEnricher({ getRuntime: () => broken, env: { SIGHT_ENABLED: "true" } })(payload);
  assert.equal(payload.players[0].sight, undefined);
});

test("player keys resolve to the index's ids, including Yahoo's numeric id", () => {
  assert.deepEqual(parseRef("yahoo:470.p.30123"), { key: "yahoo:470.p.30123", provider: "yahoo", providerId: "30123" });
  assert.deepEqual(parseRef("espn:4262921"), { key: "espn:4262921", provider: "espn", providerId: "4262921" });
  assert.equal(parseRef("omen:player:x"), null);
  assert.equal(collectPlayers({ a: [{ player_key: "sleeper:1" }, { id: "espn:2" }, { name: "x" }] }).length, 2);
});
