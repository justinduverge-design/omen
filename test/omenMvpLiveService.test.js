"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.applyFilters()[0] || null, error: null });
  }

  then(resolve, reject) {
    return Promise.resolve({ data: this.applyFilters(), error: null }).then(resolve, reject);
  }

  applyFilters() {
    return this.rows.filter((row) =>
      this.filters.every(({ field, value }) => row[field] === value)
    );
  }
}

function loadOmenService({
  connections = [],
  roster,
  sleeperRoster,
  espnRoster,
  swaps,
  waiverPool,
  waiverError,
  vaultSecrets = { espnSecret: "espn-s2", swidSecret: "{swid}" },
  offSeason = false,
} = {}) {
  const servicePath = require.resolve("../src/services/omen");
  delete require.cache[servicePath];

  const state = {
    yahooCalls: [],
    rosterCalls: [],
    waiverCalls: [],
    sleeperCalls: [],
    espnCalls: [],
    vaultCalls: [],
  };
  const fakeSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: async (_fn, args) => {
      state.vaultCalls.push(args.secret_id);
      const secret = vaultSecrets[args.secret_id] ?? null;
      return { data: { decrypted_secret: secret }, error: null };
    },
    from(table) {
      return {
        select() {
          if (table === "platform_connections") return new FakeQuery(connections);
          if (table === "users") return new FakeQuery([{ id: "user-1" }]);
          throw new Error(`unexpected table ${table}`);
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === servicePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "./yahooAuth" && parent?.filename === servicePath) {
      return {
        getAuthenticatedYahooClient: async (userId) => {
          state.yahooCalls.push(userId);
          return {
            client: {
              type: "fake-yahoo-client",
              getAvailablePlayers: async (leagueId, opts) => {
                state.waiverCalls.push({ leagueId, opts });
                if (waiverError) throw waiverError;
                return { type: "fake-yahoo-waiver-response" };
              },
            },
          };
        },
      };
    }
    if (request === "./roster" && parent?.filename === servicePath) {
      return {
        fetchAndNormalizeRoster: async (client, leagueId, week, cacheKey) => {
          state.rosterCalls.push({ client, leagueId, week, cacheKey });
          return roster || {
            week: 8,
            team_key: "414.t.7",
            source: "yahoo",
            slots: {
              starters: [{
                player_key: "starter-1",
                name: "Starter Wideout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "WR",
                team: "DAL",
                status: "",
                projected_points: 10,
              }],
              bench: [{
                player_key: "bench-1",
                name: "Bench Breakout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "BN",
                team: "PHI",
                status: "",
                projected_points: 14,
              }],
              ir: [],
            },
          };
        },
        normalizeYahooWaivers: () => waiverPool || [],
      };
    }
    if (request === "./optimizer" && parent?.filename === servicePath) {
      return {
        evaluateLineup: () => swaps || [{
          slot: "WR",
          from: {
            player_key: "starter-1",
            name: "Starter Wideout",
            status: "",
            projected: 10,
          },
          to: {
            player_key: "bench-1",
            name: "Bench Breakout",
            status: "",
            projected: 14,
          },
          delta: 4,
          confidence: 82,
          reasoning: "Bench Breakout projects 4.00 pts higher than Starter Wideout",
        }],
      };
    }
    if (request === "./nflSchedule" && parent?.filename === servicePath) {
      return {
        getCurrentNflWeekContext: () => ({
          season: 2026,
          week: 8,
          season_type: "regular",
        }),
        isOffSeason: () => offSeason,
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === servicePath) {
      return {
        buildNormalizedRoster: async (leagueId, username, week) => {
          state.sleeperCalls.push({ leagueId, username, week });
          return sleeperRoster || {
            week,
            team_key: "sleeper-roster-7",
            source: "sleeper",
            slots: {
              starters: [{
                player_key: "starter-1",
                name: "Starter Wideout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "WR",
                team: "DAL",
                status: "",
                projected_points: 10,
              }],
              bench: [{
                player_key: "bench-1",
                name: "Bench Breakout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "BN",
                team: "PHI",
                status: "",
                projected_points: 14,
              }],
              ir: [],
            },
          };
        },
      };
    }
    if (request === "../adapters/espn" && parent?.filename === servicePath) {
      return {
        buildNormalizedRoster: async (leagueId, espnS2, swid, week, opts) => {
          state.espnCalls.push({ leagueId, espnS2, swid, week, opts });
          return espnRoster || {
            week,
            team_key: "7",
            source: "espn",
            slots: {
              starters: [{
                player_key: "starter-1",
                name: "Starter Wideout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "WR",
                team: "DAL",
                status: "",
                projected_points: 10,
              }],
              bench: [{
                player_key: "bench-1",
                name: "Bench Breakout",
                position: "WR",
                eligible_positions: ["WR"],
                selected_position: "BN",
                team: "PHI",
                status: "",
                projected_points: 14,
              }],
              ir: [],
            },
          };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { service: require("../src/services/omen"), state };
  } finally {
    Module._load = originalLoad;
  }
}

function assertLiveEnvelope(body, state) {
  assert.equal(body.contract_version, "2026-05-18.omen-live.v1");
  assert.equal(body.state, state);
  assert.equal(body.feature, "omen_mvp_move");
  assert.equal(body.mode, "live");
  assert.ok(body.request_id);
  assert.ok(body.generated_at);
  assert.ok(Object.hasOwn(body, "platform"));
  assert.ok(Object.hasOwn(body, "league"));
  assert.ok(Object.hasOwn(body, "team"));
  assert.ok(body.signals && typeof body.signals === "object");
  assert.ok(Object.hasOwn(body, "recommendation"));
  assert.ok(Array.isArray(body.alternatives));
  assert.ok(Array.isArray(body.warnings));
}

function assertSignal(signal) {
  assert.ok(["live", "stub", "mock", "demo", "unavailable"].includes(signal.status));
  assert.equal(typeof signal.used, "boolean");
  assert.equal(typeof signal.source, "string");
  assert.equal(typeof signal.message, "string");
}

function assertSuccessRecommendation(recommendation) {
  assert.equal(typeof recommendation.id, "string");
  assert.equal(recommendation.type, "start_sit");
  assert.equal(typeof recommendation.title, "string");
  assert.equal(typeof recommendation.move, "string");
  assert.ok(recommendation.primary_player);
  assert.ok(Object.hasOwn(recommendation, "comparison_player"));
  assert.equal(typeof recommendation.expected_value_delta.points, "number");
  assert.equal(typeof recommendation.expected_value_delta.label, "string");
  assert.equal(typeof recommendation.confidence.score, "number");
  assert.equal(typeof recommendation.confidence.label, "string");
  assert.equal(typeof recommendation.confidence.rationale, "string");
  assert.ok(["low", "medium", "high"].includes(recommendation.risk.level));
  assert.ok(Array.isArray(recommendation.risk.reasons));
  assert.equal(typeof recommendation.explanation.summary, "string");
  assert.equal(typeof recommendation.explanation.why_it_matters, "string");
  assert.equal(typeof recommendation.explanation.risk, "string");
  assert.equal(typeof recommendation.explanation.confidence, "string");
  assert.ok(Array.isArray(recommendation.explanation.data_used));
}

test("buildLiveOmenMvpMoveForUser returns platform_disconnected without platform rows", async () => {
  const { service } = loadOmenService();
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "platform_disconnected");
  assert.equal(result.body.state, "platform_disconnected");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.recovery.code, "connect_platform");
  Object.values(result.body.signals).forEach(assertSignal);
});

test("buildLiveOmenMvpMoveForUser returns off_season before platform adapter calls", async () => {
  const { service, state } = loadOmenService({
    offSeason: true,
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "sleeper-league-1",
      platform_username: "sleepy",
    }],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "off_season");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.status, "off_season");
  assert.equal(result.body.signals.roster.source, "nfl_calendar");
  assert.equal(result.body.confidence.score, 100);
  assert.deepEqual(state.yahooCalls, []);
  assert.deepEqual(state.rosterCalls, []);
  assert.deepEqual(state.sleeperCalls, []);
  assert.deepEqual(state.espnCalls, []);
  assert.deepEqual(state.vaultCalls, []);
});

test("buildLiveOmenMvpMoveForUser maps Sleeper lineup swap into live omen_mvp_move envelope", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "sleeper-league-1",
      platform_username: "sleepy",
    }],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.state, "success");
  assert.equal(result.body.platform.name, "sleeper");
  assert.equal(result.body.league.id, "sleeper-league-1");
  assert.equal(result.body.team.id, "sleeper-roster-7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assertSuccessRecommendation(result.body.recommendation);
  assert.equal(result.body.signals.roster.source, "sleeper_roster");
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.sleeperCalls[0].leagueId, "sleeper-league-1");
  assert.deepEqual(state.yahooCalls, []);
});

test("buildLiveOmenMvpMoveForUser uses the owned selected context instead of provider priority", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-yahoo",
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.12345",
      token_secret_id: "secret-id",
    }, {
      id: "context-sleeper",
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "sleeper-league-2",
      platform_username: "sleepy",
    }],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-sleeper",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.platform.name, "sleeper");
  assert.equal(result.body.league.id, "sleeper-league-2");
  assert.deepEqual(state.sleeperCalls.map((call) => call.leagueId), ["sleeper-league-2"]);
  assert.deepEqual(state.yahooCalls, []);
});

test("buildLiveOmenMvpMoveForUser fails closed when the selected context is unavailable", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-yahoo",
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.12345",
      token_secret_id: "secret-id",
    }],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "foreign-or-inactive-context",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "context_unavailable");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.error.code, "omen_context_unavailable");
  assert.equal(Object.hasOwn(result.body, "context_id"), false);
  assert.deepEqual(state.yahooCalls, []);
  assert.deepEqual(state.sleeperCalls, []);
  assert.deepEqual(state.espnCalls, []);
});

test("buildLiveOmenMvpMoveForUser keeps Yahoo pending when the token is not usable", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.12345",
    }],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "yahoo_reauth_required");
  assert.equal(result.body.state, "yahoo_reauth_required");
  assert.equal(result.body.platform.name, "yahoo");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.recovery.code, "yahoo_reauth_required");
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.yahooCalls, []);
  assert.deepEqual(state.rosterCalls, []);
});

test("buildLiveOmenMvpMoveForUser maps Yahoo lineup swap into omen_mvp_move envelope", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.12345",
      token_secret_id: "secret-id",
    }],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.state, "success");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.mode, "live");
  assert.equal(result.body.platform.name, "yahoo");
  assert.equal(result.body.league.id, "414.l.12345");
  assert.equal(result.body.team.id, "414.t.7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assertSuccessRecommendation(result.body.recommendation);
  assert.equal(result.body.recommendation.primary_player.name, "Bench Breakout");
  assert.equal(result.body.recommendation.comparison_player.name, "Starter Wideout");
  assert.equal(result.body.recommendation.expected_value_delta.points, 4);
  assert.equal(result.body.signals.roster.status, "live");
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.yahooCalls, ["user-1"]);
  assert.equal(state.rosterCalls[0].leagueId, "414.l.12345");
});

test("buildLiveOmenMvpMoveForUser returns empty state when Yahoo has no lineup edge", async () => {
  const { service } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.12345",
      token_secret_id: "secret-id",
    }],
    swaps: [],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "empty");
  assert.equal(result.body.state, "empty");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.signals.roster.status, "live");
  assert.equal(typeof result.body.explanation.summary, "string");
  assert.equal(typeof result.body.confidence.score, "number");
  Object.values(result.body.signals).forEach(assertSignal);
});

test("buildLiveOmenMvpMoveForUser returns a Yahoo waiver pickup from the selected live context", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-yahoo-waiver",
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.waiver",
      token_secret_id: "secret-id",
    }],
    roster: {
      week: 8,
      team_key: "414.t.7",
      source: "yahoo",
      slots: {
        starters: [{
          player_key: "out-wr",
          name: "Out Wideout",
          position: "WR",
          eligible_positions: ["WR"],
          selected_position: "WR",
          team: "DAL",
          status: "OUT",
          projected_points: 0,
        }],
        bench: [],
        ir: [],
      },
    },
    swaps: [],
    waiverPool: [{
      player_key: "waiver-wr",
      name: "Available Wideout",
      position: "WR",
      eligible_positions: ["WR"],
      team: "PHI",
      status: "",
      projected_points: null,
    }],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-yahoo-waiver",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.recommendation.type, "waiver_pickup");
  assert.equal(result.body.recommendation.primary_player.name, "Available Wideout");
  assert.equal(result.body.recommendation.comparison_player.name, "Out Wideout");
  assert.equal(result.body.recommendation.expected_value_delta.points, null);
  assert.equal(result.body.signals.waivers.status, "live");
  assert.equal(result.body.signals.waivers.used, true);
  assert.deepEqual(state.rosterCalls.map((call) => call.leagueId), ["414.l.waiver"]);
  assert.deepEqual(state.waiverCalls, [{
    leagueId: "414.l.waiver",
    opts: { count: 50, sort: "AR" },
  }]);
});

test("buildLiveOmenMvpMoveForUser fails closed when Yahoo waiver data is unavailable", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-yahoo-waiver",
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.waiver",
      token_secret_id: "secret-id",
    }],
    roster: {
      week: 8,
      team_key: "414.t.7",
      source: "yahoo",
      slots: {
        starters: [{
          player_key: "out-wr",
          name: "Out Wideout",
          position: "WR",
          status: "OUT",
          projected_points: 0,
        }],
        bench: [],
        ir: [],
      },
    },
    swaps: [],
    waiverError: new Error("provider unavailable"),
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-yahoo-waiver",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "empty");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.mode, "live");
  assert.equal(result.body.signals.waivers.status, "unavailable");
  assert.equal(result.body.signals.waivers.used, false);
  assert.equal(result.body.signals.waivers.source, "yahoo_available_players");
  assert.deepEqual(state.waiverCalls, [{
    leagueId: "414.l.waiver",
    opts: { count: 50, sort: "AR" },
  }]);
});

test("buildLiveOmenMvpMoveForUser does not fetch Yahoo waivers without an unavailable starter", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-yahoo-no-waiver-need",
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.no-waiver-need",
      token_secret_id: "secret-id",
    }],
    roster: {
      week: 8,
      team_key: "414.t.7",
      source: "yahoo",
      slots: {
        starters: [{
          player_key: "healthy-wr",
          name: "Healthy Wideout",
          position: "WR",
          status: "",
          projected_points: 12,
        }],
        bench: [],
        ir: [],
      },
    },
    swaps: [],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-yahoo-no-waiver-need",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "empty");
  assert.equal(result.body.recommendation, null);
  assert.deepEqual(state.waiverCalls, []);
});

test("buildLiveOmenMvpMoveForUser maps ESPN lineup swap into live omen_mvp_move envelope", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "12345",
      espn_secret_id: "espnSecret",
      swid_secret_id: "swidSecret",
      espn_team_id: "7",
    }],
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.state, "success");
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.league.id, "12345");
  assert.equal(result.body.team.id, "7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assertSuccessRecommendation(result.body.recommendation);
  assert.equal(result.body.signals.roster.source, "espn_roster");
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.vaultCalls, ["espnSecret", "swidSecret"]);
  assert.equal(state.espnCalls[0].opts.teamId, "7");
});

test("buildLiveOmenMvpMoveForUser returns ESPN reauth recovery when Vault secrets are missing", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "12345",
      espn_secret_id: "espnSecret",
      swid_secret_id: "swidSecret",
    }],
    vaultSecrets: {},
  });
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "espn_reauth_required");
  assert.equal(result.body.state, "espn_reauth_required");
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.platform.recovery.code, "espn_reauth_required");
  assert.equal(result.body.recommendation, null);
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.espnCalls, []);
});
