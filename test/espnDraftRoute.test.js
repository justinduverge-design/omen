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
    league_id: "12345",
    draft_id: "espn:12345",
    status: "drafting",
    type: "snake",
    sport: "nfl",
    season: "2026",
    season_type: "regular",
    settings: { teams: 3, rounds: 5, pick_timer: 45 },
    start_time: 1724516400000,
    created: null,
    user_draft_slot: 1,
    slot_to_roster_id: { 1: "11", 2: "12", 3: "13" },
    picks: [
      {
        pick_no: 1,
        round: 1,
        draft_slot: 1,
        roster_id: "11",
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
        roster_id: "12",
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

let mockConnRow = {
  espn_secret_id: "secret-espn-s2",
  swid_secret_id: "secret-swid",
  league_id: "12345",
  espn_team_id: "11",
};

let mockVaultDecryptFn = async (secretId) => {
  if (secretId === "secret-espn-s2") return { data: { decrypted_secret: "fake-s2" }, error: null };
  if (secretId === "secret-swid") return { data: { decrypted_secret: "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}" }, error: null };
  return { data: null, error: null };
};

function loadEspnRouter(adapterOverrides = {}) {
  const routePath = require.resolve("../src/routes/espn");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return {
        createClient: () => ({
          from: (_table) => ({
            select: (_cols) => ({
              eq: (_col1, _val1) => ({
                eq: (_col2, _val2) => ({
                  maybeSingle: async () => ({
                    data: mockConnRow,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          rpc: async (_fn, args) => mockVaultDecryptFn(args.secret_id),
        }),
      };
    }
    if (request === "../config" && parent?.filename === routePath) {
      return { supabaseUrl: "https://example.supabase.co", supabaseServiceKey: "test-key" };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "test-slops-user" };
          next();
        },
      };
    }
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (leagueId, _espnS2, _swid, week) => ({
          week,
          league_key: String(leagueId),
          team_key: "11",
          slots: { starters: [], bench: [], ir: [] },
          source: "espn",
        }),
        fetchEspnDraft: async () => draftSnapshot(),
        ...adapterOverrides,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/espn");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(adapterOverrides) {
  const app = express();
  app.use(express.json());
  app.use("/api/espn", loadEspnRouter(adapterOverrides));
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

test("GET /api/espn/draft requires leagueId", async () => {
  const res = await request(buildApp(), "/api/espn/draft");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "leagueId query param required");
});

test("GET /api/espn/draft returns normalized draft list", async () => {
  const res = await request(buildApp(), "/api/espn/draft?leagueId=12345");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "espn-draft-list.v1");
  assert.equal(res.body.drafts.length, 1);
  assert.equal(res.body.drafts[0].draft_id, "espn:12345");
});

test("GET /api/espn/draft rejects a league outside the authenticated connection", async () => {
  const res = await request(buildApp(), "/api/espn/draft?leagueId=other-league");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "espn_draft_not_found");
});

test("GET /api/espn/draft/:draftId returns draft meta", async () => {
  const res = await request(buildApp(), "/api/espn/draft/espn:12345");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "espn-draft-meta.v1");
  assert.equal(res.body.draft.user_draft_slot, 1);
});

test("GET /api/espn/draft/:draftId/state returns state with polling hints", async () => {
  const res = await request(buildApp(), "/api/espn/draft/espn:12345/state?since=0");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "espn-draft-state.v1");
  assert.equal(res.body.total_picks, 2);
  assert.equal(res.body.poll_after_seconds, 2);
  assert.equal(res.body.debounce_ms, 2000);
});

test("GET /api/espn/draft/:draftId/state rejects negative since", async () => {
  const res = await request(buildApp(), "/api/espn/draft/espn:12345/state?since=-1");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "since must be a non-negative integer");
});

test("GET /api/espn/draft/:draftId rejects invalid synthetic draft ids", async () => {
  const res = await request(buildApp(), "/api/espn/draft/not-a-real-id");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "draftId path param must be an ESPN draft id");
});

test("GET /api/espn/draft returns 401 when ESPN not connected", async () => {
  mockConnRow = null;
  const res = await request(buildApp(), "/api/espn/draft?leagueId=12345");
  mockConnRow = {
    espn_secret_id: "secret-espn-s2",
    swid_secret_id: "secret-swid",
    league_id: "12345",
    espn_team_id: "11",
  };
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "espn_not_connected");
});
