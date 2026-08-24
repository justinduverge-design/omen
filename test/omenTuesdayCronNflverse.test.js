"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { fetchNFLScores, fetchPendingMoves, isDeferredScores, isDryRun, nflverseScoresFromCsv, runScoring, scoreMove } = require("../src/omen_tuesday_cron");

test("nflverseScoresFromCsv maps one stored season/week into all scoring formats", () => {
  const scores = nflverseScoresFromCsv([
    "player_name,season,week,season_type,fantasy_points,fantasy_points_ppr",
    "Amon-Ra St. Brown,2025,7,REG,14.5,19.5",
    "Other Week,2025,8,REG,20,25",
  ].join("\n"), { season: 2025, weekNum: 7 });

  assert.deepEqual(scores.amonra_st_brown, {
    name: "Amon-Ra St. Brown",
    rec_std: 14.5,
    rec_half: 17,
    rec_ppr: 19.5,
  });
  assert.equal(scores.other_week, undefined);
});

test("nflverseScoresFromCsv keeps regular-season rows apart from same-numbered preseason and postseason rows", () => {
  const csv = [
    "player_name,season,week,season_type,fantasy_points,fantasy_points_ppr",
    "Collision Runner,2026,1,PRE,30,35",
    "Collision Runner,2026,1,REG,10,12",
  ].join("\n");

  const regular = nflverseScoresFromCsv(csv, { season: 2026, weekNum: 1 });
  assert.equal(regular.collision_runner.rec_ppr, 12, "week 1 must resolve to the REG row, not the PRE row");

  const preseason = nflverseScoresFromCsv(csv, { season: 2026, weekNum: 1, seasonType: "PRE" });
  assert.equal(preseason.collision_runner.rec_ppr, 35, "an explicit PRE request still resolves the PRE row");
});

test("nflverseScoresFromCsv fails closed when the upstream schema drops season_type", () => {
  assert.throws(
    () => nflverseScoresFromCsv([
      "player_name,season,week,fantasy_points,fantasy_points_ppr",
      "Unfilterable Runner,2025,7,14.5,19.5",
    ].join("\n"), { season: 2025, weekNum: 7 }),
    /missing required scoring columns/,
  );
});

test("isDryRun is true only for the explicit no-write flag", () => {
  assert.equal(isDryRun({ OMEN_CRON_DRY_RUN: "true" }), true);
  assert.equal(isDryRun({ OMEN_CRON_DRY_RUN: "false" }), false);
  assert.equal(isDryRun({}), false);
});

test("fetchPendingMoves requests only the fields Tuesday scoring consumes", async () => {
  let requestedColumns = null;
  const query = {
    eq: () => query,
    lt: () => query,
    order: async () => ({ data: [], error: null }),
  };
  const moves = await fetchPendingMoves({
    from: () => ({
      select: (columns) => {
        requestedColumns = columns;
        return query;
      },
    }),
  }, new Date("2026-08-02T12:00:00.000Z"));

  assert.deepEqual(moves, []);
  assert.equal(requestedColumns, "id, week_num, season, headline, confidence, target_player, scoring, outcome, followed, created_at");
});

test("scoreMove grades standard, half-PPR, and PPR recommendations against distinct totals", () => {
  const playerScores = {
    format_receiver: {
      name: "Format Receiver",
      rec_std: 10,
      rec_half: 13,
      rec_ppr: 16,
    },
  };
  const base = { target_player: "Format Receiver", confidence: 80 };

  const standard = scoreMove({ ...base, scoring: "Standard" }, playerScores);
  const half = scoreMove({ ...base, scoring: "Half PPR" }, playerScores);
  const ppr = scoreMove({ ...base, scoring: "PPR" }, playerScores);

  assert.deepEqual(
    [standard.outcome, half.outcome, ppr.outcome],
    ["loss", "win", "win"],
  );
  assert.deepEqual([standard.eff, half.eff, ppr.eff], [15, 65, 75]);
  assert.match(standard.result, /10\.0 fantasy points \(Standard\)/);
  assert.match(half.result, /13\.0 fantasy points \(Half PPR\)/);
  assert.match(ppr.result, /16\.0 fantasy points \(PPR\)/);
});

test("scoreMove reserves PPR fallback for historical rows with no scoring value", () => {
  const result = scoreMove(
    { target_player: "Historical Receiver", confidence: 60 },
    { historical_receiver: { name: "Historical Receiver", rec_std: 10, rec_half: 13, rec_ppr: 16 } },
  );

  assert.match(result.result, /16\.0 fantasy points \(PPR\)/);
  assert.throws(
    () => scoreMove(
      { target_player: "Historical Receiver", confidence: 60, scoring: "custom" },
      { historical_receiver: { name: "Historical Receiver", rec_std: 10, rec_half: 13, rec_ppr: 16 } },
    ),
    /Unsupported persisted scoring format/,
  );
});

test("fetchNFLScores reads the public nflverse season CSV without a provider key", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = null;
  global.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      text: async () => [
        "player_name,season,week,season_type,fantasy_points,fantasy_points_ppr",
        "Public Runner,2025,3,REG,10,12",
      ].join("\n"),
    };
  };

  try {
    const scores = await fetchNFLScores({ season: 2025, weekNum: 3 });
    // Guards the 2026-08-15 repair: the retired `player_stats` tag 404s for every
    // season from 2025 on, and a 404 is now silently deferred rather than raised.
    assert.match(
      requestedUrl,
      /nflverse-data\/releases\/download\/stats_player\/stats_player_week_2025\.csv$/,
    );
    assert.doesNotMatch(requestedUrl, /\/player_stats\//);
    assert.equal(scores.public_runner.rec_ppr, 12);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runScoring groups reads by each move's stored season/week and dry-run never writes", async () => {
  const calls = { archive: 0, score: 0, fetches: [] };
  const result = await runScoring({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
      OMEN_CRON_DRY_RUN: "true",
    },
    dependencies: {
      createSupabase: () => ({}),
      createRedis: () => null,
      archiveNotExecutedMoves: async (_supabase, _now, { dryRun }) => {
        calls.archive += 1;
        assert.equal(dryRun, true);
        return 1;
      },
      fetchPendingMoves: async () => [
        { id: "move-1", target_player: "Alpha Runner", scoring: "PPR", confidence: 60, season: 2024, week_num: 17 },
        { id: "move-2", target_player: "Beta Receiver", scoring: "Standard", confidence: 60, season: 2025, week_num: 2 },
      ],
      fetchNFLScores: async ({ season, weekNum }) => {
        calls.fetches.push(`${season}:${weekNum}`);
        return season === 2024
          ? { alpha_runner: { name: "Alpha Runner", rec_ppr: 16, rec_half: 14, rec_std: 12 } }
          : { beta_receiver: { name: "Beta Receiver", rec_ppr: 16, rec_half: 14, rec_std: 12 } };
      },
      saveScoredMove: async () => { calls.score += 1; },
    },
  });

  assert.deepEqual(calls.fetches.sort(), ["2024:17", "2025:2"]);
  assert.equal(calls.archive, 1);
  assert.equal(calls.score, 0);
  assert.deepEqual(result, { dryRun: true, archiveCount: 1, scoredCount: 2, failedCount: 0, deferredCount: 0 });
});

test("runScoring uses the PPR fallback when deployed moves omit the legacy scoring field", async () => {
  let saved = 0;
  const result = await runScoring({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
    },
    dependencies: {
      createSupabase: () => ({}),
      createRedis: () => null,
      archiveNotExecutedMoves: async () => 0,
      fetchPendingMoves: async () => [{
        id: "move-without-scoring",
        target_player: "Fallback Runner",
        confidence: 60,
        season: 2025,
        week_num: 3,
      }],
      fetchNFLScores: async () => ({
        fallback_runner: { name: "Fallback Runner", rec_ppr: 16, rec_half: 14, rec_std: 12 },
      }),
      saveScoredMove: async (_supabase, _moveId, score) => {
        saved += 1;
        assert.match(score.result, /16\.0 fantasy points \(PPR\)/);
      },
    },
  });

  assert.equal(saved, 1);
  assert.deepEqual(result, { dryRun: false, archiveCount: 0, scoredCount: 1, failedCount: 0, deferredCount: 0 });
});

test("fetchNFLScores defers on an unpublished season CSV without writing cache", async () => {
  const originalFetch = global.fetch;
  let cacheWrites = 0;
  const redis = {
    get: async () => null,
    set: async () => { cacheWrites += 1; },
  };
  global.fetch = async () => ({ ok: false, status: 404, statusText: "Not Found" });

  try {
    const scores = await fetchNFLScores({ season: 2026, weekNum: 1, redis });
    assert.equal(isDeferredScores(scores), true);
    assert.match(scores.reason, /stats_player_week_2026\.csv/);
    assert.equal(cacheWrites, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchNFLScores still fails closed on a non-404 upstream error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 500, statusText: "Server Error" });

  try {
    await assert.rejects(
      fetchNFLScores({ season: 2026, weekNum: 1 }),
      /nflverse 500/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("runScoring defers a pre-season move instead of marking it failed", async () => {
  let saved = 0;
  const result = await runScoring({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
    },
    dependencies: {
      createSupabase: () => ({}),
      createRedis: () => null,
      archiveNotExecutedMoves: async () => 0,
      fetchPendingMoves: async () => [{
        id: "pre-season-move",
        target_player: "Unplayed Runner",
        scoring: "PPR",
        confidence: 60,
        season: 2026,
        week_num: 1,
      }],
      fetchNFLScores: async () => {
        const originalFetch = global.fetch;
        global.fetch = async () => ({ ok: false, status: 404, statusText: "Not Found" });
        try {
          return await fetchNFLScores({ season: 2026, weekNum: 1 });
        } finally {
          global.fetch = originalFetch;
        }
      },
      saveScoredMove: async () => { saved += 1; },
    },
  });

  assert.equal(saved, 0);
  assert.deepEqual(result, { dryRun: false, archiveCount: 0, scoredCount: 0, failedCount: 0, deferredCount: 1 });
});
