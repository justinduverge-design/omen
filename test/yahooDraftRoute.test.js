"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function draftSnapshot(overrides = {}) {
  return {
    league_key: "449.l.12345",
    draft_id: "yahoo:449.l.12345",
    status: "drafting",
    type: "snake",
    sport: "nfl",
    season: "2026",
    season_type: "regular",
    settings: { teams: 3, rounds: 5, pick_timer: 60 },
    start_time: 1724516400000,
    created: null,
    user_draft_slot: 1,
    slot_to_roster_id: {
      1: "449.l.12345.t.7",
      2: "449.l.12345.t.2",
      3: "449.l.12345.t.9",
    },
    picks: [
      {
        pick_no: 1,
        round: 1,
        draft_slot: 1,
        roster_id: "449.l.12345.t.7",
        player_id: "1001",
        is_user_pick: true,
        is_keeper: false,
        metadata: {
          first_name: "Pat",
          last_name: "Mahomes",
          team: "KC",
          position: "QB",
          status: null,
          injury_status: null,
          years_exp: null,
        },
      },
      {
        pick_no: 2,
        round: 1,
        draft_slot: 2,
        roster_id: "449.l.12345.t.2",
        player_id: "1002",
        is_user_pick: false,
        is_keeper: false,
        metadata: {
          first_name: "Ja'Marr",
          last_name: "Chase",
          team: "CIN",
          position: "WR",
          status: null,
          injury_status: null,
          years_exp: null,
        },
      },
    ],
    ...overrides,
  };
}

let authResult = {
  client: {},
  accessToken: "fake-access-token",
  connection: {
    league_id: "449.l.12345",
  },
};

function loadYahooRouter(adapterOverrides = {}) {
  const routePath = require.resolve("../src/routes/yahoo");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return {
        createClient: () => ({
          from: () => ({
            upsert: async () => ({ data: null, error: null }),
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            delete: () => ({
              eq: () => ({ then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve) }),
            }),
          }),
        }),
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "test-slops-user", email: "user@example.com" };
          next();
        },
      };
    }
    if (request === "../services/appUser" && parent?.filename === routePath) {
      return { ensureAppUser: async () => {} };
    }
    if (request === "../middleware/yahooOAuth" && parent?.filename === routePath) {
      return {
        getYahooAuthUrl: () => "https://yahoo.example/oauth",
        exchangeYahooCode: async () => ({
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      };
    }
    if (request === "../services/yahooAuth" && parent?.filename === routePath) {
      return {
        getAuthenticatedYahooClient: async () => {
          if (authResult instanceof Error) throw authResult;
          return authResult;
        },
        persistYahooTokens: async () => {},
      };
    }
    if (request === "../adapters/yahoo" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (leagueKey, _accessToken, week) => ({
          week,
          league_key: String(leagueKey),
          team_key: "449.l.12345.t.7",
          slots: { starters: [], bench: [], ir: [] },
          source: "yahoo",
        }),
        fetchYahooDraft: async () => draftSnapshot(),
        ...adapterOverrides,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/yahoo");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(adapterOverrides) {
  const app = express();
  app.use(express.json());
  app.use("/api/yahoo", loadYahooRouter(adapterOverrides));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  });
  return app;
}

async function request(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/yahoo/draft requires leagueKey", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "leagueKey query param required");
});

test("GET /api/yahoo/draft returns normalized draft list", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft?leagueKey=449.l.12345");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "yahoo-draft-list.v1");
  assert.equal(res.body.drafts.length, 1);
  assert.equal(res.body.drafts[0].draft_id, "yahoo:449.l.12345");
});

test("GET /api/yahoo/draft rejects a league outside the authenticated connection", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft?leagueKey=other-league");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "yahoo_draft_not_found");
});

test("GET /api/yahoo/draft/:draftId returns draft meta", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft/yahoo:449.l.12345");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "yahoo-draft-meta.v1");
  assert.equal(res.body.draft.user_draft_slot, 1);
});

test("GET /api/yahoo/draft/:draftId/state returns state with polling hints", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft/yahoo:449.l.12345/state?since=0");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "yahoo-draft-state.v1");
  assert.equal(res.body.total_picks, 2);
  assert.equal(res.body.poll_after_seconds, 2);
  assert.equal(res.body.debounce_ms, 2000);
});

test("GET /api/yahoo/draft/:draftId/state rejects negative since", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft/yahoo:449.l.12345/state?since=-1");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "since must be a non-negative integer");
});

test("GET /api/yahoo/draft/:draftId rejects invalid synthetic draft ids", async () => {
  const res = await request(buildApp(), "/api/yahoo/draft/not-a-real-id");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "draftId path param must be a Yahoo draft id");
});

test("GET /api/yahoo/draft returns 401 when Yahoo not connected", async () => {
  authResult = Object.assign(new Error("No Yahoo connection for this user"), { status: 404 });
  const res = await request(buildApp(), "/api/yahoo/draft?leagueKey=449.l.12345");
  authResult = {
    client: {},
    accessToken: "fake-access-token",
    connection: {
      league_id: "449.l.12345",
    },
  };
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "yahoo_not_connected");
});
