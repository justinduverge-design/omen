"use strict";

/**
 * Player-search rate limiting — the budget, its isolation, and the invariant
 * that makes a generous budget actually reachable.
 *
 * Context: `/api/players` used to share one 30/min/IP bucket with `/api/trade`,
 * `/api/demo`, `/api/draft-assistant` and `/api/waitlist`. Autocomplete fires
 * per keystroke, so typing two player names could exhaust the budget for
 * LLM-backed trade analysis — and, because the client rendered every failure as
 * "no results" (`F-BAR-34`), the user was told the player did not exist.
 *
 * As in `hotRouteRateLimits.test.js`, every assertion here is made by driving
 * real requests through the *shipped* middleware instances until they 429,
 * never by reading the config object and agreeing with it.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");

const {
  generalRateLimit,
  publicToolRateLimit,
  playerSearchRateLimit,
  PLAYER_SEARCH_PER_MINUTE,
} = require("../src/middleware/security");

function buildApp() {
  const app = express();
  // Exactly what src/server.js sets — one proxy hop (Nginx). A permissive
  // setting here would test a configuration Omen does not run.
  app.set("trust proxy", 1);
  // Mirrors src/server.js: the app-wide limiter runs first for /api/*, then the
  // per-prefix limiter. If either stops being mounted, this suite goes red.
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    return generalRateLimit(req, res, next);
  });
  app.use("/api/players", playerSearchRateLimit, (req, res) => res.json([]));
  app.use("/api/trade", publicToolRateLimit, (req, res) => res.json({ ok: true }));
  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, path, ip) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "GET", headers: { "X-Forwarded-For": ip } },
      (res) => {
        let body = "";
        res.on("data", (c) => { body += c; });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/** Drives requests until one is rejected, and reports how many got through. */
async function drainUntil429(server, path, ip, cap) {
  for (let sent = 1; sent <= cap; sent++) {
    const res = await request(server, path, ip);
    if (res.status === 429) return { allowed: sent - 1, body: res.body };
  }
  return { allowed: cap, body: null };
}

test("player search serves its full documented budget before rejecting", async (t) => {
  const server = await listen(buildApp());
  t.after(() => server.close());

  const { allowed, body } = await drainUntil429(
    server, "/api/players/search?q=jefferson", "203.0.113.10", PLAYER_SEARCH_PER_MINUTE + 5,
  );

  assert.equal(allowed, PLAYER_SEARCH_PER_MINUTE);
  assert.match(body, /player_search_rate_limited/);
});

test("the dedicated budget is not shadowed by the app-wide limiter", async (t) => {
  // The trap this asserts against: raising a per-route budget above the
  // app-wide `/api/*` budget makes the raise meaningless, because the app-wide
  // limiter trips first and the route never reaches its own number. The two
  // limits have to be read together or a generous limit is a fiction.
  const server = await listen(buildApp());
  t.after(() => server.close());

  const { allowed } = await drainUntil429(
    server, "/api/players/search?q=x", "203.0.113.11", PLAYER_SEARCH_PER_MINUTE + 5,
  );

  assert.equal(
    allowed, PLAYER_SEARCH_PER_MINUTE,
    "the app-wide limiter must sit above the player-search budget, not below it",
  );
});

test("exhausting player search does not lock the user out of trade analysis", async (t) => {
  // The regression that produced Omen's only two external bug reports: a user
  // typing player names lost access to the product's front door.
  const server = await listen(buildApp());
  t.after(() => server.close());

  const ip = "203.0.113.12";
  const { allowed } = await drainUntil429(
    server, "/api/players/search?q=y", ip, PLAYER_SEARCH_PER_MINUTE + 5,
  );
  assert.equal(allowed, PLAYER_SEARCH_PER_MINUTE);

  const trade = await request(server, "/api/trade/compare", ip);
  assert.notEqual(trade.status, 429, "trade must have its own budget");
  assert.equal(trade.status, 200);
});

test("player search and trade keep independent buckets per IP", async (t) => {
  const server = await listen(buildApp());
  t.after(() => server.close());

  const ip = "203.0.113.13";
  for (let i = 0; i < 20; i++) {
    const res = await request(server, "/api/trade/compare", ip);
    assert.equal(res.status, 200);
  }
  const search = await request(server, "/api/players/search?q=z", ip);
  assert.equal(search.status, 200, "trade traffic must not spend the search budget");
});

test("one IP's exhaustion never affects another IP", async (t) => {
  const server = await listen(buildApp());
  t.after(() => server.close());

  const { allowed } = await drainUntil429(
    server, "/api/players/search?q=q", "203.0.113.14", PLAYER_SEARCH_PER_MINUTE + 5,
  );
  assert.equal(allowed, PLAYER_SEARCH_PER_MINUTE);

  const other = await request(server, "/api/players/search?q=q", "203.0.113.15");
  assert.equal(other.status, 200);
});
