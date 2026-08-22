"use strict";

/**
 * ═════════════════════════════════════════════════════════════════
 * S3 — per-user and per-IP rate limits on the three hot routes
 * -----------------------------------------------------------------
 *   POST /api/omen/mvp-move
 *   POST /api/trade/compare
 *   GET  /api/dashboard/summary
 *
 * These three take the Sunday-morning load and are the ones a tester
 * can hammer. Before this, `/api/omen/*` and `/api/dashboard/*` had
 * only the app-wide 100/min/IP limiter in `security.js`, which is a
 * budget shared with every other API call the SPA makes — a client
 * could spend most of it on the single most expensive route in the
 * product (provider fan-out + LLM) without ever tripping anything.
 *
 * Two limiters per route, both enforced, in this order:
 *
 *   1. **per-IP** — always applies, including to anonymous traffic.
 *   2. **per-credential** — applies only when a bearer token is
 *      presented.
 *
 * ## Why the user bucket is keyed on the credential, not on `sub`
 *
 * These limiters run *before* authentication (Express mounts them
 * ahead of the routers; `/api/omen/mvp-move` authenticates inside its
 * own handler). So there is no verified user id available at the point
 * the decision has to be made.
 *
 * The tempting shortcut is to decode the JWT and key on its unverified
 * `sub` claim. That is an availability hole: anyone can mint a token
 * carrying a victim's `sub`, spend the victim's budget, and lock them
 * out. Keying on a SHA-256 digest of the presented token instead means
 * an attacker cannot enter someone else's bucket without already
 * holding their credential — at which point they are that user.
 *
 * The honest cost, documented in `Blueprints/api-routes.md`: this is
 * **per-credential, not per-account.** Two devices get two buckets,
 * and a Supabase token refresh (~hourly) mints a fresh one. The per-IP
 * limit is the backstop that keeps refresh-to-reset bounded, and it is
 * why both limiters are enforced rather than either alone.
 *
 * ## Storage
 *
 * Default in-process `MemoryStore`, one per limiter. Omen runs a single
 * `omen_api` container, so process-local state is the whole picture
 * today. If the API is ever replicated, the effective limit multiplies
 * by the replica count and these need a shared store.
 * ═════════════════════════════════════════════════════════════════
 */

const crypto = require("node:crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/** All three routes share one window so the documented numbers read consistently. */
const HOT_ROUTE_WINDOW_MS = 60 * 1000;

/**
 * Budgets, per 60-second window. Set from what the product actually does,
 * not from a round number:
 *
 * - `omen_mvp_move` is the heaviest request Omen serves — provider fan-out
 *   plus an LLM call. There is one real Omen per user per week; everything
 *   above that is a refresh tap. 10/min/user is far past impatient.
 * - `trade_compare` is LLM-backed and is the free front door, so a session
 *   of genuine back-to-back comparisons has to fit. It also already sits
 *   under the router-wide `publicToolRateLimit` (30/min/IP across all of
 *   `/api/trade`); 20 makes the expensive endpoint the tighter of the two
 *   rather than a redundant duplicate.
 * - `dashboard_summary` is the cheapest and the most polled — app launch,
 *   tab focus, post-connect refresh — and a household or campus NAT puts
 *   many real users behind one IP, so its per-IP number is deliberately
 *   the loosest of the three.
 */
const HOT_ROUTE_LIMITS = Object.freeze({
  omen_mvp_move: Object.freeze({
    method: "POST",
    path: "/api/omen/mvp-move",
    perIp: 20,
    perUser: 10,
  }),
  trade_compare: Object.freeze({
    method: "POST",
    path: "/api/trade/compare",
    perIp: 20,
    perUser: 20,
  }),
  dashboard_summary: Object.freeze({
    method: "GET",
    path: "/api/dashboard/summary",
    perIp: 60,
    perUser: 30,
  }),
});

const RATE_LIMITED_CODE = "rate_limited";

function bearerToken(req) {
  const header = req?.headers?.authorization;
  if (typeof header !== "string") return "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

/**
 * A stable, non-reversible handle for the presented credential. Truncated to
 * 32 hex chars — 128 bits, far past collision relevance for a bucket key, and
 * short enough that a store dump is not a pile of full token digests.
 */
function credentialKey(req) {
  const token = bearerToken(req);
  if (!token) return "";
  return `cred:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)}`;
}

function retryAfterSeconds(req, windowMs) {
  const resetTime = req?.rateLimit?.resetTime;
  if (resetTime instanceof Date) {
    return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
  }
  return Math.ceil(windowMs / 1000);
}

/**
 * The 429 body. "Honest" here means three specific things:
 *
 *   - It says which limit was hit (`scope`), so a client that is sharing an
 *     office IP is not told to slow their own usage down.
 *   - It states the actual number and window rather than a vague apology, so
 *     a client can implement real backoff instead of guessing.
 *   - It never reveals whether the presented token was *valid*. Hitting the
 *     credential bucket only proves a bearer header was present.
 */
function buildRateLimitEnvelope({ route, method, path, scope, limit, windowMs, req }) {
  return {
    error: scope === "user"
      ? `Too many ${method} ${path} requests for this credential. Slow down and retry shortly.`
      : `Too many ${method} ${path} requests from this network. Slow down and retry shortly.`,
    code: RATE_LIMITED_CODE,
    scope,
    route,
    limit,
    window_seconds: Math.round(windowMs / 1000),
    retry_after_seconds: retryAfterSeconds(req, windowMs),
  };
}

/**
 * Build one limiter. Exported so tests can construct an instance with a short
 * window and prove reset behaviour without a 60-second sleep, against exactly
 * the code path the shipped limiters use.
 */
function createHotRouteLimiter({ route, method, path, scope, limit, windowMs = HOT_ROUTE_WINDOW_MS }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => (
      scope === "user" ? credentialKey(req) : ipKeyGenerator(req.ip)
    ),
    // The credential bucket has nothing to count for an anonymous request.
    // Those are covered by the per-IP limiter, which never skips.
    skip: scope === "user" ? (req) => credentialKey(req) === "" : () => false,
    handler: (req, res) => {
      res.status(429).json(buildRateLimitEnvelope({
        route, method, path, scope, limit, windowMs, req,
      }));
    },
  });
}

function createHotRouteLimiters(routeKey, overrides = {}) {
  const spec = HOT_ROUTE_LIMITS[routeKey];
  if (!spec) throw new Error(`Unknown hot route: ${routeKey}`);

  const windowMs = overrides.windowMs ?? HOT_ROUTE_WINDOW_MS;
  const base = { route: routeKey, method: spec.method, path: spec.path, windowMs };

  return [
    createHotRouteLimiter({ ...base, scope: "ip", limit: overrides.perIp ?? spec.perIp }),
    createHotRouteLimiter({ ...base, scope: "user", limit: overrides.perUser ?? spec.perUser }),
  ];
}

/**
 * The shipped limiter instances. Module-level so every request shares one
 * store per route+scope, which is the entire point.
 */
const hotRouteLimiters = Object.freeze(
  Object.fromEntries(
    Object.keys(HOT_ROUTE_LIMITS).map((key) => [key, createHotRouteLimiters(key)]),
  ),
);

/**
 * Mount the limiters ahead of the routers.
 *
 * This is a function rather than three `app.use` lines in `server.js` so the
 * S3 tests can apply the *same* wiring to a test app. A test that re-declares
 * the mounting proves the test's copy works, not the server's — which is the
 * failure shape this whole item exists to avoid: a limiter that looks mounted
 * and never fires.
 *
 * Each entry is registered as a method+path route whose handlers fall through
 * via `next()`, so the real router mounted later still serves the request.
 * Must be called before the routers are mounted.
 */
function applyHotRouteRateLimits(app) {
  for (const [routeKey, spec] of Object.entries(HOT_ROUTE_LIMITS)) {
    const limiters = hotRouteLimiters[routeKey];
    if (spec.method === "GET") app.get(spec.path, ...limiters);
    else app.post(spec.path, ...limiters);
  }
  return app;
}

module.exports = {
  HOT_ROUTE_LIMITS,
  HOT_ROUTE_WINDOW_MS,
  RATE_LIMITED_CODE,
  applyHotRouteRateLimits,
  buildRateLimitEnvelope,
  createHotRouteLimiter,
  createHotRouteLimiters,
  credentialKey,
  hotRouteLimiters,
};
