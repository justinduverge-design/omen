"use strict";

/**
 * Local route load smoke test.
 *
 * Usage:
 *   OMEN_BASE_URL=http://localhost:3000 node scripts/load-omen-routes.js
 *
 * Auth-gated routes use OMEN_AUTH_TOKEN when provided. Without a token the
 * script still checks public Trade Analyzer and reports Omen/Dashboard as
 * auth-blocked instead of failing the run.
 */

function productEnv(name) {
  return process.env[`OMEN_${name}`] ?? process.env[`CORVUS_${name}`];
}

const baseUrl = productEnv("BASE_URL") || "http://localhost:3000";
const authToken = productEnv("AUTH_TOKEN") || "";
const iterations = Number(productEnv("LOAD_ITERATIONS") || 10);

const tradeBody = {
  send: [{ name: "Player A", projected_points: 12, position: "WR" }],
  receive: [{ name: "Player B", projected_points: 14, position: "RB" }],
  scoring_format: "ppr",
};

async function request(name, path, options = {}) {
  const started = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const elapsedMs = Math.round(performance.now() - started);
  const text = await res.text();
  return { name, status: res.status, elapsedMs, ok: res.ok, body: text.slice(0, 120) };
}

async function runRoute(name, path, options) {
  const results = [];
  for (let i = 0; i < iterations; i += 1) {
    results.push(await request(name, path, options));
  }
  const statuses = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  const timings = results.map((result) => result.elapsedMs).sort((a, b) => a - b);
  return {
    name,
    count: results.length,
    statuses,
    p50_ms: timings[Math.floor(timings.length * 0.5)],
    p95_ms: timings[Math.floor(timings.length * 0.95)] || timings[timings.length - 1],
  };
}

async function main() {
  const reports = [];
  reports.push(await runRoute("trade_compare", "/api/trade/compare", {
    method: "POST",
    body: JSON.stringify(tradeBody),
  }));
  reports.push(await runRoute("omen_mvp_move", "/api/omen/mvp-move", {
    method: "POST",
    body: JSON.stringify({}),
  }));
  reports.push(await runRoute("dashboard_summary", "/api/dashboard/summary", {
    method: "GET",
  }));

  console.log(JSON.stringify({
    base_url: baseUrl,
    iterations,
    auth_token_supplied: Boolean(authToken),
    reports,
    threshold_notes: {
      local_smoke_p95_ms: 1000,
      investor_demo_p95_ms: 750,
      rate_limit_expected: "Public tool routes allow 30 requests/minute/IP.",
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
