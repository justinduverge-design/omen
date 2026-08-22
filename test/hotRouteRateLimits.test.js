"use strict";

/**
 * S3 — rate limits on the three hot routes.
 *
 * The failure mode this suite is written against is a limiter that is wired
 * up, looks correct, and never fires. That reads exactly like healthy traffic.
 * So every assertion here is made by *actually driving requests through the
 * shipped middleware instances* until they 429, not by reading the config
 * object and agreeing with it.
 *
 * Bucket isolation between tests comes from distinct source IPs (via
 * `X-Forwarded-For` under `trust proxy`) and distinct bearer tokens, so the
 * shared module-level stores in `hotRouteLimits.js` — the thing that makes the
 * limiter real — are exercised rather than worked around.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { test } = require("node:test");
const express = require("express");

const {
  HOT_ROUTE_LIMITS,
  HOT_ROUTE_WINDOW_MS,
  RATE_LIMITED_CODE,
  applyHotRouteRateLimits,
  createHotRouteLimiters,
  credentialKey,
} = require("../src/middleware/hotRouteLimits");

// --- Harness -------------------------------------------------------

/**
 * A server carrying the *production* wiring: the same `applyHotRouteRateLimits`
 * call `src/server.js` makes, followed by terminal handlers standing in for the
 * real routers. If the mounting function stops guarding a route, this app stops
 * 429ing and the suite goes red.
 */
function buildShippedApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  applyHotRouteRateLimits(app);
  for (const spec of Object.values(HOT_ROUTE_LIMITS)) {
    const register = spec.method === "GET" ? app.get.bind(app) : app.post.bind(app);
    register(spec.path, (_req, res) => res.status(200).json({ ok: true }));
  }
  return app;
}

async function withServer(app, fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function hit(port, { method, path: routePath, ip, token }) {
  const res = await fetch(`http://127.0.0.1:${port}${routePath}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(ip ? { "x-forwarded-for": ip } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(method === "POST" ? { body: "{}" } : {}),
  });
  return {
    status: res.status,
    headers: res.headers,
    body: await res.json().catch(() => null),
  };
}

/** Fire `count` requests in series and return every response. */
async function hitTimes(port, count, options) {
  const responses = [];
  for (let i = 0; i < count; i += 1) {
    responses.push(await hit(port, options));
  }
  return responses;
}

// Each test claims its own /24 so no two tests can share an IP bucket.
let ipCounter = 0;
function freshIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

let tokenCounter = 0;
function freshToken() {
  tokenCounter += 1;
  return `test-token-${tokenCounter}-${"x".repeat(40)}`;
}

// --- Per-IP limits actually trip, on every one of the three routes ---

for (const [routeKey, spec] of Object.entries(HOT_ROUTE_LIMITS)) {
  test(`${spec.method} ${spec.path} enforces its per-IP limit and returns an honest 429`, async () => {
    const app = buildShippedApp();
    const ip = freshIp();

    await withServer(app, async (port) => {
      // Exactly at the limit: every request must still be served. A limiter
      // that is off by one in the strict direction is a real outage.
      const allowed = await hitTimes(port, spec.perIp, { method: spec.method, path: spec.path, ip });
      for (const [index, res] of allowed.entries()) {
        assert.equal(res.status, 200, `request ${index + 1} of ${spec.perIp} must be served`);
      }

      // One past it: refused.
      const refused = await hit(port, { method: spec.method, path: spec.path, ip });
      assert.equal(refused.status, 429, `${routeKey} must refuse request ${spec.perIp + 1}`);

      assert.equal(refused.body.code, RATE_LIMITED_CODE);
      assert.equal(refused.body.scope, "ip");
      assert.equal(refused.body.route, routeKey);
      assert.equal(refused.body.limit, spec.perIp);
      assert.equal(refused.body.window_seconds, HOT_ROUTE_WINDOW_MS / 1000);
      assert.ok(
        refused.body.retry_after_seconds > 0
        && refused.body.retry_after_seconds <= HOT_ROUTE_WINDOW_MS / 1000,
        "retry_after_seconds must be a usable number inside the window",
      );
      // A client cannot back off correctly without these.
      assert.ok(refused.headers.get("retry-after"), "Retry-After must be set");
      assert.ok(refused.headers.get("ratelimit"), "draft-7 RateLimit header must be set");
      // The refusal must not describe an anonymous IP flood as the caller's
      // own account being throttled.
      assert.match(refused.body.error, /from this network/);
    });
  });
}

// --- Per-credential limits actually trip ----------------------------

for (const [routeKey, spec] of Object.entries(HOT_ROUTE_LIMITS)) {
  test(`${spec.method} ${spec.path} enforces its per-credential limit independently of IP`, async () => {
    const app = buildShippedApp();
    const token = freshToken();

    await withServer(app, async (port) => {
      // Rotate the source IP on every request. Two things fall out of this:
      // the per-IP bucket can never be the thing that trips (it would mask the
      // result on any route where perIp <= perUser), and it proves the
      // credential bucket follows the account across networks, which is the
      // whole reason a per-user limit exists alongside a per-IP one.
      const allowed = [];
      for (let i = 0; i < spec.perUser; i += 1) {
        allowed.push(await hit(port, { method: spec.method, path: spec.path, ip: freshIp(), token }));
      }
      for (const [index, res] of allowed.entries()) {
        assert.equal(res.status, 200, `request ${index + 1} of ${spec.perUser} must be served`);
      }

      const refused = await hit(port, { method: spec.method, path: spec.path, ip: freshIp(), token });
      assert.equal(refused.status, 429, `${routeKey} must refuse credential request ${spec.perUser + 1}`);
      assert.equal(refused.body.scope, "user");
      assert.equal(refused.body.limit, spec.perUser);
      assert.match(refused.body.error, /for this credential/);

      // A different credential from the same brand-new IP is unaffected.
      const other = await hit(port, {
        method: spec.method,
        path: spec.path,
        ip: freshIp(),
        token: freshToken(),
      });
      assert.equal(other.status, 200, "a second credential must have its own bucket");
    });
  });
}

// --- Reset ----------------------------------------------------------

test("a tripped limit resets once its window elapses", async () => {
  // Built through the same factory the shipped limiters use — same store, same
  // handler, same key generators. Only `windowMs` differs, because proving
  // reset on the 60-second production window would mean a 60-second test.
  const [ipLimiter, userLimiter] = createHotRouteLimiters("omen_mvp_move", {
    windowMs: 250,
    perIp: 2,
    perUser: 2,
  });

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.post("/api/omen/mvp-move", ipLimiter, userLimiter, (_req, res) => res.status(200).json({ ok: true }));

  const ip = freshIp();
  const call = (port) => hit(port, { method: "POST", path: "/api/omen/mvp-move", ip });

  await withServer(app, async (port) => {
    assert.equal((await call(port)).status, 200);
    assert.equal((await call(port)).status, 200);

    const refused = await call(port);
    assert.equal(refused.status, 429, "the third request inside the window is refused");
    const retryAfter = refused.body.retry_after_seconds;
    assert.ok(retryAfter >= 1, "an honest 429 tells the client when to come back");

    // Still refused just before the window closes — a reset that happens
    // immediately is the same defect as no limit at all.
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal((await call(port)).status, 429, "the window must not reset early");

    await new Promise((resolve) => setTimeout(resolve, 260));
    assert.equal((await call(port)).status, 200, "the window must reset once it elapses");
  });
});

test("the credential bucket resets on its own window, not the IP bucket's", async () => {
  const [ipLimiter, userLimiter] = createHotRouteLimiters("dashboard_summary", {
    windowMs: 250,
    perIp: 50,
    perUser: 2,
  });

  const app = express();
  app.set("trust proxy", true);
  app.get("/api/dashboard/summary", ipLimiter, userLimiter, (_req, res) => res.status(200).json({ ok: true }));

  const token = freshToken();
  const call = (port) => hit(port, { method: "GET", path: "/api/dashboard/summary", ip: freshIp(), token });

  await withServer(app, async (port) => {
    assert.equal((await call(port)).status, 200);
    assert.equal((await call(port)).status, 200);
    const refused = await call(port);
    assert.equal(refused.status, 429);
    assert.equal(refused.body.scope, "user");

    await new Promise((resolve) => setTimeout(resolve, 320));
    assert.equal((await call(port)).status, 200, "the credential window must reset too");
  });
});

// --- Anonymous traffic and the credential bucket ---------------------

test("anonymous requests never consume a credential's budget", async () => {
  const app = buildShippedApp();
  const spec = HOT_ROUTE_LIMITS.trade_compare;
  const token = freshToken();

  await withServer(app, async (port) => {
    // Enough anonymous traffic to have exhausted the credential budget twice
    // over, had `skip` been wrong and bucketed them all under the empty key.
    for (let i = 0; i < spec.perUser * 2; i += 1) {
      await hit(port, { method: spec.method, path: spec.path, ip: freshIp() });
    }

    const authenticated = await hit(port, {
      method: spec.method,
      path: spec.path,
      ip: freshIp(),
      token,
    });
    assert.equal(authenticated.status, 200, "an anonymous flood must not throttle a real account");
  });
});

test("an anonymous flood is still stopped by the per-IP limit", async () => {
  // The corollary of the test above: skipping the credential bucket for
  // anonymous callers must not leave them unlimited.
  const app = buildShippedApp();
  const spec = HOT_ROUTE_LIMITS.trade_compare;
  const ip = freshIp();

  await withServer(app, async (port) => {
    await hitTimes(port, spec.perIp, { method: spec.method, path: spec.path, ip });
    const refused = await hit(port, { method: spec.method, path: spec.path, ip });
    assert.equal(refused.status, 429);
    assert.equal(refused.body.scope, "ip");
  });
});

// --- Key derivation --------------------------------------------------

test("the credential key is derived from the token, so a forged `sub` cannot occupy another account's bucket", () => {
  // Two tokens carrying an identical `sub` claim. Had the key been the
  // unverified `sub` — the obvious shortcut, since these limiters run before
  // authentication — anyone could mint the second token and spend the first
  // account's budget, locking a real user out.
  const sameSubject = Buffer.from(JSON.stringify({ sub: "victim-user-id" })).toString("base64url");
  const victim = `header.${sameSubject}.victim-signature`;
  const forged = `header.${sameSubject}.forged-signature`;

  const victimKey = credentialKey({ headers: { authorization: `Bearer ${victim}` } });
  const forgedKey = credentialKey({ headers: { authorization: `Bearer ${forged}` } });

  assert.notEqual(victimKey, forgedKey);
  assert.match(victimKey, /^cred:[0-9a-f]{32}$/);
  // The key must not be the credential itself in another coat.
  assert.equal(victimKey.includes("victim-signature"), false);
});

test("a request with no usable bearer header yields no credential key", () => {
  assert.equal(credentialKey({ headers: {} }), "");
  assert.equal(credentialKey({ headers: { authorization: "Bearer " } }), "");
  assert.equal(credentialKey({ headers: { authorization: "Basic abc" } }), "");
  assert.equal(credentialKey({}), "");
});

// --- Wiring ----------------------------------------------------------

test("server.js applies the hot-route limits before it mounts any router", () => {
  // Ordering is load-bearing and no request-level test can catch it: mounted
  // after the routers, `applyHotRouteRateLimits` would register routes that
  // never run, and the limiter would look present while enforcing nothing.
  const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");

  const applied = server.indexOf("applyHotRouteRateLimits(app)");
  assert.ok(applied > 0, "src/server.js must call applyHotRouteRateLimits(app)");

  const firstRouterMount = server.indexOf('app.use("/api"');
  assert.ok(firstRouterMount > 0, "expected a router mount in src/server.js");
  assert.ok(applied < firstRouterMount, "hot-route limits must be applied before the routers");
});

test("every documented hot route carries both a per-IP and a per-credential budget", () => {
  const documented = Object.entries(HOT_ROUTE_LIMITS);
  assert.equal(documented.length, 3);

  for (const [routeKey, spec] of documented) {
    assert.ok(Number.isInteger(spec.perIp) && spec.perIp > 0, `${routeKey} needs a per-IP budget`);
    assert.ok(Number.isInteger(spec.perUser) && spec.perUser > 0, `${routeKey} needs a per-user budget`);
    // A per-user budget above the per-IP one is unreachable — the IP limiter
    // runs first and would always trip before it, which is a limit that
    // silently never fires.
    assert.ok(
      spec.perUser <= spec.perIp,
      `${routeKey}: a per-user budget above the per-IP budget can never be reached from one IP`,
    );
  }
});
