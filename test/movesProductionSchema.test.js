"use strict";

// Regression for GlitchTip #13: "moves lookup failed: column moves.result does not exist".
// Production public.moves has no result, scored_at, platform or league_id (read-only
// information_schema check, 2026-09-28). The stub below enforces that column set the way
// PostgREST does, so a query naming an absent column fails exactly as it did live.

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const MOVE_ID = "11111111-2222-3333-4444-555555555555";

const PRODUCTION_COLUMNS = new Set([
  "id", "user_id", "week_num", "season", "move_type", "headline", "reasoning", "confidence",
  "target_player", "vorp_score", "followed", "outcome", "created_at", "user_stars", "user_note",
  "eff", "scoring", "scoring_contract", "scoring_contract_hash", "scoring_contract_version",
  "scoring_contract_required", "scoring_coverage_state", "provider_rule_snapshot_hash",
  "provider_final_outcome", "reconciliation_state",
]);

function fakeSupabase({ rows, columns = PRODUCTION_COLUMNS, calls }) {
  return {
    from(table) {
      assert.equal(table, "moves");
      return {
        select(selected) {
          const query = {
            filters: [],
            eq(field, value) { query.filters.push([field, value]); return query; },
            order() { return query; },
            limit() { return query; },
            run() {
              calls.push({ columns: selected, filters: query.filters.map(([f]) => f) });
              const absent = [...selected.split(","), ...query.filters.map(([f]) => f)]
                .find((column) => !columns.has(column));
              if (absent) {
                return { data: null, error: { code: "42703", message: `column moves.${absent} does not exist` } };
              }
              const data = rows.filter((row) => query.filters.every(([f, v]) => row[f] === v));
              return { data, error: null };
            },
            then(resolve, reject) { return Promise.resolve(query.run()).then(resolve, reject); },
            async maybeSingle() {
              const { data, error } = query.run();
              return { data: data?.[0] || null, error };
            },
          };
          return query;
        },
      };
    },
  };
}

function buildApp(options) {
  const routePath = require.resolve("../src/routes/moves");
  delete require.cache[routePath];
  const supabase = fakeSupabase(options);
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => supabase };
      if (request === "../middleware/auth") {
        return { requireAuth: (req, _res, next) => { req.user = { id: "user-1" }; next(); } };
      }
      if (request === "../services/nflSchedule") {
        return { getCurrentNflWeekContext: () => ({ season: 2026, week: 3 }) };
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let router;
  try { router = require("../src/routes/moves"); } finally { Module._load = originalLoad; }
  const app = express();
  app.use("/api/moves", router);
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

async function get(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const ROW = {
  id: MOVE_ID, user_id: "user-1", season: 2026, week_num: 2, move_type: "start_sit",
  headline: "Start Hall", followed: true, outcome: "win", reconciliation_state: null,
  created_at: "2026-09-16T12:00:00Z",
};
const NATIVE = "/api/moves?platform=sleeper&league_id=L1&contract_version=moves-history.v2";

test("native Ledger never names a column production lacks and refuses to guess a league", async () => {
  const calls = [];
  const app = buildApp({ rows: [ROW], calls });
  const { status, body } = await get(app, NATIVE);

  // Was 500 "moves lookup failed: column moves.result does not exist".
  assert.equal(status, 503);
  assert.equal(body.contract_version, "moves-history-error.v1");
  assert.equal(body.code, "league_scope_unavailable");
  assert.equal(body.moves, undefined, "another league's rows must not be served as this league's");
  assert.equal(calls.some((c) => /\b(result|scored_at)\b/.test(c.columns)), false);
});

test("native Ledger serves league-scoped rows once platform and league_id exist", async () => {
  const columns = new Set([...PRODUCTION_COLUMNS, "platform", "league_id"]);
  const rows = [
    { ...ROW, platform: "sleeper", league_id: "L1" },
    { ...ROW, id: "other", platform: "sleeper", league_id: "L2" },
  ];
  const calls = [];
  const { status, body } = await get(buildApp({ rows, columns, calls }), NATIVE);

  assert.equal(status, 200);
  assert.equal(body.contract_version, "moves-history.v2");
  assert.deepEqual(body.moves.map((m) => m.id), [MOVE_ID]);
  assert.equal(calls.some((c) => /\b(result|scored_at)\b/.test(c.columns)), false);
});

test("native Ledger still works on a pre-A6 schema (reconciliation_state absent)", async () => {
  const columns = new Set([...PRODUCTION_COLUMNS, "platform", "league_id"]);
  columns.delete("reconciliation_state");
  const rows = [{ ...ROW, platform: "sleeper", league_id: "L1" }];
  const { status, body } = await get(buildApp({ rows, columns, calls: [] }), NATIVE);

  assert.equal(status, 200);
  assert.equal(body.moves.length, 1);
  assert.equal(body.moves[0].provenance, "unknown");
});

test("v1 list is unaffected by the production schema", async () => {
  const { status, body } = await get(buildApp({ rows: [ROW], calls: [] }), "/api/moves");
  assert.equal(status, 200);
  assert.equal(body.contract_version, "moves-history.v1");
  assert.equal(body.moves.length, 1);
});

test("Ledger detail loads against the production column set without result/scored_at", async () => {
  const calls = [];
  const { status, body } = await get(buildApp({ rows: [ROW], calls }), `/api/moves/${MOVE_ID}`);

  assert.equal(status, 200);
  assert.equal(body.contract_version, "move-detail.v1");
  assert.equal(body.snapshot.platform, null);
  assert.equal(body.snapshot.league_id, null);
  assert.ok(calls.length <= 5, "bounded retries");
  assert.equal(calls.at(-1).columns.split(",").some((c) => ["result", "scored_at", "platform", "league_id"].includes(c)), false);
});

test("a missing column that is not optional still fails loudly", async () => {
  const columns = new Set(PRODUCTION_COLUMNS);
  columns.delete("headline");
  const { status, body } = await get(buildApp({ rows: [ROW], columns, calls: [] }), `/api/moves/${MOVE_ID}`);
  assert.equal(status, 500);
  assert.match(body.error, /column moves\.headline does not exist/);
});
