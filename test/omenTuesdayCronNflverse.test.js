"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { fetchNFLScores, fetchPendingMoves, isDeferredScores, isDryRun, nflverseScoresFromCsv, runScoring, scoreMove, scoredMovePatch } = require("../src/omen_tuesday_cron");

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

test("the A6 production compatibility migration adds every cron-read scoring field without rewriting rows", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "2026-08-26_a6_scoring_contract_production.sql"), "utf8");
  for (const column of [
    "scoring text",
    "scoring_contract jsonb",
    "scoring_contract_hash text",
    "scoring_contract_version text",
    "scoring_contract_required boolean",
    "scoring_coverage_state text",
    "provider_rule_snapshot_hash text",
    "provider_final_outcome jsonb",
    "reconciliation_state text",
  ]) assert.match(sql, new RegExp(`add column if not exists ${column}`));
  assert.match(sql, /alter column scoring drop default/);
  assert.doesNotMatch(sql, /\b(update|delete|insert)\b/i);
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
  assert.equal(requestedColumns, "id, week_num, season, headline, confidence, target_player, scoring, scoring_contract, scoring_contract_required, scoring_coverage_state, outcome, followed, created_at");
});

test("legacy rows grade standard, half-PPR, and PPR differently while a row without the new contract marker retains PPR", () => {
  const scores = {
    contract_receiver: { name: "Contract Receiver", rec_std: 6, rec_half: 9, rec_ppr: 12 },
  };

  assert.match(scoreMove({ target_player: "Contract Receiver", scoring: "Standard" }, scores).result, /6\.0 fantasy points \(Standard\)/);
  assert.match(scoreMove({ target_player: "Contract Receiver", scoring: "Half PPR" }, scores).result, /9\.0 fantasy points \(Half PPR\)/);
  assert.match(scoreMove({ target_player: "Contract Receiver", scoring: "PPR" }, scores).result, /12\.0 fantasy points \(PPR\)/);
  assert.match(scoreMove({ target_player: "Contract Receiver" }, scores).result, /12\.0 fantasy points \(PPR\)/);
});

test("a post-A6 recommendation fails closed when its full scoring contract cannot be evaluated", () => {
  // This used to assert a thrown error. Throwing failed closed but also failed
  // the whole run and left the contract engine with no production caller. The
  // requirement is unchanged and now checked more precisely: the row must not be
  // graded, must not borrow the PPR fallback, and must carry a named state.
  const stats = { contract_receiver: { name: "Contract Receiver", rec_std: 6, rec_half: 9, rec_ppr: 12 } };
  const score = scoreMove({
    target_player: "Contract Receiver",
    scoring_contract_required: true,
    scoring_coverage_state: "unsupported",
  }, stats);

  assert.equal(score.outcome, "pending");
  assert.equal(score.eff, null);
  assert.equal(score.reconciliation_state, "pending");
  assert.equal(/12\.0|9\.0|6\.0|PPR/.test(score.result), false);
  assert.match(score.result, /^Not graded: /);
});

test("a deferred contract row is not stamped scored_at, so a later run can still grade it", () => {
  const deferred = scoredMovePatch({ outcome: "pending", eff: null, result: "Not graded: x", reconciliation_state: "unsupported" });
  const graded = scoredMovePatch({ outcome: "win", eff: 70, result: "ok", reconciliation_state: "exact" });

  assert.equal(deferred.scored_at, null);
  assert.equal(deferred.reconciliation_state, "unsupported");
  assert.ok(graded.scored_at);
});

test("a contract-required row is graded by its own contract, never by the PPR fallback", () => {
  // Half-PPR contract: 6 receptions at 0.5, plus 60 receiving yards at 0.1.
  const contract = {
    ruleset_version: "omen-scoring-contract-v1",
    coverage_state: "supported",
    rules: [
      { event_key: "receiving_receptions", operator: "per_event", value: 0.5 },
      { event_key: "receiving_yards", operator: "per_event", value: 0.1 },
    ],
  };
  const stats = {
    contract_receiver: {
      name: "Contract Receiver",
      rec_std: 6, rec_half: 9, rec_ppr: 12,
      event_facts: { receiving_receptions: 6, receiving_yards: 60 },
    },
  };

  const score = scoreMove({
    target_player: "Contract Receiver",
    scoring_contract_required: true,
    scoring_coverage_state: "supported",
    scoring_contract: contract,
    provider_final_points: 9,
  }, stats);

  assert.equal(score.reconciliation_state, "exact");
  assert.match(score.result, /9\.0 fantasy points \(this league's scoring contract\)/);
  // Crucially: the PPR fallback for this same stat line would have been 12.0.
  assert.equal(score.result.includes("12.0"), false);
});

test("a missing event fact is never scored as zero", () => {
  const contract = {
    ruleset_version: "omen-scoring-contract-v1",
    coverage_state: "supported",
    rules: [
      { event_key: "receiving_receptions", operator: "per_event", value: 0.5 },
      { event_key: "receiving_yards", operator: "per_event", value: 0.1 },
    ],
  };
  const score = scoreMove({
    target_player: "Contract Receiver",
    scoring_contract_required: true,
    scoring_coverage_state: "supported",
    scoring_contract: contract,
    provider_final_points: 9,
  }, {
    contract_receiver: {
      name: "Contract Receiver", rec_ppr: 12,
      event_facts: { receiving_receptions: 6 },
    },
  });

  assert.equal(score.outcome, "pending");
  assert.equal(score.reconciliation_state, "unsupported");
  assert.match(score.result, /receiving_yards|missing lawful event facts/);
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
