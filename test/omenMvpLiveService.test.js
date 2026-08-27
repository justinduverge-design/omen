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
  espnWaiverPool,
  espnWaiverError,
  swaps,
  waiverPool,
  waiverError,
  vaultSecrets = { espnSecret: "espn-s2", swidSecret: "{swid}" },
  offSeason = false,
  sleeperLeague,
  sleeperPool,
  sleeperPoolError,
  sleeperLeagueRosters,
} = {}) {
  const servicePath = require.resolve("../src/services/omen");
  delete require.cache[servicePath];

  const state = {
    yahooCalls: [],
    rosterCalls: [],
    waiverCalls: [],
    sleeperCalls: [],
    sleeperLeagueCalls: [],
    sleeperPoolCalls: [],
    sleeperLeagueRosterCalls: [],
    espnCalls: [],
    espnWaiverCalls: [],
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
        fetchSleeperLeague: async (leagueId) => {
          state.sleeperLeagueCalls.push(leagueId);
          return sleeperLeague === undefined ? { league_id: leagueId, status: "in_season" } : sleeperLeague;
        },
        fetchSleeperAvailablePlayers: async (leagueId, week, season) => {
          state.sleeperPoolCalls.push({ leagueId, week, season });
          if (sleeperPoolError) throw new Error(sleeperPoolError);
          return sleeperPool || [];
        },
        fetchSleeperLeagueRosters: async (leagueId, week, season) => {
          state.sleeperLeagueRosterCalls.push({ leagueId, week, season });
          return sleeperLeagueRosters || { roster_positions: [], teams: [] };
        },
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
        fetchEspnWaiverPool: async (leagueId, espnS2, swid, week) => {
          state.espnWaiverCalls.push({ leagueId, espnS2, swid, week });
          if (espnWaiverError) throw espnWaiverError;
          return espnWaiverPool || [];
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
  assert.equal(result.body.league.scoring_format, null, "an uncaptured provider format must not default to PPR");

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

test("buildLiveOmenMvpMoveForUser returns a sanitized Sleeper trade only when both lineups improve", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "sleeper",
      is_active: true,
      league_id: "sleeper-league-1",
      platform_username: "sleepy",
    }],
    swaps: [],
    sleeperLeagueRosters: {
      roster_positions: ["RB", "RB", "WR"],
      teams: [
        {
          roster_id: "sleeper-roster-7",
          team_name: "North Stars",
          players: [
            { player_key: "my-rb", player_id: "my-rb", name: "My RB", position: "RB", eligible_positions: ["RB"], projected_points: 18 },
            { player_key: "rb-one", player_id: "rb-one", name: "RB One", position: "RB", eligible_positions: ["RB"], projected_points: 20 },
            { player_key: "rb-two", player_id: "rb-two", name: "RB Two", position: "RB", eligible_positions: ["RB"], projected_points: 19 },
            { player_key: "low-wr", player_id: "low-wr", name: "Low WR", position: "WR", eligible_positions: ["WR"], projected_points: 5 },
          ],
        },
        {
          roster_id: "other-roster",
          team_name: "South Stars",
          players: [
            { player_key: "their-wr", player_id: "their-wr", name: "Their WR", position: "WR", eligible_positions: ["WR"], projected_points: 12 },
            { player_key: "wr-one", player_id: "wr-one", name: "WR One", position: "WR", eligible_positions: ["WR"], projected_points: 20 },
            { player_key: "wr-two", player_id: "wr-two", name: "WR Two", position: "WR", eligible_positions: ["WR"], projected_points: 19 },
            { player_key: "low-rb", player_id: "low-rb", name: "Low RB", position: "RB", eligible_positions: ["RB"], projected_points: 5 },
          ],
        },
      ],
    },
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation.type, "trade_suggestion");
  assert.ok(result.body.recommendation.expected_value_delta.points > 0);
  assert.equal(JSON.stringify(result.body).includes("sleepy"), false);
  assert.deepEqual(state.sleeperLeagueRosterCalls, [{ leagueId: "sleeper-league-1", week: 8, season: "2026" }]);
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
  assert.deepEqual(result.body.signals.exact_espn_scoring_unavailable, {
    status: "unavailable",
    used: false,
    source: "provider_restricted",
    message: "Omen may recognize some league settings, but cannot yet verify every scoring rule and final ESPN result for this league. Any point-based guidance is not an exact final-score calculation.",
  });
  Object.values(result.body.signals).forEach(assertSignal);
  assert.deepEqual(state.vaultCalls, ["espnSecret", "swidSecret"]);
  assert.equal(state.espnCalls[0].opts.teamId, "7");
});

test("buildLiveOmenMvpMoveForUser returns an ESPN waiver pickup only from the selected live context", async () => {
  const { service, state } = loadOmenService({
    connections: [
      {
        id: "context-espn-other",
        user_id: "user-1",
        platform: "espn",
        is_active: true,
        league_id: "11111",
        espn_secret_id: "otherEspnSecret",
        swid_secret_id: "otherSwidSecret",
        espn_team_id: "1",
      },
      {
        id: "context-espn-waiver",
        user_id: "user-1",
        platform: "espn",
        is_active: true,
        league_id: "22222",
        espn_secret_id: "selectedEspnSecret",
        swid_secret_id: "selectedSwidSecret",
        espn_team_id: "7",
      },
    ],
    vaultSecrets: {
      otherEspnSecret: "other-espn-s2",
      otherSwidSecret: "{other-swid}",
      selectedEspnSecret: "selected-espn-s2",
      selectedSwidSecret: "{selected-swid}",
    },
    espnRoster: {
      week: 8,
      team_key: "7",
      source: "espn",
      slots: {
        starters: [{
          player_key: "espn:out-wr",
          name: "Out ESPN Wideout",
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
    espnWaiverPool: [
      {
        player_key: "espn:popular-wr",
        player_id: "popular-wr",
        name: "Popular ESPN Wideout",
        position: "WR",
        eligible_positions: ["WR"],
        team: "NYJ",
        status: null,
        projected_points: 8.1,
      },
      {
        player_key: "espn:available-wr",
        player_id: "available-wr",
        name: "Available ESPN Wideout",
        position: "WR",
        eligible_positions: ["WR"],
        team: "PHI",
        status: null,
        projected_points: 13.2,
      },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-espn-waiver",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "success");
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.league.id, "22222");
  assert.equal(result.body.team.id, "7");
  assert.equal(result.body.recommendation.type, "waiver_pickup");
  assert.equal(result.body.recommendation.primary_player.name, "Available ESPN Wideout");
  assert.equal(result.body.recommendation.comparison_player.name, "Out ESPN Wideout");
  assert.equal(result.body.recommendation.expected_value_delta.points, 13.2);
  assert.equal(result.body.signals.waivers.status, "live");
  assert.equal(result.body.signals.waivers.used, true);
  assert.equal(result.body.signals.waivers.source, "espn_available_players");
  assert.deepEqual(state.vaultCalls, ["selectedEspnSecret", "selectedSwidSecret"]);
  assert.deepEqual(state.espnCalls.map((call) => ({ leagueId: call.leagueId, teamId: call.opts.teamId })), [
    { leagueId: "22222", teamId: "7" },
  ]);
  assert.deepEqual(state.espnWaiverCalls, [{
    leagueId: "22222",
    espnS2: "selected-espn-s2",
    swid: "{selected-swid}",
    week: 8,
  }]);
});

test("buildLiveOmenMvpMoveForUser reports ESPN waiver data unavailable without inventing advice", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-espn-waiver",
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "22222",
      espn_secret_id: "espnSecret",
      swid_secret_id: "swidSecret",
      espn_team_id: "7",
    }],
    espnRoster: {
      week: 8,
      team_key: "7",
      source: "espn",
      slots: {
        starters: [{
          player_key: "espn:out-wr",
          name: "Out ESPN Wideout",
          position: "WR",
          eligible_positions: ["WR"],
          selected_position: "WR",
          status: "OUT",
          projected_points: 0,
        }],
        bench: [],
        ir: [],
      },
    },
    swaps: [],
    espnWaiverError: new Error("provider unavailable"),
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-espn-waiver",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "empty");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.mode, "live");
  assert.equal(result.body.signals.waivers.status, "unavailable");
  assert.equal(result.body.signals.waivers.used, false);
  assert.equal(result.body.signals.waivers.source, "espn_available_players");
  assert.equal(state.espnWaiverCalls.length, 1);
});

test("buildLiveOmenMvpMoveForUser returns a live empty ESPN waiver result when no eligible replacement exists", async () => {
  const { service, state } = loadOmenService({
    connections: [{
      id: "context-espn-waiver",
      user_id: "user-1",
      platform: "espn",
      is_active: true,
      league_id: "22222",
      espn_secret_id: "espnSecret",
      swid_secret_id: "swidSecret",
      espn_team_id: "7",
    }],
    espnRoster: {
      week: 8,
      team_key: "7",
      source: "espn",
      slots: {
        starters: [{
          player_key: "espn:out-wr",
          name: "Out ESPN Wideout",
          position: "WR",
          eligible_positions: ["WR"],
          selected_position: "WR",
          status: "OUT",
          projected_points: 0,
        }],
        bench: [],
        ir: [],
      },
    },
    swaps: [],
    espnWaiverPool: [],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1", {
    contextId: "context-espn-waiver",
  });

  assert.equal(result.status, 200);
  assertLiveEnvelope(result.body, "empty");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.signals.waivers.status, "live");
  assert.equal(result.body.signals.waivers.used, true);
  assert.equal(result.body.signals.waivers.source, "espn_available_players");
  assert.equal(state.espnWaiverCalls.length, 1);
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

// --- B2-D-S2: Sleeper waiver wiring + three-state branching -----------------
//
// State branching is in-season / pre-draft / off-season. Off-season already
// short-circuits at the top of buildLiveOmenMvpMoveForUser and is covered
// above; these cover the two states the waiver path introduces.
//
// The waiver path only opens when start/sit finds nothing. It must never invent
// a move: it requires a genuinely OUT starter AND a real same-position player in
// the pool, or it declines.

const SLEEPER_CONNECTION = {
  user_id: "user-1",
  platform: "sleeper",
  is_active: true,
  league_id: "sleeper-league-1",
  platform_username: "sleepy",
};

function rosterWithOutStarter() {
  return {
    week: 8,
    team_key: "sleeper-roster-7",
    source: "sleeper",
    slots: {
      starters: [{
        player_key: "sleeper:starter-1",
        player_id: "starter-1",
        name: "Injured Starter",
        position: "WR",
        eligible_positions: ["WR"],
        selected_position: "WR",
        team: "DAL",
        status: "IR",
        projected_points: 0,
      }],
      bench: [],
      ir: [],
    },
  };
}

test("pre-draft league does not claim the lineup is fine", async () => {
  // An undrafted league has no rosters, so "no move clears the threshold" is a
  // false statement rather than a conservative one. Found live 2026-07-26: a
  // real pre_draft league returns players: [] with starters: ["0" x 10].
  const { service, state } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperLeague: { league_id: "sleeper-league-1", status: "pre_draft" },
    sleeperRoster: {
      week: 8,
      team_key: "sleeper-roster-7",
      source: "sleeper",
      slots: { starters: [], bench: [], ir: [] },
    },
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.status, "pre_draft");
  assert.ok(
    !/clears the recommendation threshold/i.test(JSON.stringify(result.body.explanation)),
    "must not reuse the empty-lineup copy for an undrafted league",
  );
  // Never price a waiver pool for a league that has not drafted.
  assert.deepEqual(state.sleeperPoolCalls, []);
});

test("waiver pickup is offered when a starter is OUT and a same-position player is available", async () => {
  const { service, state } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: rosterWithOutStarter(),
    sleeperPool: [
      { player_key: "sleeper:900", player_id: "900", name: "Available WR", position: "WR", eligible_positions: ["WR"], team: "SF", status: null, projected_points: 12.4 },
      { player_key: "sleeper:901", player_id: "901", name: "Available QB", position: "QB", eligible_positions: ["QB"], team: "KC", status: null, projected_points: 22.1 },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation.type, "waiver_pickup");
  // Position must match the injured starter -- the higher-projected QB is not
  // a replacement for an injured WR.
  assert.equal(result.body.recommendation.primary_player.name, "Available WR");
  assert.equal(result.body.recommendation.comparison_player.name, "Injured Starter");
  assert.equal(state.sleeperPoolCalls.length, 1);
});

test("waiver pickup declines when the pool has no same-position player", async () => {
  const { service } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: rosterWithOutStarter(),
    sleeperPool: [
      { player_key: "sleeper:901", player_id: "901", name: "Available QB", position: "QB", eligible_positions: ["QB"], team: "KC", status: null, projected_points: 22.1 },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.state, "empty");
});

test("waiver pickup declines when no starter is OUT", async () => {
  const healthy = rosterWithOutStarter();
  healthy.slots.starters[0].status = "";
  healthy.slots.starters[0].projected_points = 15;

  const { service, state } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: healthy,
    sleeperPool: [
      { player_key: "sleeper:900", player_id: "900", name: "Available WR", position: "WR", eligible_positions: ["WR"], team: "SF", status: null, projected_points: 99 },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.body.recommendation, null);
  // A healthy lineup must not trigger a pool fetch at all.
  assert.deepEqual(state.sleeperPoolCalls, []);
});

test("waiver pickup declines an available player with no projection", async () => {
  // projected_points null means "we do not know", not "zero". Recommending an
  // unprojected player over an injured starter is not evidence-backed.
  const { service } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: rosterWithOutStarter(),
    sleeperPool: [
      { player_key: "sleeper:900", player_id: "900", name: "Unprojected WR", position: "WR", eligible_positions: ["WR"], team: "SF", status: null, projected_points: null },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.body.recommendation, null);
});

test("a failed pool fetch degrades to empty, never to an error or invented advice", async () => {
  const { service } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: rosterWithOutStarter(),
    sleeperPoolError: "sleeper pool exploded",
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.state, "empty");
});

test("waiver wiring does not change the Yahoo path", async () => {
  // Yahoo waiver is PR #211's scope and is gated on Yahoo API reapproval.
  const { service, state } = loadOmenService({
    connections: [{
      user_id: "user-1",
      platform: "yahoo",
      is_active: true,
      league_id: "414.l.1",
    }],
    swaps: [],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.body.recommendation, null);
  assert.deepEqual(state.sleeperPoolCalls, []);
  assert.deepEqual(state.sleeperLeagueCalls, []);
});

// --- B2-D4: deterministic selection across types ----------------------------
//
// Supersedes the S2 rule that waiver only opened when start/sit found nothing.
// Both types now produce candidates and the selector compares them by expected
// points gained. These tests exercise the case the S2 suite never could: a
// roster where BOTH a lineup swap and a waiver add are genuinely available.

/** A roster carrying an OUT starter AND a benched upgrade for the swap. */
function rosterWithOutStarterAndSwap() {
  const roster = rosterWithOutStarter();
  roster.slots.starters.push({
    player_key: "starter-1",
    player_id: "starter-2",
    name: "Starter Wideout",
    position: "WR",
    eligible_positions: ["WR"],
    selected_position: "WR",
    team: "PHI",
    status: "",
    projected_points: 10,
  });
  roster.slots.bench.push({
    player_key: "bench-1",
    player_id: "bench-1",
    name: "Bench Breakout",
    position: "WR",
    eligible_positions: ["WR"],
    team: "MIN",
    status: "",
    projected_points: 14,
  });
  return roster;
}

const WAIVER_POOL_WR_12 = [
  { player_key: "sleeper:900", player_id: "900", name: "Available WR", position: "WR", eligible_positions: ["WR"], team: "SF", status: null, projected_points: 12.4 },
];

test("B2-D4 selects the waiver add when it out-scores the lineup swap", async () => {
  // Swap gains 4 points. Replacing an OUT starter projected at 0 with a 12.4
  // player gains 12.4. Under the old priority short-circuit the 4-point swap
  // would have won purely for being checked first.
  const { service, state } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    sleeperRoster: rosterWithOutStarterAndSwap(),
    sleeperPool: WAIVER_POOL_WR_12,
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation.type, "waiver_pickup");
  assert.equal(result.body.recommendation.primary_player.name, "Available WR");
  assert.equal(state.sleeperPoolCalls.length, 1);
});

test("B2-D4 selects the lineup swap when it out-scores the waiver add", async () => {
  const { service } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [{
      slot: "WR",
      from: { player_key: "starter-1", name: "Starter Wideout", status: "", projected: 10 },
      to: { player_key: "bench-1", name: "Bench Breakout", status: "", projected: 30 },
      delta: 20,
      confidence: 82,
    }],
    sleeperRoster: rosterWithOutStarterAndSwap(),
    sleeperPool: WAIVER_POOL_WR_12,
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation.type, "start_sit");
});

test("B2-D4 selection does not depend on which type was generated first", async () => {
  // Same inputs, run twice. A deterministic selector returns the same type
  // both times; an order-dependent one can drift.
  const build = () => loadOmenService({
    connections: [SLEEPER_CONNECTION],
    sleeperRoster: rosterWithOutStarterAndSwap(),
    sleeperPool: WAIVER_POOL_WR_12,
  });

  const first = await build().service.buildLiveOmenMvpMoveForUser("user-1");
  const second = await build().service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(first.body.recommendation.type, second.body.recommendation.type);
  assert.equal(first.body.recommendation.id, second.body.recommendation.id);
});

test("B2-D4 never prices a waiver pool for a roster with no OUT starter", async () => {
  // The eligibility precondition survives the move to scored selection. This
  // is what keeps always-generating candidates from costing a request.
  const { service, state } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    sleeperPool: WAIVER_POOL_WR_12,
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.body.recommendation.type, "start_sit");
  assert.deepEqual(state.sleeperPoolCalls, []);
});

test("B2-D4 returns honest empty rather than substituting a type to fill the screen", async () => {
  // No swap, and the only available player has no projection, so the waiver
  // candidate is rejected as unscored. Nothing may be substituted for it.
  const { service } = loadOmenService({
    connections: [SLEEPER_CONNECTION],
    swaps: [],
    sleeperRoster: rosterWithOutStarter(),
    sleeperPool: [
      { player_key: "sleeper:902", player_id: "902", name: "Unprojected WR", position: "WR", eligible_positions: ["WR"], team: "NYJ", status: null, projected_points: null },
    ],
  });

  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.recommendation, null);
});
