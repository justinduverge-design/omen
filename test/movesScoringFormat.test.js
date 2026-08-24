"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { recommendationMoveRow, persistLiveRecommendation } = require("../src/services/moves");

const root = path.resolve(__dirname, "..");
const reviewSqlPath = path.join(root, "sql", "2026-08-24_a6_moves_scoring_format_review.sql");

function response(scoringFormat = "half_ppr") {
  return {
    state: "success",
    platform: { name: "espn" },
    league: { id: "12345", week: 8, season: 2026, scoring_format: scoringFormat },
    recommendation: {
      type: "start_sit",
      title: "Start Format Receiver",
      move: "Start Format Receiver.",
      primary_player: { name: "Format Receiver" },
      confidence: { score: 78.4 },
      explanation: { summary: "The half-PPR projection has the stronger edge." },
    },
  };
}

test("recommendationMoveRow captures the league format at recommendation time", () => {
  assert.deepEqual(recommendationMoveRow("user-1", response()), {
    user_id: "user-1",
    week_num: 8,
    season: 2026,
    move_type: "start_sit",
    headline: "Start Format Receiver",
    reasoning: "The half-PPR projection has the stronger edge.",
    confidence: 78,
    target_player: "Format Receiver",
    scoring: "Half PPR",
    platform: "espn",
    league_id: "12345",
  });
});

test("new recommendations fail closed when their league format is absent or unsupported", () => {
  assert.throws(() => recommendationMoveRow("user-1", response(null)), /supported league scoring format/);
  assert.throws(() => recommendationMoveRow("user-1", response("custom")), /supported league scoring format/);
});

test("persistLiveRecommendation upserts the generation-time move on the grading key", async () => {
  const state = {};
  const query = {
    upsert(row, options) {
      state.row = row;
      state.options = options;
      return query;
    },
    select(columns) {
      state.columns = columns;
      return query;
    },
    maybeSingle: async () => ({ data: { id: "move-1" }, error: null }),
  };

  const id = await persistLiveRecommendation({ from: (table) => {
    state.table = table;
    return query;
  } }, "user-1", response("standard"));

  assert.equal(id, "move-1");
  assert.equal(state.table, "moves");
  assert.equal(state.row.scoring, "Standard");
  assert.deepEqual(state.options, { onConflict: "user_id,week_num,season" });
  assert.equal(state.columns, "id");
});

test("A6 review SQL is nullable, additive, unbackfilled, and has no PPR default", () => {
  const sql = fs.readFileSync(reviewSqlPath, "utf8");
  assert.match(sql, /review only/i);
  assert.match(sql, /add column if not exists scoring text/i);
  assert.match(sql, /alter column scoring drop default/i);
  assert.doesNotMatch(sql, /update\s+public\.moves/i);
  assert.doesNotMatch(sql, /set\s+default\s+'?ppr'?/i);
  assert.doesNotMatch(sql, /not\s+null/i);
});
