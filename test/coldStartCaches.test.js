"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const usage = require("../src/services/playerUsage");
const matchup = require("../src/services/matchupService");
const { warmUp } = require("../src/services/coldStartWarmup");

const STATS_HEADER = "player_id,player_display_name,position,season,week,season_type,team,attempts,carries,receptions,targets,target_share";
const STATS_CSV = [STATS_HEADER, "00-1,A B,WR,2026,1,REG,CHI,0,0,5,6,0.2"].join("\n");
const PLAYERS_CSV = "gsis_id,pfr_id\n00-1,P1";

function csvResponse(text) { return { ok: true, status: 200, text: async () => text }; }

test("playerUsage: concurrent cold requests share one download", async () => {
  usage._resetCache();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return csvResponse(url.includes("players") ? PLAYERS_CSV : STATS_CSV);
  };
  await Promise.all([1, 2, 3].map(() => usage.warm({ season: 2026, fetchImpl, now: 1000 })));
  assert.equal(calls, 2); // stats and players.csv once each, however many callers
});

test("playerUsage: an expired entry is served stale while one background refresh runs", async () => {
  usage._resetCache();
  const DAY = 24 * 3600_000;
  let calls = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const fetchImpl = async (url) => {
    calls += 1;
    if (calls > 2) await gate;
    return csvResponse(url.includes("players") ? PLAYERS_CSV : STATS_CSV);
  };
  await usage.warm({ season: 2026, fetchImpl, now: 0 });
  assert.equal(calls, 2);
  const t0 = Date.now();
  await usage.warm({ season: 2026, fetchImpl, now: DAY }); // expired: returns without waiting for the gated refresh
  await usage.warm({ season: 2026, fetchImpl, now: DAY }); // refresh already running: no second one
  assert.ok(Date.now() - t0 < 500);
  assert.equal(calls, 4); // exactly one refresh per key
  release();
  await new Promise((r) => setTimeout(r, 10));
});

test("playerUsage: a failed first build rejects and is not remembered", async () => {
  usage._resetCache();
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error("down"); };
  await assert.rejects(() => usage.warm({ season: 2026, fetchImpl, now: 0 }), /down/);
  const before = calls;
  await assert.rejects(() => usage.warm({ season: 2026, fetchImpl, now: 1 }), /down/);
  assert.ok(calls > before);
});

function fakeCrosswalk(rows) {
  const calls = [];
  return {
    calls,
    from: () => ({
      select: () => ({
        eq: (_c, provider) => ({
          in: async (_c2, ids) => {
            calls.push({ provider, ids });
            return { data: rows.filter((r) => r.provider === provider && ids.includes(r.provider_player_id)), error: null };
          },
        }),
      }),
    }),
  };
}

test("resolveGsis: found ids are cached per process, misses still go to the database", async () => {
  usage._resetCache();
  const supabase = fakeCrosswalk([{ provider: "sleeper", provider_player_id: "1", players: { gsis_id: "00-1" } }]);
  const first = await usage.resolveGsis(supabase, ["sleeper:1", "sleeper:2"]);
  assert.deepEqual([...first], [["sleeper:1", "00-1"]]);
  const second = await usage.resolveGsis(supabase, ["sleeper:1", "sleeper:2"]);
  assert.deepEqual([...second], [["sleeper:1", "00-1"]]);
  assert.deepEqual(supabase.calls.map((c) => c.ids), [["1", "2"], ["2"]]);
  const third = await usage.resolveGsis(supabase, ["sleeper:1"]);
  assert.equal(third.get("sleeper:1"), "00-1");
  assert.equal(supabase.calls.length, 2, "an all-cached request makes no database call");
  const expired = await usage.resolveGsis(supabase, ["sleeper:1"], { now: Date.now() + 25 * 3600_000 });
  assert.equal(expired.get("sleeper:1"), "00-1");
  assert.equal(supabase.calls.length, 3, "an expired entry is re-read");
});

test("matchupService: the season file is downloaded once for all weeks, in one flight", async () => {
  matchup._resetCache();
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return csvResponse("player_id,position,season,week,season_type,opponent_team,fantasy_points_ppr");
  };
  try {
    await Promise.all([
      matchup.getDvpContext({ position: "WR", opponentTeam: "DAL", season: 2026, week: 5 }),
      matchup.getDvpContext({ position: "WR", opponentTeam: "DAL", season: 2026, week: 6 }),
    ]);
    await matchup.getDvpContext({ position: "RB", opponentTeam: "DAL", season: 2026, week: 9 });
    assert.equal(calls, 1);
  } finally {
    if (original) global.fetch = original; else delete global.fetch;
    matchup._resetCache();
  }
});

test("warmUp: never throws, logs each failed task once, and does not wait on slow loads to start", async () => {
  const warnings = [];
  const logger = { warn: (_msg, meta) => warnings.push(meta.task) };
  let finishSlow;
  const slowDone = new Promise((r) => { finishSlow = r; });
  const result = warmUp({
    logger,
    loaders: {
      boom: () => { throw new Error("sync"); },
      reject: async () => { throw new Error("async"); },
      ok: async () => {},
      slow: () => slowDone,
    },
  });
  assert.ok(result instanceof Promise);
  finishSlow();
  assert.deepEqual((await result).filter(Boolean).sort(), ["boom", "reject"]);
  assert.deepEqual(warnings.sort(), ["boom", "reject"]);
});
