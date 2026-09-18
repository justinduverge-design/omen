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
      matchup_dvp: { status: "stub", used: false, source: "pending_nflverse_data", message: "Matchup context is not available." },
      llm_reasoning: { status: "unavailable", used: false, source: "ollama_gemma", message: "Private narration is not available." },
      waivers: { status: "unavailable", used: false, source: "yahoo_waivers", message: "Waiver context is not available." },
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

function loadOmenRouter({ offSeason = false, liveResponse = liveEnvelope, dvp = null, persistenceError = null, missingColumns = null, llmDelayMs = 0, liveNeverResolves = false } = {}) {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];

  const state = {
    authHeaders: [],
    appUsers: [],
    llmPayloads: [],
    dvpLookups: [],
    scheduleLookups: [],
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
          // `missingColumns` reproduces the real production schema, which has every A6
          // scoring column but no `platform` and no `league_id`. PostgREST reports that as
          // a message naming the column, exactly as reproduced here.
          const offending = (missingColumns || []).find((column) => Object.hasOwn(payload, column));
          return {
            select() {
              return {
                maybeSingle: async () => {
                  if (persistenceError) return { data: null, error: { message: persistenceError } };
                  if (offending) {
                    return {
                      data: null,
                      error: { code: "PGRST204", message: `column moves.${offending} does not exist` },
                    };
                  }
                  return { data: { id: "move-live-1" }, error: null };
                },
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
          if (liveNeverResolves) await new Promise(() => {});
          return { status: 200, body: liveResponse() };
        },
        buildOmenMvpMoveResponse: () => ({ status: 200, body: liveResponse() }),
      };
    }
    if (request === "../services/scheduleTravelCapabilities" && parent?.filename === routePath) {
      return {
        resolveScheduleTravelCapabilities: async ({ nflTeam }) => {
          state.scheduleLookups.push(nflTeam);
          return {
            game_time_tv: {
              status: "live", resolution: "available", used: false, source: "espn_scoreboard",
              message: "Kickoff is Sunday at 1:00 PM; away vs NYG.",
              observed_at: "2026-05-25T00:00:00.000Z", fresh_until: null,
              facts: [{ name: "opponent", kind: "verified", source: "espn_scoreboard", statement: "Opponent: NYG.", value: "NYG" }],
            },
            travel_home_away: {
              status: "live", resolution: "available", used: false, source: "omen_stadium_distance",
              message: "Away vs NYG. Omen estimates travel from static stadium coordinates.",
              observed_at: "2026-05-25T00:00:00.000Z", fresh_until: null, facts: [],
            },
          };
        },
      };
    }
    if (request === "../services/mvpEvidenceEnrichment" && parent?.filename === routePath) {
      return {
        resolveMvpDvpContext: async (response, options) => {
          if (response.recommendation?.type === "waiver_pickup") return null;
          state.dvpLookups.push({ response, options });
          return dvp;
        },
        applyDvpContext: (response, value) => {
          if (!response.signals?.matchup_dvp || !value) return false;
          response.signals.matchup_dvp = {
            status: "live", used: true, source: "nflverse_data",
            message: `Matchup DvP is ${value.dvp_label}.`,
          };
          return true;
        },
        generateMvpLlmNarration: async (response) => {
          if (llmDelayMs) await new Promise((resolve) => setTimeout(resolve, llmDelayMs));
          state.llmPayloads.push({ state: response.state });
          return {
            source: "ollama_gemma", model: "gemma4:e2b-q4_0",
            explanation: {
              summary: "Live Gemma says this is the move.",
              why_it_matters: "It adds value without changing the rest of the roster.",
              risk: response.recommendation?.explanation?.risk,
              confidence: response.recommendation?.explanation?.confidence,
              data_used: response.recommendation?.explanation?.data_used || [],
            },
          };
        },
        applyMvpLlmNarration: (response, narration) => {
          Object.assign(response.recommendation.explanation, narration.explanation);
          response.signals.llm_reasoning = {
            status: "live", used: true, source: narration.source, model: narration.model,
            generated_fields: ["summary", "why_it_matters"], message: "Live private narration.",
          };
          return true;
        },
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
      return { isOffSeason: () => offSeason, suppressLiveFootballData: () => offSeason };
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

test("native v2 negotiates bands without leaking numeric confidence or changing v1", async () => {
  const { app } = buildApp();
  const headers = { authorization: "Bearer valid-token" };
  const v2 = await post(app, { headers, body: { contract_version: "omen-decision-brief.v2" } });
  assert.equal(v2.body.contract_version, "omen-decision-brief.v2");
  assert.equal(v2.body.recommendation.confidence.band, "confident");
  assert.ok(v2.body.recommendation.confidence.drivers.length);
  assert.equal(v2.body.recommendation.confidence.score, undefined);
  assert.doesNotMatch(JSON.stringify(v2.body), /82 out of 100/);
  const v1 = await post(app, { headers });
  assert.equal(v1.body.recommendation.confidence.score, 82);
});

test("native v3 adds typed shared capabilities while retaining v2's band policy", async () => {
  const { app } = buildApp();
  const v3 = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { contract_version: "omen-decision-brief.v3" },
  });

  assert.equal(v3.status, 200);
  assert.equal(v3.body.contract_version, "omen-decision-brief.v3");
  assert.equal(v3.body.capability_contract, "decision-capabilities.v1");
  assert.equal(v3.body.recommendation.confidence.score, undefined);
  assert.ok(Array.isArray(v3.body.capabilities));
  const byName = Object.fromEntries(v3.body.capabilities.map((capability) => [capability.name, capability]));
  assert.equal(byName.roster.state, "live");
  assert.equal(byName.game_time_tv.state, "live");
  assert.equal(byName.game_time_tv.kind, "verified");
  assert.equal(byName.travel_home_away.state, "live");
  assert.equal(byName.travel_home_away.kind, "model");
  assert.equal(byName.waivers.state, "unavailable");
  assert.equal(byName.waivers.reason_code, "availability_unknown");
  assert.equal(byName.league_exact_scoring.state, "unavailable");
  assert.equal(byName.league_exact_scoring.coverage_state, "pending");
  assert.equal(byName.matchup_dvp.state, "unavailable");
  assert.equal(byName.llm_reasoning.state, "unavailable");
});

test("POST /api/omen/mvp-move requires auth for live requests", async () => {
  const { app, state } = buildApp();
  const res = await post(app);

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "omen_auth_required");
  assert.deepEqual(state.liveUserIds, []);
});

test("a stalled live provider path returns an honest retryable timeout within the core budget", async () => {
  const { app } = buildApp({ liveNeverResolves: true });
  const startedAt = Date.now();
  const res = await post(app, { headers: { authorization: "Bearer valid-token" } });

  assert.equal(res.status, 503);
  assert.equal(res.body.state, "error");
  assert.equal(res.body.error.code, "omen_live_generation_timed_out");
  assert.equal(res.body.error.retryable, true);
  assert.ok(Date.now() - startedAt < 6000, "the live source must not consume the native 20s request window");
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
      // Yahoo used to short-circuit to a synthetic "pending" snapshot and hash *that*, which
      // produced stable hashes standing in for no rules at all. Since 2026-09-06 Yahoo reads
      // the league's real settings; this fixture has no reachable Yahoo credentials, so the
      // read fails and the hashes are null. Hashing an empty snapshot was provenance for
      // nothing — the ruleset version below is the part that genuinely survives a failed read.
      scoring_contract: null,
      scoring_contract_hash: null,
      scoring_contract_version: "omen-scoring-contract-v1",
      scoring_contract_required: true,
      scoring_coverage_state: "pending",
      provider_rule_snapshot_hash: null,
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
    contract_hash: null,
    provider_rule_snapshot_hash: null,
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
  // ESPN was hardcoded `provider_restricted` until 2026-09-06, when the founder authorized
  // capturing and retaining its rules. This fixture has no reachable ESPN credentials, so the
  // settings read fails and the row records `pending` — the honest state for "we could not
  // read the rules", and never a fabricated contract.
  assert.equal(state.moveUpserts[0].payload.scoring_coverage_state, "pending");
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

test("a late private narration never holds the deterministic native recommendation", async () => {
  const { app } = buildApp({ llmDelayMs: 5000 });
  const startedAt = Date.now();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: true, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.equal(res.body.recommendation.title, "Start Bench Breakout over Starter Wideout");
  assert.equal(res.body.signals.llm_reasoning.status, "unavailable");
  assert.match(res.body.signals.llm_reasoning.message, /response budget/i);
  assert.ok(Date.now() - startedAt < 2000, "the LLM must not add its 5s delay to the response");
});

test("a recommendation still issues when the schema lacks platform and league_id", async () => {
  // Found live on 2026-08-27: production `moves` has every A6 scoring column but neither
  // `platform` nor `league_id`, while this route's upsert named both. Because the route
  // deliberately refuses to issue advice it cannot persist, the first real request would
  // have received an error instead of a recommendation. It had not fired only because no
  // request had reached the endpoint in 48 hours.
  const { app, state } = buildApp({ missingColumns: ["platform", "league_id"] });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: false, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.ok(res.body.recommendation, "the recommendation must still be issued");

  // Retried once per absent column, then succeeded without them.
  assert.equal(state.moveUpserts.length, 3);
  assert.equal(Object.hasOwn(state.moveUpserts[0].payload, "platform"), true);
  assert.equal(Object.hasOwn(state.moveUpserts[2].payload, "platform"), false);
  assert.equal(Object.hasOwn(state.moveUpserts[2].payload, "league_id"), false);

  // The scoring metadata — the part that must never be silently dropped — survives.
  const stored = state.moveUpserts[2].payload;
  assert.equal(stored.scoring_contract_required, true);
  assert.ok(stored.scoring_coverage_state);
  assert.ok(stored.scoring_contract_version);
});

test("a missing column that is NOT optional still fails closed", async () => {
  // The tolerance is bounded on purpose. A recommendation whose scoring metadata could not
  // be stored must not be issued — that is the fail-closed behaviour #372 added, and this
  // fix must not widen it into 'drop whatever the database rejects'.
  const { app } = buildApp({ persistenceError: "column moves.scoring_coverage_state does not exist" });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: false, matchup_dvp: false } },
  });

  assert.notEqual(res.status, 200);
});
