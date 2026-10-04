"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");
const { createMemoryTradeSavedQueueStore } = require("../src/services/tradeSavedQueueStore");

// A minimal reasoning payload in T2's exact shape (`buildReasoning()` in the
// T2 worktree's `src/services/tradeFind.js`, read-only reference). Position-
// level need evidence only — no player identity, per the real save-action
// interface's own two-argument signature.
function reasoning(overrides = {}) {
  return {
    fills_need_for: ["user"],
    user_receives: { position: "RB", need: { status: "hole", have: 1, required: 2 } },
    opponent_receives: { position: "WR", need: { status: "surplus", have: 4, required: 2 } },
    evidence: ["live_roster_depth", "live_lineup_projection_delta"],
    ...overrides,
  };
}

const SLEEPER_FIXTURE = {
  league_status: "in_season",
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "BN"],
  teams: [
    {
      roster_id: "1",
      team_name: "Own Team",
      players: [{ player_key: "sleeper:100", name: "Own RB", position: "RB", selected_position: "RB" }],
    },
    {
      roster_id: "2",
      team_name: "Opponent Team",
      players: [{ player_key: "sleeper:200", name: "Opponent WR", position: "WR", selected_position: "WR" }],
    },
  ],
};

function buildApp({
  authenticate = async () => ({ id: "user-1" }),
  fetchLeagueRosters = async () => SLEEPER_FIXTURE,
  nflWeekContext = () => ({ week: 3 }),
  tradeSavedQueueStore = createMemoryTradeSavedQueueStore(),
  now,
} = {}) {
  const router = tradeRoutes.createTradeRouter({
    authenticate,
    fetchLeagueRosters,
    nflWeekContext,
    tradeSavedQueueStore,
    ...(now ? { now } : {}),
  });
  const app = express();
  app.use(express.json());
  app.use("/api/trade", router);
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
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

const AUTH = { authorization: "Bearer t" };

// --- Auth: every saved-queue endpoint is private by construction -----------

test("POST /api/trade/saved requires authentication", async () => {
  const app = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await request(app, { method: "POST", path: "/api/trade/saved", body: { candidate_id: "c1", reasoning: reasoning() } });
  assert.equal(res.status, 401);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_auth_required");
});

test("GET /api/trade/saved requires authentication", async () => {
  const app = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await request(app, { path: "/api/trade/saved" });
  assert.equal(res.status, 401);
});

test("POST /api/trade/saved/:id/sent requires authentication", async () => {
  const app = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await request(app, { method: "POST", path: "/api/trade/saved/c1/sent" });
  assert.equal(res.status, 401);
});

test("POST /api/trade/saved/:id/outcome requires authentication", async () => {
  const app = buildApp({ authenticate: async () => { throw new Error("no session"); } });
  const res = await request(app, { method: "POST", path: "/api/trade/saved/c1/outcome", body: { outcome: "accepted" } });
  assert.equal(res.status, 401);
});

// --- Save: matches the documented stub shape exactly ------------------------
// `save_action(candidate_id, reasoning) -> { status: "saved" | "error" }`

test("POST /api/trade/saved requires candidate_id", async () => {
  const app = buildApp();
  const res = await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { reasoning: reasoning() } });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_candidate_id_required");
});

test("POST /api/trade/saved requires reasoning", async () => {
  const app = buildApp();
  const res = await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1" } });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_reasoning_required");
});

test("POST /api/trade/saved with only candidate_id + reasoning (the exact stub shape) returns {status: 'saved'}", async () => {
  const app = buildApp();
  const res = await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: { candidate_id: "c1", reasoning: reasoning() },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "saved");
});

test("a saved candidate appears in the list with state saved, outcome null, and reasoning retained verbatim", async () => {
  const app = buildApp();
  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: { candidate_id: "c1", reasoning: reasoning() },
  });

  const res = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "trade-saved-queue.v1");
  assert.equal(res.body.items.length, 1);

  const item = res.body.items[0];
  assert.equal(item.candidate_id, "c1");
  assert.equal(item.state, "saved");
  assert.equal(item.outcome, null, "outcome must never default to anything but null");
  assert.deepEqual(item.reasoning, reasoning(), "reasoning must be retained verbatim, not regenerated");
});

test("saving the same candidate_id twice is idempotent and keeps the ORIGINAL reasoning verbatim", async () => {
  const app = buildApp();
  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: { candidate_id: "c1", reasoning: reasoning() },
  });
  const second = await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: { candidate_id: "c1", reasoning: reasoning({ evidence: ["a_totally_different_later_reasoning"] }) },
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.status, "saved");

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items.length, 1, "re-saving must not create a duplicate row");
  assert.deepEqual(list.body.items[0].reasoning, reasoning(), "the SECOND save must not overwrite the original reasoning");
});

test("saved candidates are private per-user: user-2 cannot see user-1's saved queue", async () => {
  let callCount = 0;
  const authenticate = async (header) => {
    callCount += 1;
    if (header === "Bearer user-1") return { id: "user-1" };
    return { id: "user-2" };
  };
  const store = createMemoryTradeSavedQueueStore();
  const app = buildApp({ authenticate, tradeSavedQueueStore: store });

  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: { authorization: "Bearer user-1" },
    body: { candidate_id: "c1", reasoning: reasoning() },
  });

  const otherUsersList = await request(app, { path: "/api/trade/saved", headers: { authorization: "Bearer user-2" } });
  assert.equal(otherUsersList.status, 200);
  assert.equal(otherUsersList.body.items.length, 0);
  assert.ok(callCount >= 2);
});

// --- Mark sent ---------------------------------------------------------------

test("POST /api/trade/saved/:id/sent transitions state to sent", async () => {
  const app = buildApp();
  await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });

  const res = await request(app, { method: "POST", path: "/api/trade/saved/c1/sent", headers: AUTH });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "sent");

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].state, "sent");
  assert.ok(list.body.items[0].sent_at);
});

test("POST /api/trade/saved/:id/sent 404s for an unknown candidate", async () => {
  const app = buildApp();
  const res = await request(app, { method: "POST", path: "/api/trade/saved/does-not-exist/sent", headers: AUTH });
  assert.equal(res.status, 404);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_not_found");
});

// --- Self-report outcome: never inferred, never a fourth option -------------

test("POST /api/trade/saved/:id/outcome is refused before the candidate has been marked sent", async () => {
  const app = buildApp();
  await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });

  const res = await request(app, {
    method: "POST",
    path: "/api/trade/saved/c1/outcome",
    headers: AUTH,
    body: { outcome: "accepted" },
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_not_sent");
});

test("POST /api/trade/saved/:id/outcome rejects anything outside accepted|rejected|countered", async () => {
  const app = buildApp();
  await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });
  await request(app, { method: "POST", path: "/api/trade/saved/c1/sent", headers: AUTH });

  const res = await request(app, {
    method: "POST",
    path: "/api/trade/saved/c1/outcome",
    headers: AUTH,
    body: { outcome: "maybe_later" },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_invalid_outcome");
});

for (const outcome of ["accepted", "rejected", "countered"]) {
  test(`POST /api/trade/saved/:id/outcome accepts self-reported "${outcome}" once sent`, async () => {
    const app = buildApp();
    await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });
    await request(app, { method: "POST", path: "/api/trade/saved/c1/sent", headers: AUTH });

    const res = await request(app, {
      method: "POST",
      path: "/api/trade/saved/c1/outcome",
      headers: AUTH,
      body: { outcome },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.outcome, outcome);

    const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
    assert.equal(list.body.items[0].outcome, outcome);
    assert.ok(list.body.items[0].outcome_reported_at);
  });
}

test("outcome stays null until explicitly self-reported — never inferred from the sent transition alone", async () => {
  const app = buildApp();
  await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });
  await request(app, { method: "POST", path: "/api/trade/saved/c1/sent", headers: AUTH });

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].state, "sent");
  assert.equal(list.body.items[0].outcome, null);
});

// --- Staleness ---------------------------------------------------------------

test("staleness is unknown when the save carried no league context to re-check against", async () => {
  const app = buildApp();
  await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].staleness.status, "unknown");
  assert.equal(list.body.items[0].staleness.reason, "insufficient_context_for_staleness_check");
});

test("staleness is fresh when the live roster still matches the need snapshot taken at save time", async () => {
  const app = buildApp();
  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: {
      candidate_id: "c1",
      reasoning: reasoning(),
      platform: "sleeper",
      league_id: "abc",
      team_id: "1",
    },
  });

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].staleness.status, "fresh");
});

test("staleness flags a materially changed roster need with a named reason, never silently re-presenting stale reasoning as current", async () => {
  // Own team now has 2 RBs instead of 1 -> need flips from hole to balanced.
  const changedFixture = {
    league_status: "in_season",
    roster_positions: ["QB", "RB", "RB", "WR", "WR", "BN"],
    teams: [
      {
        roster_id: "1",
        team_name: "Own Team",
        players: [
          { player_key: "sleeper:100", name: "Own RB", position: "RB", selected_position: "RB" },
          { player_key: "sleeper:101", name: "Own RB 2", position: "RB", selected_position: "RB" },
        ],
      },
      {
        roster_id: "2",
        team_name: "Opponent Team",
        players: [{ player_key: "sleeper:200", name: "Opponent WR", position: "WR", selected_position: "WR" }],
      },
    ],
  };

  const app = buildApp({ fetchLeagueRosters: async () => changedFixture });
  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: {
      candidate_id: "c1",
      reasoning: reasoning(),
      platform: "sleeper",
      league_id: "abc",
      team_id: "1",
    },
  });

  const list = await request(app, { path: "/api/trade/saved", headers: AUTH });
  assert.equal(list.body.items[0].staleness.status, "stale");
  assert.equal(list.body.items[0].staleness.reason, "needs_profile_changed");
});

// --- Storage failure ----------------------------------------------------------

test("POST /api/trade/saved answers {status: 'error'} with 503 when the store is unavailable, never a fabricated success", async () => {
  const store = {
    async readAll() { throw Object.assign(new Error("down"), { code: "trade_saved_queue_storage_unavailable" }); },
    async writeAll() { throw Object.assign(new Error("down"), { code: "trade_saved_queue_storage_unavailable" }); },
  };
  const app = buildApp({ tradeSavedQueueStore: store });
  const res = await request(app, { method: "POST", path: "/api/trade/saved", headers: AUTH, body: { candidate_id: "c1", reasoning: reasoning() } });
  assert.equal(res.status, 503);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.code, "trade_saved_queue_storage_unavailable");
});

// --- Private/public exposure: a saved candidate's reasoning must never leak
// into the existing share surfaces --------------------------------------------

test("POST /api/trade/share ignores extraneous saved-queue fields and never exposes reasoning/candidate_id in the public snapshot", async () => {
  const app = buildApp();
  const shareRes = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: {
      send: [{ name: "Bench RB", position: "RB", team: "SEA", projected_points: 10 }],
      receive: [{ name: "Starter WR", position: "WR", team: "DET", projected_points: 14 }],
      scoring_format: "ppr",
      // Smuggled in to prove the share path cannot be made to carry it.
      candidate_id: "c1",
      reasoning: reasoning(),
    },
  });
  assert.equal(shareRes.status, 201);

  const readRes = await request(app, { path: `/api/trade/share/${shareRes.body.hash}` });
  assert.equal(readRes.status, 200);
  const serialized = JSON.stringify(readRes.body);
  assert.ok(!serialized.includes("reasoning"), "public share snapshot must never carry saved-candidate reasoning");
  assert.ok(!serialized.includes("candidate_id"), "public share snapshot must never carry a saved-candidate id");
});

test("a saved candidate's reasoning is never reachable through the public share read/write surface", async () => {
  const app = buildApp();
  await request(app, {
    method: "POST",
    path: "/api/trade/saved",
    headers: AUTH,
    body: { candidate_id: "leaky-candidate", reasoning: reasoning({ evidence: ["do_not_leak_this_evidence_string"] }) },
  });

  // The share store and the saved-queue store are separate objects with no
  // code path connecting them (see src/routes/trade.js) — a lookup by the
  // saved candidate's id against the public share surface must 400 on the
  // hash shape, never somehow resolve to the private record.
  const res = await request(app, { path: "/api/trade/share/leaky-candidate" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_trade_share_hash");
});
