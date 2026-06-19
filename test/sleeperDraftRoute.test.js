"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

const PICKS_SAMPLE = [
  {
    pick_no: 1,
    round: 1,
    draft_slot: 1,
    roster_id: 11,
    picked_by: "user-1",
    player_id: "100",
    is_keeper: false,
    metadata: { first_name: "Pat", last_name: "Mahomes", position: "QB", team: "KC" },
  },
  {
    pick_no: 2,
    round: 1,
    draft_slot: 2,
    roster_id: 12,
    picked_by: "user-2",
    player_id: "200",
    is_keeper: false,
    metadata: { first_name: "Justin", last_name: "Jefferson", position: "WR", team: "MIN" },
  },
];

function defaultAdapterStub() {
  return {
    fetchSleeperLeagueDrafts: async (leagueId) => [
      {
        draft_id: "draft-1",
        league_id: leagueId,
        status: "drafting",
        type: "snake",
        sport: "nfl",
        season: "2026",
        season_type: "regular",
        settings: { teams: 12, rounds: 15, pick_timer: 60 },
        start_time: 1693516800000,
      },
    ],
    fetchSleeperDraft: async (draftId) => ({
      draft_id: draftId,
      league_id: "league-1",
      status: "drafting",
      type: "snake",
      season: "2026",
      settings: { teams: 12, rounds: 15, pick_timer: 60 },
      slot_to_roster_id: { 1: 11, 2: 12, 3: 13 },
    }),
    fetchSleeperDraftPicks: async () => PICKS_SAMPLE,
    buildNormalizedRoster: async () => ({}),
  };
}

function loadSleeperRouter(adapterOverrides = {}) {
  const routePath = require.resolve("../src/routes/sleeper");
  delete require.cache[routePath];

  const stub = { ...defaultAdapterStub(), ...adapterOverrides };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "test-slops-user" };
          next();
        },
      };
    }
    if (request === "../adapters/sleeper" && parent?.filename === routePath) {
      return stub;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/sleeper");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(adapterOverrides) {
  const app = express();
  app.use(express.json());
  app.use("/api/sleeper", loadSleeperRouter(adapterOverrides));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/sleeper/draft requires leagueId", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "leagueId query param required");
});

test("GET /api/sleeper/draft returns normalized draft list", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft?leagueId=league-1");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "sleeper-draft-list.v1");
  assert.equal(res.body.league_id, "league-1");
  assert.equal(res.body.drafts.length, 1);
  assert.equal(res.body.drafts[0].draft_id, "draft-1");
  assert.equal(res.body.drafts[0].status, "drafting");
  assert.equal(res.body.drafts[0].settings.teams, 12);
});

test("GET /api/sleeper/draft/:draftId returns draft meta", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "sleeper-draft-meta.v1");
  assert.equal(res.body.draft_id, "draft-1");
  assert.equal(res.body.draft.settings.rounds, 15);
  assert.equal(res.body.draft.slot_to_roster_id["1"], 11);
});

test("GET /api/sleeper/draft/:draftId surfaces 404 from adapter", async () => {
  const res = await request(
    buildApp({
      fetchSleeperDraft: async () => {
        const err = new Error("Sleeper draft not found");
        err.status = 404;
        throw err;
      },
    }),
    "/api/sleeper/draft/missing",
  );
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Sleeper draft not found");
});

test("GET /api/sleeper/draft/:draftId/state returns full state from since=0", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1/state");
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "sleeper-draft-state.v1");
  assert.equal(res.body.draft_id, "draft-1");
  assert.equal(res.body.status, "drafting");
  assert.equal(res.body.total_picks, 2);
  assert.equal(res.body.has_new_picks, true);
  assert.equal(res.body.picks_since.length, 2);
  assert.equal(res.body.current_pick, 3);
  assert.equal(res.body.poll_after_seconds, 8);
  assert.equal(res.body.debounce_ms, 5000);
  assert.equal(res.body.cursor.since, 0);
  assert.equal(res.body.cursor.latest, 2);
});

test("GET /api/sleeper/draft/:draftId/state respects since cursor", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1/state?since=1");
  assert.equal(res.status, 200);
  assert.equal(res.body.has_new_picks, true);
  assert.equal(res.body.picks_since.length, 1);
  assert.equal(res.body.picks_since[0].pick_no, 2);
});

test("GET /api/sleeper/draft/:draftId/state returns empty delta when caller is current", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1/state?since=2");
  assert.equal(res.status, 200);
  assert.equal(res.body.has_new_picks, false);
  assert.deepEqual(res.body.picks_since, []);
  assert.equal(res.body.cursor.since, 2);
});

test("GET /api/sleeper/draft/:draftId/state rejects negative since", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1/state?since=-3");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "since must be a non-negative integer");
});

test("GET /api/sleeper/draft/:draftId/state rejects non-numeric since", async () => {
  const res = await request(buildApp(), "/api/sleeper/draft/draft-1/state?since=abc");
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "since must be a non-negative integer");
});

test("GET /api/sleeper/draft/:draftId/state surfaces 404 from adapter", async () => {
  const res = await request(
    buildApp({
      fetchSleeperDraft: async () => {
        const err = new Error("Sleeper draft not found");
        err.status = 404;
        throw err;
      },
    }),
    "/api/sleeper/draft/missing/state",
  );
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Sleeper draft not found");
});

test("GET /api/sleeper/draft/:draftId/state poll_after long-polls when complete", async () => {
  const res = await request(
    buildApp({
      fetchSleeperDraft: async () => ({
        draft_id: "draft-1",
        status: "complete",
        type: "snake",
        season: "2026",
        settings: { teams: 2, rounds: 2, pick_timer: 60 },
      }),
      fetchSleeperDraftPicks: async () => [
        { pick_no: 1, round: 1, draft_slot: 1, roster_id: 11, player_id: "100" },
        { pick_no: 2, round: 1, draft_slot: 2, roster_id: 12, player_id: "200" },
        { pick_no: 3, round: 2, draft_slot: 2, roster_id: 12, player_id: "300" },
        { pick_no: 4, round: 2, draft_slot: 1, roster_id: 11, player_id: "400" },
      ],
    }),
    "/api/sleeper/draft/draft-1/state?since=4",
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "complete");
  assert.equal(res.body.current_pick, null);
  assert.equal(res.body.on_the_clock, null);
  assert.equal(res.body.poll_after_seconds, 300);
});
