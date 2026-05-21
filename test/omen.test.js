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

  then(resolve, reject) {
    return Promise.resolve({
      data: this.rows.filter((row) =>
        this.filters.every(({ field, value }) => row[field] === value)
      ),
      error: null,
    }).then(resolve, reject);
  }
}

function makeRoster() {
  return {
    week: 4,
    team_key: "449.l.123.t.7",
    league_key: "449.l.123",
    source: "yahoo",
    slots: {
      starters: [
        {
          player_key: "449.p.1",
          name: "Risky Starter",
          position: "RB",
          eligible_positions: ["RB", "FLEX"],
          selected_position: "FLEX",
          team: "EXA",
          opponent: "OPP",
          status: "Q",
          projected_points: 10,
        },
      ],
      bench: [
        {
          player_key: "449.p.2",
          name: "Live Bench Edge",
          position: "WR",
          eligible_positions: ["WR", "FLEX"],
          selected_position: "BN",
          team: "SAM",
          opponent: "DEF",
          status: "",
          projected_points: 13.75,
        },
      ],
      ir: [],
    },
  };
}

function loadOmenService({
  rows = [],
  roster = makeRoster(),
  swaps = [],
  yahooError = null,
} = {}) {
  const omenPath = require.resolve("../src/services/omen");
  delete require.cache[omenPath];

  const observations = {
    rosterCalls: [],
    yahooAuthCalls: [],
  };

  const fakeSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } }, error: null }),
    },
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select() {
          return new FakeQuery(rows);
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === omenPath) {
      return { createClient: () => fakeSupabase };
    }

    if (parent?.filename === omenPath && request === "./yahooAuth") {
      return {
        getAuthenticatedYahooClient: async (userId) => {
          observations.yahooAuthCalls.push(userId);
          if (yahooError) throw yahooError;
          return { client: { name: "fake-yahoo" }, accessToken: "secret-access-token" };
        },
      };
    }

    if (parent?.filename === omenPath && request === "./roster") {
      return {
        fetchAndNormalizeRoster: async (...args) => {
          observations.rosterCalls.push(args);
          return roster;
        },
      };
    }

    if (parent?.filename === omenPath && request === "./optimizer") {
      return {
        evaluateLineup: () => swaps,
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      service: require("../src/services/omen"),
      observations,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test("getLiveOmenForUser returns live empty state when no platform is connected", async () => {
  const { service, observations } = loadOmenService();

  const res = await service.getLiveOmenForUser("test-user");

  assert.equal(res.status, "needs_platform_connection");
  assert.equal(res.mode, "live");
  assert.equal(res.is_mock, false);
  assert.equal(res.scoring_format, "PPR");
  assert.equal(res.recommendation, null);
  assert.deepEqual(res.empty_state.connected_platforms, []);
  assert.deepEqual(observations.yahooAuthCalls, []);
});

test("getLiveOmenForUser leaves Sleeper-only users in pending live-engine state", async () => {
  const { service, observations } = loadOmenService({
    rows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        league_id: "sleeper-league",
        platform_username: "sleepy",
        is_active: true,
      },
    ],
  });

  const res = await service.getLiveOmenForUser("test-user");

  assert.equal(res.status, "connected_platform_pending_live_engine");
  assert.equal(res.scoring_format, "PPR");
  assert.equal(res.recommendation, null);
  assert.deepEqual(res.empty_state.connected_platforms, [
    { platform: "sleeper", league_id: "sleeper-league", username: "sleepy" },
  ]);
  assert.deepEqual(observations.yahooAuthCalls, []);
});

test("getLiveOmenForUser does not call Yahoo when league id is only the placeholder", async () => {
  const { service, observations } = loadOmenService({
    rows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        league_id: "yahoo",
        platform_username: null,
        is_active: true,
      },
    ],
  });

  const res = await service.getLiveOmenForUser("test-user");

  assert.equal(res.status, "connected_platform_pending_live_engine");
  assert.equal(res.scoring_format, "PPR");
  assert.equal(res.recommendation, null);
  assert.deepEqual(observations.yahooAuthCalls, []);
  assert.deepEqual(observations.rosterCalls, []);
});

test("getLiveOmenForUser returns pending state when Yahoo roster has no lineup edge", async () => {
  const { service, observations } = loadOmenService({
    rows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        league_id: "449.l.123",
        platform_username: null,
        is_active: true,
      },
    ],
    swaps: [],
  });

  const res = await service.getLiveOmenForUser("test-user");

  assert.equal(res.status, "connected_platform_pending_live_engine");
  assert.equal(res.week, 4);
  assert.equal(res.scoring_format, "PPR");
  assert.equal(res.recommendation, null);
  assert.deepEqual(observations.yahooAuthCalls, ["test-user"]);
  assert.equal(observations.rosterCalls[0][1], "449.l.123");
});

test("getLiveOmenForUser maps Yahoo lineup swap into live Omen contract", async () => {
  const { service } = loadOmenService({
    rows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        league_id: "449.l.123",
        platform_username: null,
        is_active: true,
        token_secret_id: "vault-token-id",
      },
    ],
    swaps: [
      {
        slot: "FLEX",
        from: {
          player_key: "449.p.1",
          name: "Risky Starter",
          status: "Q",
          projected: 8.5,
        },
        to: {
          player_key: "449.p.2",
          name: "Live Bench Edge",
          status: "",
          projected: 13.75,
        },
        delta: 5.25,
        confidence: 92,
        reasoning: "Live Bench Edge projects 5.25 pts higher than Risky Starter.",
      },
    ],
  });

  const res = await service.getLiveOmenForUser("test-user");

  assert.equal(res.status, "live");
  assert.equal(res.mode, "live");
  assert.equal(res.is_mock, false);
  assert.equal(res.source.platform, "yahoo");
  assert.equal(res.source.league_id, "449.l.123");
  assert.equal(res.week, 4);
  assert.equal(res.scoring_format, "PPR");
  assert.equal(res.recommendation.move_type, "lineup_swap");
  assert.equal(res.recommendation.priority, "high");
  assert.equal(res.recommendation.confidence_label, "strong lean");
  assert.equal(res.recommendation.primary_action.type, "start_sit");
  assert.equal(res.recommendation.primary_action.roster_slot, "FLEX");
  assert.deepEqual(res.recommendation.primary_action.start, {
    player_key: "449.p.2",
    name: "Live Bench Edge",
    position: "WR",
    team: "SAM",
    opponent: "DEF",
    projected_points: 13.75,
    status: "active",
  });
  assert.equal(res.recommendation.primary_action.sit.name, "Risky Starter");
  assert.equal(res.recommendation.primary_action.sit.status, "questionable");
  assert.equal(res.recommendation.primary_action.projected_points_delta, 5.25);
  assert.ok(Array.isArray(res.recommendation.evidence));

  const serialized = JSON.stringify(res);
  assert.equal(serialized.includes("secret-access-token"), false);
  assert.equal(serialized.includes("vault-token-id"), false);
});

test("getLiveOmenForUser propagates Yahoo auth errors for route-level 401 handling", async () => {
  const yahooError = Object.assign(
    new Error("Yahoo refresh token missing - re-auth required"),
    { status: 401 }
  );
  const { service } = loadOmenService({
    rows: [
      {
        user_id: "test-user",
        platform: "yahoo",
        league_id: "449.l.123",
        platform_username: null,
        is_active: true,
      },
    ],
    yahooError,
  });

  await assert.rejects(
    () => service.getLiveOmenForUser("test-user"),
    { status: 401, message: "Yahoo refresh token missing - re-auth required" }
  );
});
