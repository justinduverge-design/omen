"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const test = require("node:test");
const assert = require("node:assert/strict");

const dashboard = require("../src/routes/dashboard");
const optimizer = require("../src/routes/optimizer");
const leagues = require("../src/routes/leagues");
const moves = require("../src/routes/moves");
const { LEAGUE_CONTEXT_CONTRACT, canonicalLeagueContext } = require("../src/services/leagueContext");
const { CONNECTION_STATES } = require("../src/services/providerConnectionState");

test("dashboard and optimizer emit the same season-scoped league context", () => {
  const dashboardContext = dashboard.rowLeagueContext(
    { platform: "Yahoo", league_id: " 123 ", espn_team_id: "7" },
    { season: 2026 },
  );
  const optimizerContext = optimizer.optimizerLeagueContext(
    { league_key: "123", season: 2026, team_key: "7" },
    "123",
    2026,
  );

  assert.deepEqual(dashboardContext, optimizerContext);
  assert.equal(dashboardContext.contract_version, LEAGUE_CONTEXT_CONTRACT);
  assert.equal(dashboardContext.season_instance_key, "yahoo:123:2026");
});

test("incomplete context stays unavailable across route-owned context builders", () => {
  const dashboardContext = dashboard.rowLeagueContext(
    { platform: "yahoo", league_id: "league-without-season" },
    {},
  );
  const optimizerContext = optimizer.optimizerLeagueContext(
    { league_key: "league-without-season" },
    "league-without-season",
  );

  assert.equal(dashboardContext.contract_version, LEAGUE_CONTEXT_CONTRACT);
  assert.equal(optimizerContext.contract_version, LEAGUE_CONTEXT_CONTRACT);
  assert.equal(dashboardContext.state, "unavailable");
  assert.equal(optimizerContext.state, "unavailable");
  assert.equal(dashboardContext.reason_code, "league_context_incomplete");
  assert.equal(optimizerContext.reason_code, "league_context_incomplete");
});

test("league directory provider state vocabulary is the shared provider contract", () => {
  for (const state of CONNECTION_STATES) {
    assert.equal(leagues.connectionState({ is_active: true, connection_state: state }), state);
  }
  assert.equal(leagues.connectionState({ is_active: true, platform: "yahoo", token_secret_id: "vault-ref" }), "connected");
  assert.equal(leagues.connectionState({ is_active: true, platform: "yahoo" }), "reconnect_required");
  assert.equal(leagues.connectionState({ is_active: false, platform: "yahoo", token_secret_id: "vault-ref" }), "not_connected");
});

test("moves native contract requires the same provider-neutral league identity", () => {
  const context = canonicalLeagueContext({ platform: "sleeper", league_id: "league-42", season: 2026 });
  assert.equal(context.contract_version, LEAGUE_CONTEXT_CONTRACT);
  assert.equal(context.state, "live");
  assert.equal(context.season_instance_key, "sleeper:league-42:2026");

  const normalized = moves.normalizeMove({ id: "move-1", season: 2026, week_num: 3, move_type: "start" });
  assert.equal(normalized.season, context.season);
  assert.equal(typeof normalized.id, "string");
  assert.equal(normalized.week, 3);
});
