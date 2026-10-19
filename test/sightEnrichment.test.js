"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSightEnricher, collectPlayers } = require("../src/services/sightEnrichment");
const { createWarehouseSightRepository, parseRef } = require("../src/services/footballWarehouse/sightRepository");

const block = { version: "v1", position: "WR", grade: 71, sight_points: 14.2 };
const receipt = { version: "forecast-authority.v1", state: "omen_leads", position: "WR", omen_mae: 3.5 };
const runtime = (calls = []) => ({
  mode: "warehouse",
  sightRepository: {
    readSight: async (args) => {
      calls.push(args);
      return new Map([["sleeper:4046", block]]);
    },
    readAuthority: async (args) => {
      calls.push(args);
      return new Map([["WR", receipt]]);
    },
  },
});

test("with the switch off nothing changes and nothing is read", async () => {
  const calls = [];
  const payload = { recommendation: { primary_player: { player_key: "sleeper:4046" } } };
  await createSightEnricher({ getRuntime: () => runtime(calls), env: {} })(payload);
  assert.equal(payload.recommendation.primary_player.sight, undefined);
  assert.equal(calls.length, 0);
});

test("with the switch on every player anywhere in the response gets Sight, in one read, for the chosen version", async () => {
  const calls = [];
  const payload = {
    candidates: [{ give: { player_key: "sleeper:4046" }, receive: { player_key: "espn:1" } }],
    teams: [{ players: [{ player_key: "sleeper:4046" }] }],
  };
  await createSightEnricher({ getRuntime: () => runtime(calls), env: { SIGHT_ENABLED: "true", SIGHT_VERSION: "v2" } })(
    payload,
  );
  assert.deepEqual(payload.candidates[0].give.sight, { ...block, authority: receipt, crosswind: null });
  assert.equal(payload.candidates[0].receive.sight, undefined, "no Sight read means no block, never a guess");
  assert.deepEqual(payload.teams[0].players[0].sight, { ...block, authority: receipt, crosswind: null });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].version, "v2");
  assert.deepEqual(calls[0].playerKeys.sort(), ["espn:1", "sleeper:4046"]);
  assert.deepEqual(calls[1].positions, ["QB", "RB", "WR", "TE", "K", "DEF"]);
});

test("a Crosswind is server-owned and requires a gap beyond evaluated Omen error plus real drivers", async () => {
  const payload = { player: { player_key: "sleeper:4046", position: "WR", projected_points: 9.1 } };
  const driven = { ...block, drivers: [{ name: "target_share", points: 1.2 }] };
  const sightRepository = {
    readSight: async () => new Map([["sleeper:4046", driven]]),
    readAuthority: async () => new Map([["WR", receipt]]),
  };
  await createSightEnricher({
    getRuntime: () => ({ mode: "warehouse", sightRepository }),
    env: { SIGHT_ENABLED: "true" },
  })(payload);
  assert.deepEqual(payload.player.sight.crosswind, {
    gap_points: 5.1,
    threshold_points: 3.5,
    drivers: driven.drivers,
  });
});

test("a warehouse failure leaves the response as it was", async () => {
  const payload = { players: [{ player_key: "sleeper:4046" }] };
  const broken = {
    mode: "warehouse",
    sightRepository: {
      readSight: async () => {
        throw new Error("down");
      },
    },
  };
  await createSightEnricher({ getRuntime: () => broken, env: { SIGHT_ENABLED: "true" } })(payload);
  assert.equal(payload.players[0].sight, undefined);
});

test("player keys resolve to the index's ids, including Yahoo's numeric id", () => {
  assert.deepEqual(parseRef("yahoo:470.p.30123"), { key: "yahoo:470.p.30123", provider: "yahoo", providerId: "30123" });
  assert.deepEqual(parseRef("espn:4262921"), { key: "espn:4262921", provider: "espn", providerId: "4262921" });
  assert.equal(parseRef("omen:player:x"), null);
  assert.equal(collectPlayers({ a: [{ player_key: "sleeper:1" }, { id: "espn:2" }, { name: "x" }] }).length, 2);
});

test("warehouse authority reads return a season-bounded, same-player receipt", async () => {
  const calls = [];
  const query = async (request) => {
    calls.push(request);
    return {
      rows: [
        {
          season: 2026,
          week: 4,
          finished_at: "2026-10-10T00:00:00Z",
          summary: { positions: { WR: { provider: { n: 30, mae: 4.9, sight_mae_same_players: 4.1 } } } },
        },
        {
          season: 2026,
          week: 5,
          finished_at: "2026-10-15T00:00:00Z",
          summary: { positions: { WR: { provider: { n: 30, mae: 4.8, sight_mae_same_players: 4.2 } } } },
        },
      ],
    };
  };
  const repository = createWarehouseSightRepository({ query });
  const reads = await repository.readAuthority({
    positions: ["WR", "bogus"],
    version: "v2",
    now: new Date("2026-10-16T00:00:00Z"),
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /SELECT season, week/);
  assert.match(calls[0].text, /latest_season/);
  assert.deepEqual(calls[0].values, ["v2"]);
  assert.equal(reads.get("WR").state, "omen_leads");
  assert.equal(reads.get("WR").season_start, 2026);
  assert.equal(reads.get("WR").season_end, 2026);
  assert.equal(reads.has("BOGUS"), false);
});

test("compact Sight keeps only what a list row draws", async () => {
  const { createSightEnricher } = require("../src/services/sightEnrichment");
  const repo = {
    readSight: async () =>
      new Map([
        [
          "sleeper:1",
          {
            version: "v2",
            position: "RB",
            sight_points: 12.3,
            grade: 71,
            confidence: "high",
            drivers: [{ name: "role", points: 1 }],
          },
        ],
      ]),
    readAuthority: async () => new Map([["RB", { state: "omen_leads", omen_mae: 4 }]]),
  };
  const attach = createSightEnricher({
    getRuntime: () => ({ mode: "warehouse", sightRepository: repo }),
    env: { SIGHT_ENABLED: "true", SIGHT_VERSION: "v2" },
  });
  const payload = { players: [{ player_key: "sleeper:1", name: "A", position: "RB", projected_points: 10 }] };
  await attach(payload, { compact: true });
  const sight = payload.players[0].sight;
  assert.equal(sight.sight_points, 12.3);
  assert.equal(sight.grade, 71);
  assert.equal(sight.authority, undefined, "no receipt on a list row");
  assert.equal(sight.drivers, undefined);
});
