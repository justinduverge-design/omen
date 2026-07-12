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
  vaultSecrets = { espnSecret: "espn-s2", swidSecret: "{swid}" },
} = {}) {
  const servicePath = require.resolve("../src/services/omen");
  delete require.cache[servicePath];

  const state = {
    yahooCalls: [],
    rosterCalls: [],
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
          return { client: { type: "fake-yahoo-client" } };
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

test("buildLiveOmenMvpMoveForUser returns platform_disconnected without platform rows", async () => {
  const { service } = loadOmenService();
  const result = await service.buildLiveOmenMvpMoveForUser("user-1");

  assert.equal(result.status, 200);
  assert.equal(result.body.state, "platform_disconnected");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.recovery.code, "connect_platform");
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
  assert.equal(result.body.state, "success");
  assert.equal(result.body.platform.name, "sleeper");
  assert.equal(result.body.league.id, "sleeper-league-1");
  assert.equal(result.body.team.id, "sleeper-roster-7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assert.equal(result.body.signals.roster.source, "sleeper_roster");
  assert.deepEqual(state.sleeperCalls[0].leagueId, "sleeper-league-1");
  assert.deepEqual(state.yahooCalls, []);
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
  assert.equal(result.body.state, "yahoo_reauth_required");
  assert.equal(result.body.platform.name, "yahoo");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.platform.recovery.code, "yahoo_reauth_required");
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
  assert.equal(result.body.state, "success");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.mode, "live");
  assert.equal(result.body.platform.name, "yahoo");
  assert.equal(result.body.league.id, "414.l.12345");
  assert.equal(result.body.team.id, "414.t.7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assert.equal(result.body.recommendation.primary_player.name, "Bench Breakout");
  assert.equal(result.body.recommendation.comparison_player.name, "Starter Wideout");
  assert.equal(result.body.recommendation.expected_value_delta.points, 4);
  assert.equal(result.body.signals.roster.status, "live");
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
  assert.equal(result.body.state, "empty");
  assert.equal(result.body.feature, "omen_mvp_move");
  assert.equal(result.body.recommendation, null);
  assert.equal(result.body.signals.roster.status, "live");
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
  assert.equal(result.body.state, "success");
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.league.id, "12345");
  assert.equal(result.body.team.id, "7");
  assert.equal(result.body.recommendation.type, "start_sit");
  assert.equal(result.body.signals.roster.source, "espn_roster");
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
  assert.equal(result.body.state, "espn_reauth_required");
  assert.equal(result.body.platform.name, "espn");
  assert.equal(result.body.platform.recovery.code, "espn_reauth_required");
  assert.equal(result.body.recommendation, null);
  assert.deepEqual(state.espnCalls, []);
});
