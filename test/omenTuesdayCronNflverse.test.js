"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { fetchNFLScores, fetchPendingMoves, isDryRun, nflverseScoresFromCsv, runScoring } = require("../src/omen_tuesday_cron");

test("nflverseScoresFromCsv maps one stored season/week into all scoring formats", () => {
  const scores = nflverseScoresFromCsv([
    "player_name,season,week,fantasy_points,fantasy_points_ppr",
    "Amon-Ra St. Brown,2025,7,14.5,19.5",
    "Other Week,2025,8,20,25",
  ].join("\n"), { season: 2025, weekNum: 7 });

  assert.deepEqual(scores.amonra_st_brown, {
    name: "Amon-Ra St. Brown",
    rec_std: 14.5,
    rec_half: 17,
    rec_ppr: 19.5,
  });
  assert.equal(scores.other_week, undefined);
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
  assert.equal(requestedColumns, "id, week_num, season, headline, confidence, target_player, outcome, followed, created_at");
});

test("fetchNFLScores reads the public nflverse season CSV without a provider key", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = null;
  global.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      text: async () => [
        "player_name,season,week,fantasy_points,fantasy_points_ppr",
        "Public Runner,2025,3,10,12",
      ].join("\n"),
    };
  };

  try {
    const scores = await fetchNFLScores({ season: 2025, weekNum: 3 });
    assert.match(requestedUrl, /nflverse-data\/releases\/download\/player_stats\/player_stats_2025\.csv$/);
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
  assert.deepEqual(result, { dryRun: true, archiveCount: 1, scoredCount: 2, failedCount: 0 });
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
  assert.deepEqual(result, { dryRun: false, archiveCount: 0, scoredCount: 1, failedCount: 0 });
});
