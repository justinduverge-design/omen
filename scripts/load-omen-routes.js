"use strict";

/**
 * Local route load test — O4.
 *
 * Usage:
 *   OMEN_BASE_URL=http://localhost:3000 node scripts/load-omen-routes.js
 *   node scripts/local-load-stack.js            # boots a local stack, then runs this
 *
 * **Local or an explicitly approved staging target only. Never production.**
 * `Direction/current_sprint.md` → O4, "Do not touch: load-testing production
 * without explicit approval." This script refuses a non-local base URL unless
 * OMEN_LOAD_ALLOW_REMOTE=1 is set deliberately.
 *
 * ── Why this script simulates distinct clients ────────────────────────────
 *
 * S3 (2026-08-21) put per-IP and per-credential limits on all three of these
 * routes. That changes what a load test even means. A generator running from
 * one machine with one token is a single IP and a single credential, so past
 * ~20 requests/minute it stops measuring Omen and starts measuring
 * `express-rate-limit`. The p95 you get back is the p95 of a 429.
 *
 * Real load does not look like that. On a Sunday morning, N users arrive from
 * N networks with N credentials, and each one spends their own budget. So by
 * default this script gives every simulated client its own `X-Forwarded-For`
 * and its own bearer token, which the server honours because it runs with
 * `trust proxy` set. That reproduces production's bucket distribution instead
 * of collapsing the whole run into one bucket.
 *
 * Set OMEN_LOAD_SATURATE=1 to do the opposite on purpose: drive everything
 * through a single identity and confirm the limiter is what stops it. That run
 * is evidence about the limiter, not about latency, and it is reported as
 * such.
 *
 * ── What a local run does and does not prove ─────────────────────────────
 *
 * It measures Omen's own request path: routing, middleware, the rate limiters,
 * validation, response assembly, and (with the local stack) auth verification
 * plus Supabase round-trips. It does **not** measure provider fan-out to
 * Yahoo, Sleeper, or ESPN, or a real LLM call — no load test may generate
 * traffic against a third party. Week 1 Sunday morning is the real load test;
 * this is the rehearsal.
 *
 * Mock vs live is reported per route and never inferred (facts-of-record #7).
 */

function productEnv(name) {
  return process.env[`OMEN_${name}`] ?? process.env[`CORVUS_${name}`];
}

function intEnv(name, fallback) {
  const value = Number(productEnv(name));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function boolEnv(name, fallback = false) {
  const raw = productEnv(name);
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function assertTargetIsLocal(baseUrl) {
  let host;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`OMEN_BASE_URL is not a valid URL: ${baseUrl}`);
  }

  if (LOCAL_HOSTS.has(host)) return;
  if (boolEnv("LOAD_ALLOW_REMOTE")) {
    console.error(`[load] WARNING: targeting non-local host ${host} because OMEN_LOAD_ALLOW_REMOTE is set.`);
    return;
  }

  throw new Error(
    `Refusing to load-test ${host}. This script is local-only by default (O4: never production). `
    + "Set OMEN_LOAD_ALLOW_REMOTE=1 only for a target you have explicit approval to hit.",
  );
}

/**
 * A simulated client: one source IP, one credential. Tokens are synthetic and
 * are not expected to authenticate — for the auth-gated routes their job is to
 * be *distinct*, so each client lands in its own credential bucket the way a
 * real user would. Supply OMEN_AUTH_TOKEN to run every client against one real
 * credential instead (which shares a bucket, so keep concurrency low).
 */
function buildClients(count, { realToken, saturate }) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    // TEST-NET-3 (203.0.113.0/24, RFC 5737) — reserved for documentation, so
    // these can never collide with a real client address in a log.
    ip: saturate ? "203.0.113.1" : `203.0.113.${(index % 250) + 1}`,
    token: realToken || (saturate ? "load-client-shared" : `load-client-${index}`),
  }));
}

const tradeBody = {
  send: [{ name: "Player A", projected_points: 12, position: "WR" }],
  receive: [{ name: "Player B", projected_points: 14, position: "RB" }],
  scoring_format: "ppr",
};

/**
 * Explicitly-labelled mock request. Without a real bearer token the live Omen
 * path returns 401 immediately, which measures the auth guard rather than the
 * route. `use_mock_data: true` is the route's own explicit mock switch, so
 * this exercises response assembly, DvP enrichment, and the LLM enrichment
 * attempt — and it is never an automatic fallback from live.
 */
const omenMockBody = {
  platform: "sleeper",
  league_id: "1000000000000000000",
  team_id: "1",
  season: 2026,
  week: 8,
  scoring_format: "ppr",
  decision_scope: ["start_sit", "waiver_pickup", "trade_suggestion"],
  include_signals: {
    weather: true,
    travel_home_away: true,
    game_time_tv: true,
    matchup_dvp: false,
    llm_reasoning: false,
  },
  use_mock_data: true,
};

function percentile(sorted, fraction) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

async function request(baseUrl, path, { method, body, client }) {
  const started = performance.now();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": client.ip,
        ...(client.token ? { authorization: `Bearer ${client.token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return {
      status: res.status,
      elapsedMs: performance.now() - started,
      rateLimited: res.status === 429,
      snippet: res.ok ? null : text.slice(0, 160),
    };
  } catch (error) {
    return {
      status: 0,
      elapsedMs: performance.now() - started,
      rateLimited: false,
      snippet: `transport: ${error.message}`,
    };
  }
}

/**
 * Run one route: `clients.length` concurrent workers, each issuing
 * `requestsPerClient` sequential requests. Concurrency is the number of
 * simultaneous in-flight requests, which is the number that matters for a
 * server, not the total.
 */
async function runRoute({ baseUrl, name, path, method, body, mode, clients, requestsPerClient }) {
  const started = performance.now();

  const perClient = await Promise.all(clients.map(async (client) => {
    const results = [];
    for (let i = 0; i < requestsPerClient; i += 1) {
      results.push(await request(baseUrl, path, { method, body, client }));
    }
    return results;
  }));

  const results = perClient.flat();
  const wallMs = performance.now() - started;
  const timings = results.map((r) => r.elapsedMs).sort((a, b) => a - b);

  const statuses = results.reduce((acc, r) => {
    const key = r.status === 0 ? "transport_error" : String(r.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const rateLimited = results.filter((r) => r.rateLimited).length;
  // A 429 is the limiter working, not the service failing. It is counted and
  // reported separately so a saturation run cannot be read as an error rate.
  const failures = results.filter((r) => !r.rateLimited && (r.status === 0 || r.status >= 500)).length;
  const nonSuccess = results.filter((r) => r.status < 200 || r.status >= 300);

  return {
    name,
    route: `${method} ${path}`,
    mode,
    concurrency: clients.length,
    requests_per_client: requestsPerClient,
    count: results.length,
    wall_ms: Math.round(wallMs),
    throughput_rps: Number((results.length / (wallMs / 1000)).toFixed(2)),
    statuses,
    rate_limited: rateLimited,
    rate_limited_pct: Number(((rateLimited / results.length) * 100).toFixed(2)),
    error_count: failures,
    error_rate_pct: Number(((failures / results.length) * 100).toFixed(2)),
    p50_ms: Math.round(percentile(timings, 0.5)),
    p95_ms: Math.round(percentile(timings, 0.95)),
    p99_ms: Math.round(percentile(timings, 0.99)),
    max_ms: Math.round(timings[timings.length - 1]),
    sample_non_success: nonSuccess[0]?.snippet ?? null,
  };
}

function routeSpecs({ authToken }) {
  // OMEN_LOAD_ROUTES narrows the run to named routes. Needed for saturation
  // evidence: the app-wide 100/min/IP limiter in security.js is shared across
  // every /api/* call, so hammering all three routes from one identity trips
  // *that* limiter before the looser hot-route budgets are reached. To show a
  // specific route's own limit binding, drive that route alone.
  const only = String(productEnv("LOAD_ROUTES") || "").split(",").map((s) => s.trim()).filter(Boolean);

  const specs = [
    {
      name: "trade_compare",
      path: "/api/trade/compare",
      method: "POST",
      body: tradeBody,
      // Public and unauthenticated by design; nothing about this is mocked.
      mode: "live-public",
    },
    {
      name: "omen_mvp_move",
      path: "/api/omen/mvp-move",
      method: "POST",
      body: authToken ? {} : omenMockBody,
      mode: authToken ? "live" : "mock (use_mock_data: true)",
    },
    {
      name: "dashboard_summary",
      path: "/api/dashboard/summary",
      method: "GET",
      body: null,
      mode: authToken ? "live" : "stub-auth (local stack) or 401 (bare server)",
    },
  ];

  return only.length ? specs.filter((spec) => only.includes(spec.name)) : specs;
}

async function runLoad({
  baseUrl = productEnv("BASE_URL") || "http://localhost:3000",
  authToken = productEnv("AUTH_TOKEN") || "",
  concurrency = intEnv("LOAD_CONCURRENCY", 5),
  requestsPerClient = intEnv("LOAD_ITERATIONS", 8),
  saturate = boolEnv("LOAD_SATURATE"),
  label = productEnv("LOAD_LABEL") || null,
} = {}) {
  assertTargetIsLocal(baseUrl);

  const clients = buildClients(concurrency, { realToken: authToken, saturate });
  const reports = [];
  for (const spec of routeSpecs({ authToken })) {
    reports.push(await runRoute({ baseUrl, ...spec, clients, requestsPerClient }));
  }

  return {
    label,
    base_url: baseUrl,
    concurrency,
    requests_per_client: requestsPerClient,
    total_requests_per_route: concurrency * requestsPerClient,
    auth_token_supplied: Boolean(authToken),
    client_identities: saturate
      ? "SATURATION — one IP, one credential. Measures the S3 limiter, not latency."
      : "distinct per client — one X-Forwarded-For and one bearer token each, reproducing production's rate-limit bucket distribution",
    rate_limits_in_effect: {
      source: "src/middleware/hotRouteLimits.js (S3), documented in Blueprints/api-routes.md",
      per_60s: {
        "POST /api/omen/mvp-move": { per_ip: 20, per_credential: 10 },
        "POST /api/trade/compare": { per_ip: 20, per_credential: 20 },
        "GET /api/dashboard/summary": { per_ip: 60, per_credential: 30 },
      },
      note: "requests_per_client above the per-credential number will produce 429s by design",
    },
    reports,
    threshold_notes: {
      local_smoke_p95_ms: 1000,
      investor_demo_p95_ms: 750,
    },
    scope_caveat:
      "Local run. Measures Omen's own request path — routing, middleware, rate limiters, "
      + "validation, response assembly, and auth/Supabase round-trips when run under "
      + "scripts/local-load-stack.js. It does NOT measure provider fan-out to Yahoo, Sleeper, "
      + "or ESPN, or a real LLM call. Week 1 Sunday morning is the real load test.",
  };
}

async function main() {
  console.log(JSON.stringify(await runLoad(), null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runLoad, runRoute, buildClients, assertTargetIsLocal };
