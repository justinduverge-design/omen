"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");
const { createMemoryTradeSavedQueueStore } = require("../src/services/tradeSavedQueueStore");
const { createMemoryTradeFindCache } = require("../src/services/tradeFindCacheStore");
const { createSupabaseSavedTradesStore } = require("../src/services/savedTradesStore");
const { createFakeSavedTradesSupabase } = require("./fixtures/fakeSavedTradesSupabase");

// T4 on the `saved_trades` table (redo step 12). The app still sends only
// `save_action(candidate_id, reasoning)`; the server resolves the trade from the
// caller's own kept `/find` batch (decision log 2026-10-02).

function reasoning(overrides = {}) {
  return {
    fills_need_for: ["user"],
    user_receives: { position: "RB", need: { status: "hole", have: 1, required: 2 } },
    opponent_receives: { position: "WR", need: { status: "surplus", have: 4, required: 2 } },
    evidence: ["live_roster_depth", "live_lineup_projection_delta"],
    ...overrides,
  };
}

// The one-for-one improvement fixture from tradeFindRoute.test.js, so /find returns a candidate.
const ROSTER_POSITIONS = ["RB", "RB", "WR"];
function player(id, position, points) {
  return { player_id: id, player_key: id, name: id, position, eligible_positions: [position], selected_position: "BN", projected_points: points };
}
function sleeperFixture() {
  return {
    league_status: "in_season",
    roster_positions: ROSTER_POSITIONS,
    teams: [
      { roster_id: "1", team_name: "Own Team", players: [player("my-rb", "RB", 18), player("rb-one", "RB", 20), player("rb-two", "RB", 19), player("low-wr", "WR", 5)] },
      { roster_id: "2", team_name: "Rival", players: [player("their-wr", "WR", 12), player("wr-one", "WR", 20), player("wr-two", "WR", 19), player("low-rb", "RB", 5)] },
    ],
  };
}

function buildApp({
  authenticate = async (header) => ({ id: header === "Bearer user-2" ? "user-2" : "user-1" }),
  fetchLeagueRosters = async () => sleeperFixture(),
  nflWeekContext = () => ({ season: 2026, week: 3 }),
  fake = createFakeSavedTradesSupabase(),
  savedTradesStore = createSupabaseSavedTradesStore({ client: fake }),
  tradeSavedQueueStore = createMemoryTradeSavedQueueStore(),
  tradeFindCache = createMemoryTradeFindCache(),
  now,
} = {}) {
  const router = tradeRoutes.createTradeRouter({
    authenticate,
    fetchLeagueRosters,
    nflWeekContext,
    savedTradesStore,
    tradeSavedQueueStore,
    tradeFindCache,
    ...(now ? { now } : {}),
  });
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return { app, fake };
}

async function request(app, { method = "GET", path, body, headers = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") || "";
    const parsedBody = contentType.includes("application/json") ? await res.json() : await res.text();
    return { status: res.status, body: parsedBody };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const AUTH = { authorization: "Bearer user-1" };
const FIND_PATH = "/api/trade/find?platform=sleeper&league_id=abc&team_id=1";

async function findCandidate(app, headers = AUTH) {
  const res = await request(app, { path: FIND_PATH, headers });
  assert.equal(res.status, 200);
  assert.ok(res.body.candidates.length > 0, "fixture must yield a candidate");
  return res.body.candidates[0];
}

async function save(app, candidateId, body = {}, headers = AUTH) {
  return request(app, { method: "POST", path: "/api/trade/saved", headers, body: { candidate_id: candidateId, reasoning: reasoning(), ...body } });
}

function enc(id) {
  return encodeURIComponent(id);
}

// --- Auth ---------------------------------------------------------------------

for (const [method, path] of [
  ["POST", "/api/trade/saved"],
  ["GET", "/api/trade/saved"],
  ["POST", "/api/trade/saved/c1/sent"],
  ["POST", "/api/trade/saved/c1/outcome"],
  ["DELETE", "/api/trade/saved/c1"],
]) {
  test(`${method} ${path} requires authentication`, async () => {
    const { app } = buildApp({ authenticate: async () => { throw new Error("no session"); } });
    const res = await request(app, { method, path, body: method === "GET" || method === "DELETE" ? undefined : { candidate_id: "c1", reasoning: reasoning(), outcome: "accepted" } });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, "trade_saved_auth_required");
  });
}

// --- Save -----------------------------------------------------------------------

test("POST /api/trade/saved requires candidate_id and reasoning", async () => {
  const { app } = buildApp();
  const noId = await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { reasoning: reasoning() } });
  assert.equal(noId.status, 400);
  assert.equal(noId.body.code, "trade_saved_candidate_id_required");
  const noReasoning = await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1" } });
  assert.equal(noReasoning.status, 400);
  assert.equal(noReasoning.body.code, "trade_saved_reasoning_required");
});

test("/find issues a batch token in every candidate id, so the same swap gets a new id on each search", async () => {
  const { app } = buildApp();
  const first = await findCandidate(app);
  const second = await findCandidate(app);
  assert.match(first.id, /^[0-9a-f]{16}\.find_/);
  assert.notEqual(first.id, second.id);
  assert.equal(first.id.split(".").slice(1).join("."), second.id.split(".").slice(1).join("."));
});

test("save with only candidate_id + reasoning writes one table row with the trade and scope the server showed", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app);
  const res = await save(app, candidate.id);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: "saved" });

  assert.equal(fake.db.rows.length, 1);
  const row = fake.db.rows[0];
  assert.equal(row.user_id, "user-1");
  assert.equal(row.provider, "sleeper");
  assert.equal(row.provider_league_id, "abc");
  assert.equal(row.season, 2026);
  assert.equal(row.week, 3);
  assert.equal(row.provider_team_id, "1");
  assert.equal(row.candidate_id, candidate.id);
  assert.equal(row.trade.give.player_key, candidate.give.player_key);
  assert.equal(row.trade.receive.player_key, candidate.receive.player_key);
  assert.equal(row.trade.opponent_team_id, candidate.opponent_team_id);
  assert.deepEqual(row.reasoning, reasoning());
  assert.equal(row.state, "saved");
});

test("save ignores client-supplied trade fields: the trade comes only from the server's kept batch", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id, { platform: "espn", league_id: "other", team_id: "9", give: { player_key: "forged" } });
  const row = fake.db.rows[0];
  assert.equal(row.provider, "sleeper");
  assert.equal(row.provider_league_id, "abc");
  assert.equal(row.trade.give.player_key, candidate.give.player_key);
});

test("an id the server never showed this user returns an error the app turns into 'refresh the search', and writes nothing", async () => {
  const { app, fake } = buildApp();
  const res = await save(app, "0123456789abcdef.find_2_x_y");
  assert.equal(res.status, 410);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_candidate_expired");
  const bare = await save(app, "c1");
  assert.equal(bare.body.code, "trade_saved_candidate_expired");
  assert.equal(fake.db.rows.length, 0);
});

test("one user cannot save a candidate from another user's search", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app, AUTH);
  const res = await save(app, candidate.id, {}, { authorization: "Bearer user-2" });
  assert.equal(res.status, 410);
  assert.equal(fake.db.rows.length, 0);
});

test("saving twice is idempotent and keeps the ORIGINAL reasoning verbatim", async () => {
  const { app } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const second = await save(app, candidate.id, { reasoning: reasoning({ evidence: ["a_later_reasoning"] }) });
  assert.equal(second.status, 200);
  assert.equal(second.body.status, "saved");

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items.length, 1);
  assert.deepEqual(list.body.items[0].reasoning, reasoning());
});

test("two saves at once both survive (the Redis blob could drop one)", async () => {
  const { app } = buildApp({
    fetchLeagueRosters: async () => {
      const f = sleeperFixture();
      f.teams.push({ roster_id: "3", team_name: "Rival 2", players: f.teams[1].players.map((p) => ({ ...p, player_id: `r2-${p.player_id}`, player_key: `r2-${p.player_key}` })) });
      return f;
    },
  });
  const res = await request(app, { path: FIND_PATH, headers: AUTH });
  const ids = res.body.candidates.slice(0, 2).map((c) => c.id);
  assert.equal(ids.length, 2);
  await Promise.all(ids.map((id) => save(app, id)));
  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.deepEqual(list.body.items.map((i) => i.candidate_id).sort(), ids.slice().sort());
});

test("save answers 503 {status:'error'} when the table cannot be written, never a fabricated success", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app);
  fake.db.failWith = { code: "08006", message: "connection failure" };
  const res = await save(app, candidate.id);
  assert.equal(res.status, 503);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_queue_storage_unavailable");
});

// --- List --------------------------------------------------------------------------

test("the list keeps the trade-saved-queue.v1 item shape, read from the table", async () => {
  const { app } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const res = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "trade-saved-queue.v1");
  assert.equal(res.body.status, "ok");
  const item = res.body.items[0];
  assert.deepEqual(Object.keys(item).sort(), [
    "candidate_id", "give", "opponent_team_id", "opponent_team_name", "outcome", "outcome_reported_at",
    "reasoning", "receive", "saved_at", "sent_at", "staleness", "state",
  ]);
  assert.equal(item.candidate_id, candidate.id);
  assert.equal(item.state, "saved");
  assert.equal(item.outcome, null);
  assert.equal(item.give.player_key, candidate.give.player_key);
  assert.equal(item.opponent_team_name, "Rival");
});

test("saved trades are private per user", async () => {
  const { app } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const other = await request(app, { path: "/api/trade/saved", headers: { authorization: "Bearer user-2" } });
  assert.equal(other.status, 200);
  assert.equal(other.body.items.length, 0);
  const sent = await request(app, { method: "POST", path: `/api/trade/saved/${enc(candidate.id)}/sent`, headers: { authorization: "Bearer user-2" } });
  assert.equal(sent.status, 404);
  const del = await request(app, { method: "DELETE", path: `/api/trade/saved/${enc(candidate.id)}`, headers: { authorization: "Bearer user-2" } });
  assert.equal(del.status, 404);
});

test("GET answers 503 when the table cannot be read", async () => {
  const { app, fake } = buildApp();
  fake.db.failWith = { code: "08006", message: "down" };
  const res = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "trade_saved_queue_storage_unavailable");
});

// --- Sent and outcome -------------------------------------------------------------

test("sent: saved -> sent once, idempotent, 404 for an unknown id", async () => {
  const { app } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const first = await request(app, { method: "POST", path: `/api/trade/saved/${enc(candidate.id)}/sent`, headers: AUTH });
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "sent");
  assert.equal(first.body.candidate_id, candidate.id);
  assert.ok(first.body.sent_at);
  const again = await request(app, { method: "POST", path: `/api/trade/saved/${enc(candidate.id)}/sent`, headers: AUTH });
  assert.equal(again.status, 200);
  assert.equal(again.body.sent_at, first.body.sent_at, "a repeat call never moves sent_at");

  const unknown = await request(app, { method: "POST", path: "/api/trade/saved/nope/sent", headers: AUTH });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.code, "trade_saved_not_found");
});

test("outcome: refused before sent, validated, self-reported and correctable after sent", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const path = `/api/trade/saved/${enc(candidate.id)}/outcome`;

  const early = await request(app, { method: "POST", path, headers: AUTH, body: { outcome: "accepted" } });
  assert.equal(early.status, 409);
  assert.equal(early.body.code, "trade_saved_not_sent");

  await request(app, { method: "POST", path: `/api/trade/saved/${enc(candidate.id)}/sent`, headers: AUTH });
  const bad = await request(app, { method: "POST", path, headers: AUTH, body: { outcome: "maybe_later" } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, "trade_saved_invalid_outcome");

  for (const outcome of ["accepted", "rejected", "countered"]) {
    const res = await request(app, { method: "POST", path, headers: AUTH, body: { outcome } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "ok", candidate_id: candidate.id, outcome });
    assert.equal(fake.db.rows[0].outcome, outcome);
    assert.equal(fake.db.rows[0].outcome_provenance, "self_reported");
  }

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].outcome, "countered");
  assert.ok(list.body.items[0].outcome_reported_at);

  const unknown = await request(app, { method: "POST", path: "/api/trade/saved/nope/outcome", headers: AUTH, body: { outcome: "accepted" } });
  assert.equal(unknown.status, 404);
});

test("outcome stays null after sent until self-reported", async () => {
  const { app } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  await request(app, { method: "POST", path: `/api/trade/saved/${enc(candidate.id)}/sent`, headers: AUTH });
  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].state, "sent");
  assert.equal(list.body.items[0].outcome, null);
});

// --- Unsave -------------------------------------------------------------------------

test("DELETE /api/trade/saved/:id removes the row; a second delete is 404", async () => {
  const { app, fake } = buildApp();
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const res = await request(app, { method: "DELETE", path: `/api/trade/saved/${enc(candidate.id)}`, headers: AUTH });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: "deleted", candidate_id: candidate.id });
  assert.equal(fake.db.rows.length, 0);
  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items.length, 0);
  const again = await request(app, { method: "DELETE", path: `/api/trade/saved/${enc(candidate.id)}`, headers: AUTH });
  assert.equal(again.status, 404);
  assert.equal(again.body.code, "trade_saved_not_found");
});

// --- Staleness -------------------------------------------------------------------------

test("staleness re-checks against the saved row's own league and team, no query params needed", async () => {
  let fixture = sleeperFixture();
  const { app } = buildApp({ fetchLeagueRosters: async () => fixture });
  const candidate = await findCandidate(app);
  await save(app, candidate.id, { reasoning: candidate.reasoning });

  const fresh = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(fresh.body.items[0].staleness.status, "fresh");

  // The caller's own team loses its receive-position depth: the saved need no longer holds.
  fixture = sleeperFixture();
  const receivePosition = candidate.reasoning.user_receives.position;
  fixture.teams[0].players = fixture.teams[0].players.filter((p) => p.position !== receivePosition);
  // The /find cache would otherwise keep serving the old rosters to /roster readers; staleness reads live.
  const stale = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(stale.body.items[0].staleness.status, "stale");
});

// --- Transition: read fallback to #519's Redis blob ---------------------------------------

function legacyItem(overrides = {}) {
  return {
    candidate_id: "legacy-1", reasoning: reasoning(), give: null, receive: null, opponent_team_id: null,
    opponent_team_name: null, platform: null, league_id: null, team_id: null, state: "saved", outcome: null,
    saved_at: "2026-10-01T00:00:00.000Z", sent_at: null, outcome_reported_at: null, ...overrides,
  };
}

test("GET lists table rows first, then legacy Redis items not yet in the table", async () => {
  const legacy = createMemoryTradeSavedQueueStore();
  const { app } = buildApp({ tradeSavedQueueStore: legacy });
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  await legacy.writeAll("user-1", [legacyItem(), legacyItem({ candidate_id: candidate.id, state: "sent", sent_at: "2026-10-01T01:00:00.000Z" })]);

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.deepEqual(list.body.items.map((i) => i.candidate_id), [candidate.id, "legacy-1"]);
  assert.equal(list.body.items[0].state, "saved", "the table row wins over a legacy item with the same id");
  assert.equal(list.body.items[1].staleness.status, "unknown");
});

test("a legacy-only item can still be marked sent, given an outcome, and unsaved", async () => {
  const legacy = createMemoryTradeSavedQueueStore();
  await legacy.writeAll("user-1", [legacyItem()]);
  const { app } = buildApp({ tradeSavedQueueStore: legacy });

  const sent = await request(app, { method: "POST", path: "/api/trade/saved/legacy-1/sent", headers: AUTH });
  assert.equal(sent.status, 200);
  const outcome = await request(app, { method: "POST", path: "/api/trade/saved/legacy-1/outcome", headers: AUTH, body: { outcome: "rejected" } });
  assert.equal(outcome.status, 200);
  assert.equal((await legacy.readAll("user-1"))[0].outcome, "rejected");

  const del = await request(app, { method: "DELETE", path: "/api/trade/saved/legacy-1", headers: AUTH });
  assert.equal(del.status, 200);
  assert.deepEqual(await legacy.readAll("user-1"), []);
});

test("an unavailable legacy store never blocks the table-backed list", async () => {
  const legacy = {
    kind: "redis",
    async readAll() { throw Object.assign(new Error("down"), { code: "trade_saved_queue_storage_unavailable" }); },
    async writeAll() { throw new Error("down"); },
  };
  const { app } = buildApp({ tradeSavedQueueStore: legacy });
  const candidate = await findCandidate(app);
  await save(app, candidate.id);
  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
});

// --- Private/public exposure ---------------------------------------------------------------

test("POST /api/trade/share ignores saved-queue fields and never exposes reasoning/candidate_id", async () => {
  const { app } = buildApp();
  const shareRes = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: {
      send: [{ name: "Bench RB", position: "RB", team: "SEA", projected_points: 10 }],
      receive: [{ name: "Starter WR", position: "WR", team: "DET", projected_points: 14 }],
      scoring_format: "ppr",
      candidate_id: "c1",
      reasoning: reasoning(),
    },
  });
  assert.equal(shareRes.status, 201);
  const readRes = await request(app, { path: `/api/trade/share/${shareRes.body.hash}` });
  assert.equal(readRes.status, 200);
  const serialized = JSON.stringify(readRes.body);
  assert.ok(!serialized.includes("reasoning"));
  assert.ok(!serialized.includes("candidate_id"));
});

test("a saved candidate id never resolves on the public share surface", async () => {
  const { app } = buildApp();
  const res = await request(app, { path: "/api/trade/share/leaky-candidate" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_trade_share_hash");
});
