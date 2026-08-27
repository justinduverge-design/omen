"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function liveEnvelope() {
  return {
    contract_version: "2026-05-18.omen-live.v1",
    state: "success",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_test",
    generated_at: "2026-05-25T00:00:00.000Z",
    platform: { name: "yahoo", status: "connected", recovery: null },
    league: { id: "414.l.12345", name: null, season: 2026, week: 8, scoring_format: "ppr" },
    team: { id: "414.t.7", name: null },
    signals: {
      roster: { status: "live", used: true, source: "yahoo_roster", message: "Roster imported." },
    },
    recommendation: {
      id: "live_omen_start_sit_test",
      type: "start_sit",
      title: "Start Bench Breakout over Starter Wideout",
      move: "Move Bench Breakout into your WR slot and bench Starter Wideout.",
      primary_player: { id: "bench-1", name: "Bench Breakout", position: "WR", team: "PHI" },
      comparison_player: { id: "starter-1", name: "Starter Wideout", position: "WR", team: "DAL" },
      expected_value_delta: { points: 4, label: "meaningful" },
      confidence: { score: 82, label: "medium_high", rationale: "Live edge." },
      risk: { level: "low", reasons: ["Live route test."] },
      explanation: {
        summary: "Start Bench Breakout.",
        why_it_matters: "Live route test.",
        risk: "Low.",
        confidence: "82 out of 100.",
        data_used: ["Yahoo roster"],
      },
    },
    alternatives: [],
    warnings: [],
  };
}

function waiverEnvelope() {
  const body = liveEnvelope();
  body.recommendation = {
    ...body.recommendation,
    id: "live_omen_yahoo_waiver_test",
    type: "waiver_pickup",
    primary_player: { id: "waiver-1", name: "Available Wideout", position: "WR", team: "DAL" },
    comparison_player: { id: "out-1", name: "Out Wideout", position: "WR", team: "PHI" },
    expected_value_delta: { points: null, label: "unavailable" },
  };
  body.signals.matchup_dvp = {
    status: "stub",
    used: false,
    source: "pending_nflverse_data",
    message: "Not used for waiver replacements.",
  };
  return body;
}

function espnWaiverEnvelope() {
  const body = waiverEnvelope();
  body.platform = { name: "espn", status: "connected", recovery: null };
  body.league = { id: "22222", name: null, season: 2026, week: 8, scoring_format: "ppr" };
  body.team = { id: "7", name: null };
  body.recommendation = {
    ...body.recommendation,
    id: "live_omen_waiver_espn_available_wr",
    primary_player: { id: "available-wr", name: "Available ESPN Wideout", position: "WR", team: "PHI" },
    comparison_player: { id: "out-wr", name: "Out ESPN Wideout", position: "WR", team: "DAL" },
    expected_value_delta: { points: 13.2, label: "strong" },
  };
  body.signals.waivers = {
    status: "live",
    used: true,
    source: "espn_available_players",
    message: "Available-player and projection data came from the selected ESPN league.",
  };
  return body;
}

function authEnvelope(message = "Missing bearer token") {
  return {
    contract_version: "2026-05-18.omen-live.v1",
    state: "error",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_auth",
    generated_at: "2026-05-25T00:00:00.000Z",
    platform: {
      name: "unknown",
      status: "auth_required",
      recovery: { code: "sign_in", message, cta: "Sign In" },
    },
    league: null,
    team: null,
    signals: {
      roster: {
        status: "unavailable",
        used: false,
        source: "platform_adapter",
        message,
      },
    },
    recommendation: null,
    alternatives: [],
    warnings: [],
    error: { code: "omen_auth_required", message, retryable: false },
  };
}

function offSeasonEnvelope() {
  return {
    contract_version: "2026-05-18.omen-live.v1",
    state: "off_season",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_offseason",
    generated_at: "2026-07-19T00:00:00.000Z",
    platform: { name: "unknown", status: "off_season", recovery: null },
    league: null,
    team: null,
    signals: {
      roster: {
        status: "unavailable",
        used: false,
        source: "nfl_calendar",
        message: "Omen does not generate live lineup advice outside the NFL regular season.",
      },
    },
    recommendation: null,
    alternatives: [],
    warnings: ["Live MVP Move is paused outside the NFL regular season."],
    explanation: {
      summary: "Omen is paused until the NFL regular season starts.",
      why_it_matters: "Live lineup recommendations need current weekly matchups and active rosters.",
      risk: "Showing stale offseason advice would be misleading.",
      confidence: "Confidence is high that no live weekly move should be generated right now.",
      data_used: ["NFL calendar"],
    },
    confidence: {
      score: 100,
      label: "high",
      rationale: "The shared NFL calendar is outside the regular season window.",
    },
  };
}

function loadOmenRouter({ offSeason = false, liveResponse = liveEnvelope, dvp = null, persistenceError = null } = {}) {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];

  const state = {
    authHeaders: [],
    appUsers: [],
    llmPayloads: [],
    dvpLookups: [],
    liveUserIds: [],
    liveRequests: [],
    moveUpserts: [],
  };
  const fakeSupabase = {
    from(table) {
      if (table !== "moves") throw new Error(`unexpected table ${table}`);
      return {
        upsert(payload, options) {
          state.moveUpserts.push({ payload, options });
          return {
            select() {
              return {
                maybeSingle: async () => persistenceError
                  ? { data: null, error: { message: persistenceError } }
                  : { data: { id: "move-live-1" }, error: null },
              };
            },
          };
        },
      };
    },
  };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../services/appUser" && parent?.filename === routePath) {
      return {
        ensureAppUser: async (authUser) => {
          state.appUsers.push(authUser);
        },
      };
    }
    if (request === "../services/omen" && parent?.filename === routePath) {
      return {
        authenticateOmenRequest: async (authHeader) => {
          state.authHeaders.push(authHeader || null);
          if (authHeader !== "Bearer valid-token") {
            throw Object.assign(new Error("Missing bearer token"), { status: 401 });
          }
          return { id: "user-1" };
        },
        authRequiredMvpResponse: (message) => ({ status: 401, body: authEnvelope(message) }),
        offSeasonMvpResponse: () => ({ status: 200, body: offSeasonEnvelope() }),
        buildLiveOmenMvpMoveForUser: async (userId, options) => {
          state.liveUserIds.push(userId);
          state.liveRequests.push({ userId, options });
          return { status: 200, body: liveResponse() };
        },
        buildOmenMvpMoveResponse: () => ({ status: 200, body: liveResponse() }),
      };
    }
    if (request === "../services/llm" && parent?.filename === routePath) {
      return {
        explainOmenMvpMove: async (payload) => {
          state.llmPayloads.push(payload);
          return {
            summary: "Live Gemma says this is the move.",
            why_it_matters: "It adds value without changing the rest of the roster.",
            risk: "The risk is low.",
            confidence: "Confidence is 82 out of 100.",
            data_used: ["Yahoo roster"],
          };
        },
      };
    }
    if (request === "../services/matchupService" && parent?.filename === routePath) {
      return {
        getDvpContext: async (lookup) => {
          state.dvpLookups.push(lookup);
          return dvp;
        },
      };
    }
    if (request === "../services/nflSchedule" && parent?.filename === routePath) {
      return { isOffSeason: () => offSeason };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { router: require("../src/routes/omen"), state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  const loaded = loadOmenRouter(options);
  app.use(express.json());
  app.use("/api/omen", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state: loaded.state };
}

async function post(app, { headers = {}, body = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/omen/mvp-move`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/omen/mvp-move requires auth for live requests", async () => {
  const { app, state } = buildApp();
  const res = await post(app);

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "omen_auth_required");
  assert.deepEqual(state.liveUserIds, []);
});

test("POST /api/omen/mvp-move returns live Omen MVP envelope for authorized users", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: false, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.equal(res.body.feature, "omen_mvp_move");
  assert.equal(res.body.mode, "live");
  assert.equal(res.body.platform.name, "yahoo");
  assert.equal(res.body.recommendation.type, "start_sit");
  assert.deepEqual(state.liveUserIds, ["user-1"]);
  assert.deepEqual(state.appUsers, [{ id: "user-1" }]);
  assert.deepEqual(state.moveUpserts, [{
    options: { onConflict: "user_id,week_num,season" },
    payload: {
      user_id: "user-1",
      week_num: 8,
      season: 2026,
      move_type: "start_sit",
      headline: "Start Bench Breakout over Starter Wideout",
      reasoning: "Start Bench Breakout.",
      confidence: 82,
      target_player: "Bench Breakout",
      // A6 step 2: this asserted `scoring: "PPR"` for a Yahoo league whose rules
      // have never been read — Yahoo's API is refused at the entitlement level.
      // The label came from the envelope's own default, not from the league, so
      // the write path was persisting a fabricated scoring format: the exact
      // defect A6 exists to remove, surviving one layer down. It is now null.
      scoring: null,
      platform: "yahoo",
      league_id: "414.l.12345",
      // The rule body stays unretained until a provider's rights path is
      // evidenced (RETAIN_RULE_BODY). The hashes still pin which contract
      // version and which rule set produced the row, so provenance survives.
      scoring_contract: null,
      scoring_contract_hash: "f3476f0cca279785312d9d384d2f8c1b44936a9f358b1aa48f751bbe86553e69",
      scoring_contract_version: "omen-scoring-contract-v1",
      scoring_contract_required: true,
      scoring_coverage_state: "pending",
      provider_rule_snapshot_hash: "45733e2a7bb7c152c8c92decf6342c2fd3c591a4b2f2edf068bd0841b336f78e",
      provider_final_outcome: null,
      reconciliation_state: "pending",
    },
  }]);
  // The public envelope keeps exactly the seven fields #372 defined. Deriving
  // more internally must never widen the API, and the derived rule body must
  // never appear here.
  assert.deepEqual(res.body.recommendation.scoring, {
    format: null,
    contract_required: true,
    contract_version: "omen-scoring-contract-v1",
    contract_hash: "f3476f0cca279785312d9d384d2f8c1b44936a9f358b1aa48f751bbe86553e69",
    provider_rule_snapshot_hash: "45733e2a7bb7c152c8c92decf6342c2fd3c591a4b2f2edf068bd0841b336f78e",
    coverage_state: "pending",
    reconciliation_state: "pending",
  });
});

test("POST /api/omen/mvp-move suppresses advice when its move row cannot be persisted", async () => {
  const { app } = buildApp({ persistenceError: "database unavailable" });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: false, matchup_dvp: false } },
  });

  assert.equal(res.status, 503);
  assert.equal(res.body.state, "error");
  assert.equal(res.body.recommendation, null);
  assert.deepEqual(res.body.error, {
    code: "omen_recommendation_persistence_failed",
    message: "Omen could not safely record this recommendation, so no move was issued.",
    retryable: true,
  });
  assert.doesNotMatch(JSON.stringify(res.body), /database unavailable/);
});

test("POST /api/omen/mvp-move does not enrich availability-only waiver advice with matchup DvP", async () => {
  const { app, state } = buildApp({
    liveResponse: waiverEnvelope,
    dvp: {
      opponent_team: "PHI",
      position: "WR",
      avg_points_allowed: 12.5,
      sample_weeks: 4,
      dvp_label: "favorable",
    },
  });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.recommendation.type, "waiver_pickup");
  assert.equal(res.body.signals.matchup_dvp.status, "stub");
  assert.deepEqual(state.dvpLookups, []);
});

test("POST /api/omen/mvp-move returns the selected-context ESPN waiver envelope", async () => {
  const { app, state } = buildApp({ liveResponse: espnWaiverEnvelope });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: {
      context_id: "context-espn-waiver",
      include_signals: { llm_reasoning: false, matchup_dvp: false },
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.platform.name, "espn");
  assert.equal(res.body.league.id, "22222");
  assert.equal(res.body.recommendation.type, "waiver_pickup");
  assert.equal(res.body.recommendation.expected_value_delta.points, 13.2);
  assert.equal(res.body.signals.waivers.source, "espn_available_players");
  assert.equal(state.moveUpserts[0].payload.scoring_coverage_state, "provider_restricted");
  assert.deepEqual(state.liveRequests, [{
    userId: "user-1",
    options: { contextId: "context-espn-waiver" },
  }]);
});

test("POST /api/omen/mvp-move forwards the selected opaque context to live generation", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: {
      context_id: "context-sleeper",
      include_signals: { llm_reasoning: false, matchup_dvp: false },
    },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(state.liveRequests, [{
    userId: "user-1",
    options: { contextId: "context-sleeper" },
  }]);
});

test("POST /api/omen/mvp-move returns off_season before live generation for authorized users", async () => {
  const { app, state } = buildApp({ offSeason: true });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "2026-05-18.omen-live.v1");
  assert.equal(res.body.state, "off_season");
  assert.equal(res.body.mode, "live");
  assert.equal(res.body.recommendation, null);
  assert.equal(res.body.signals.roster.status, "unavailable");
  assert.deepEqual(state.liveUserIds, []);
});

test("POST /api/omen/mvp-move skips LLM by default for live empty-body requests", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.deepEqual(state.llmPayloads, []);
});

test("POST /api/omen/mvp-move allows explicit live LLM opt-in", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: true, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.recommendation.explanation.summary, "Live Gemma says this is the move.");
  assert.equal(state.llmPayloads.length, 1);
  assert.equal(state.llmPayloads[0].state, "success");
});
