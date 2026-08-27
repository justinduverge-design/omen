"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const MOVE_ID = "11111111-2222-3333-4444-555555555555";

function fakeSupabase({ rows = [], missingColumns = false, calls = [] } = {}) {
  return {
    from(table) {
      assert.equal(table, "moves");
      return {
        select(columns) {
          const missing = missingColumns && /scoring_contract_version/.test(columns);
          const query = {
            filters: {},
            eq(field, value) { query.filters[field] = value; return query; },
            async maybeSingle() {
              calls.push({ columns, filters: { ...query.filters } });
              if (missing) {
                return { data: null, error: { code: "PGRST204", message: "Could not find the 'scoring_contract_version' column of 'moves'" } };
              }
              const match = rows.find((row) =>
                Object.entries(query.filters).every(([field, value]) => String(row[field]) === String(value)));
              return { data: match || null, error: null };
            },
          };
          return query;
        },
      };
    },
  };
}

function loadRouter(options = {}) {
  const routePath = require.resolve("../src/routes/moves");
  delete require.cache[routePath];

  const supabaseDouble = fakeSupabase(options.supabase || {});
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => supabaseDouble };
      if (request === "../middleware/auth") {
        return { requireAuth: (req, _res, next) => { req.user = { id: options.userId || "user-1" }; next(); } };
      }
      if (request === "../services/nflSchedule") {
        return { getCurrentNflWeekContext: () => ({ season: 2026, week: 7 }) };
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/moves");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/api/moves", loadRouter(options));
  app.use((err, _req, res, _next) => { res.status(err.status || 500).json({ error: err.message }); });
  return app;
}

async function request(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { authorization: "Bearer valid-token" },
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const RESOLVED_ROW = {
  id: MOVE_ID, user_id: "user-1", week_num: 6, season: 2026, move_type: "start_sit",
  headline: "Start DeVonta Smith over Chris Olave",
  reasoning: "The available data favored Smith in a close matchup.",
  confidence: 72, target_player: "DeVonta Smith",
  followed: true, user_stars: 4, user_note: null,
  outcome: "win", eff: 70, result: "DeVonta Smith scored 18.4 fantasy points (Half PPR).",
  created_at: "2026-10-11T20:12:00.000Z", scored_at: "2026-10-15T12:00:00.000Z",
  platform: "sleeper", league_id: "L1", scoring: "Half PPR",
  scoring_contract_version: "omen-scoring-contract-v1",
};

test("GET /api/moves/:id returns the immutable snapshot with a timezone-qualified issue time", async () => {
  const app = buildApp({ supabase: { rows: [RESOLVED_ROW] } });
  const { status, body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(status, 200);
  assert.equal(body.contract_version, "move-detail.v1");
  assert.equal(body.call_type, "start_sit");
  assert.equal(body.state, "resolved");
  assert.equal(body.snapshot.recommendation, "Start DeVonta Smith over Chris Olave");
  assert.equal(body.snapshot.week, 6);
  assert.equal(body.snapshot.platform, "sleeper");
  assert.equal(body.snapshot.scoring_format, "Half PPR");
  assert.equal(body.snapshot.issued_at, "2026-10-11T20:12:00.000Z");
  assert.equal(body.snapshot.issued_at_timezone, "UTC");
});

test("evidence separates league context, player fact, model input, and inference", async () => {
  const app = buildApp({ supabase: { rows: [RESOLVED_ROW] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);
  const categories = body.evidence_at_the_time.map((e) => e.category);

  assert.deepEqual(categories, ["league_context", "player_game_fact", "model_input", "omen_inference"]);
  assert.equal(body.evidence_at_the_time.find((e) => e.category === "omen_inference").kind, "inference");
});

test("a pre-A6 row without a scoring format names the PPR fallback as a limitation", async () => {
  const legacy = { ...RESOLVED_ROW, scoring: null, scoring_contract_version: null };
  const app = buildApp({ supabase: { rows: [legacy] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);
  const limitation = body.evidence_at_the_time.find((e) => e.category === "limitation");

  assert.ok(limitation);
  assert.match(limitation.statement, /PPR fallback/);
  assert.equal(body.snapshot.scoring_format, null);
});

test("the outcome is stated in measured language and never as a raw win or loss mark", async () => {
  const win = buildApp({ supabase: { rows: [RESOLVED_ROW] } });
  const loss = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, outcome: "loss" }] } });

  const winBody = (await request(win, `/api/moves/${MOVE_ID}`)).body;
  const lossBody = (await request(loss, `/api/moves/${MOVE_ID}`)).body;

  assert.equal(winBody.observed_outcome.statement, "Observed outcome aligned with the recommendation.");
  assert.equal(lossBody.observed_outcome.statement, "Observed outcome did not align with the recommendation.");
  for (const body of [winBody, lossBody]) {
    const serialized = JSON.stringify(body);
    assert.equal(/"outcome":"(win|loss)"/.test(serialized), false);
    assert.equal(/\bWIN\b|\bLOSS\b/.test(serialized), false);
  }
});

test("an unconfirmed user action is stated as unknown, never inferred as not-followed", async () => {
  const app = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, followed: null }] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(body.user_action.known, false);
  assert.equal(body.user_action.followed, null);
  assert.match(body.user_action.statement, /could not confirm/);
});

test("an explicit not-followed is distinguished from an unknown one", async () => {
  const app = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, followed: false }] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(body.user_action.known, true);
  assert.equal(body.user_action.followed, false);
});

test("a pending entry names what it is waiting for instead of showing an outcome", async () => {
  const app = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, outcome: "pending", result: null, scored_at: null }] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(body.state, "pending");
  assert.equal(body.observed_outcome.known, false);
  assert.equal(body.observed_outcome.awaiting, "final scoring for this week");
});

test("a scored row with no result line is data_incomplete rather than a silent resolution", async () => {
  const app = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, result: null }] } });
  const { body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(body.state, "data_incomplete");
  assert.match(body.observed_outcome.statement, /could not be verified/);
});

test("another user's move is not found, and the user filter is applied in the query", async () => {
  const calls = [];
  const app = buildApp({ supabase: { rows: [{ ...RESOLVED_ROW, user_id: "someone-else" }], calls } });
  const { status, body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(status, 404);
  assert.equal(body.contract_version, "move-detail-error.v1");
  assert.equal(body.code, "move_not_found");
  assert.equal(calls[0].filters.user_id, "user-1");
});

test("a malformed id is rejected before any database call", async () => {
  const calls = [];
  const app = buildApp({ supabase: { rows: [RESOLVED_ROW], calls } });
  const { status, body } = await request(app, "/api/moves/not-a-uuid");

  assert.equal(status, 400);
  assert.equal(body.code, "invalid_move_id");
  assert.equal(calls.length, 0);
});

test("the detail query falls back when the A6 contract columns are absent from the schema", async () => {
  const calls = [];
  const app = buildApp({
    supabase: {
      rows: [{ ...RESOLVED_ROW, scoring: null, scoring_contract_version: undefined }],
      missingColumns: true,
      calls,
    },
  });
  const { status, body } = await request(app, `/api/moves/${MOVE_ID}`);

  assert.equal(status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].columns, /scoring_contract_version/);
  assert.equal(/scoring_contract_version/.test(calls[1].columns), false);
  assert.ok(body.evidence_at_the_time.some((e) => e.category === "limitation"));
});

test("GET /api/moves list behavior is unchanged", async () => {
  const app = buildApp({ supabase: { rows: [] } });
  const { status } = await request(app, "/api/moves?season=abc");
  assert.equal(status, 400);
});
