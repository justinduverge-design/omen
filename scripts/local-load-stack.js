"use strict";

/**
 * Local load-test stack — O4.
 *
 * Boots the **real** `src/server.js` against a loopback Supabase stub, waits
 * for it to be healthy, runs `scripts/load-omen-routes.js` against it, prints
 * the report, and tears everything down.
 *
 * Usage:
 *   node scripts/local-load-stack.js
 *   OMEN_LOAD_CONCURRENCY=50 OMEN_LOAD_ITERATIONS=8 node scripts/local-load-stack.js
 *   OMEN_LOAD_SATURATE=1 node scripts/local-load-stack.js
 *
 * **Everything here is loopback-only.** Nothing is deployed, no production
 * config is read, no real Supabase project is contacted, and no provider API
 * is called. The stub answers on 127.0.0.1 and exists only for the duration of
 * the run.
 *
 * ── Why a stub instead of just pointing at the running server ─────────────
 *
 * Without it, `GET /api/dashboard/summary` returns 401 before it does any
 * work, so a load run against it measures the auth guard and nothing else —
 * and worse, `requireAuth` would try to reach the configured Supabase host on
 * every request, so the numbers would really be DNS and TLS timings against a
 * third party. Neither is the hot path O4 needs measured.
 *
 * The stub returns a user with **no platform connections**, which is a real
 * user shape and keeps the run from fanning out to Yahoo, Sleeper, or ESPN.
 * That boundary is deliberate: a load test must never generate traffic against
 * a provider. It also means the measured cost is Omen's own — auth
 * verification, two Supabase round-trips, and response assembly — not the
 * provider latency that will dominate a connected user's request. Say so when
 * citing these numbers.
 */

const http = require("node:http");
const { spawn } = require("node:child_process");
const { runLoad } = require("./load-omen-routes");

const STUB_USER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * The three Supabase calls `GET /api/dashboard/summary` makes, and nothing
 * else. An unrecognized path returns 404 loudly rather than an empty success,
 * so a future route change shows up as a failure instead of a silently fast
 * measurement (scripts/README.md: never report a false all-clear).
 */
function createSupabaseStub() {
  const seen = { auth: 0, platform_connections: 0, profiles: 0, unknown: [] };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const json = (status, payload) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    if (url.pathname === "/auth/v1/user") {
      seen.auth += 1;
      // supabase-js verifies the bearer token by asking for the user behind
      // it. Any token resolves to the same synthetic user here — the load test
      // needs a *verified* request, not a real account.
      return json(200, {
        id: STUB_USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "load-test@localhost.invalid",
        app_metadata: {},
        user_metadata: {},
      });
    }

    if (url.pathname === "/rest/v1/platform_connections") {
      seen.platform_connections += 1;
      // No connections: a real user shape, and the one that keeps this run
      // from reaching a provider.
      return json(200, []);
    }

    if (url.pathname === "/rest/v1/profiles") {
      seen.profiles += 1;
      return json(200, []);
    }

    seen.unknown.push(`${req.method} ${url.pathname}`);
    return json(404, { error: "unstubbed Supabase path", path: url.pathname });
  });

  return { server, seen };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function waitForHealth(baseUrl, { attempts = 60, delayMs = 100 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function main() {
  const { server: stub, seen } = createSupabaseStub();
  const stubPort = await listen(stub);

  // Port 0 would be ideal, but the server reads its port from config at boot,
  // so pick one and let a collision fail loudly rather than silently reuse an
  // already-running instance.
  const apiPort = Number(process.env.OMEN_LOAD_API_PORT || 3921);
  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const api = spawn(process.execPath, ["src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(apiPort),
      NODE_ENV: "production",          // exercise the production log + envelope path
      LOG_LEVEL: "warn",               // don't pay for an access log line per request
      SUPABASE_URL: `http://127.0.0.1:${stubPort}`,
      SUPABASE_SERVICE_KEY: "local-load-stub-key",
      // Keep every optional integration off: no LLM bridge, no Redis, no
      // Yahoo entry point, no error reporting to a real project.
      AI_PROVIDER: "local",
      LLM_BASE_URL: "",
      REDIS_URL: "",
      REDIS_TOKEN: "",
      YAHOO_ENABLED: "false",
      SENTRY_DSN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const apiLog = [];
  api.stdout.on("data", (chunk) => apiLog.push(chunk.toString()));
  api.stderr.on("data", (chunk) => apiLog.push(chunk.toString()));

  const shutdown = async () => {
    api.kill("SIGTERM");
    await new Promise((resolve) => stub.close(resolve));
  };

  try {
    if (!await waitForHealth(baseUrl)) {
      throw new Error(`API did not become healthy on ${baseUrl}.\n${apiLog.join("")}`);
    }

    const report = await runLoad({ baseUrl });

    console.log(JSON.stringify({
      ...report,
      stack: {
        api: `${baseUrl} (real src/server.js, NODE_ENV=production)`,
        supabase: `http://127.0.0.1:${stubPort} (loopback stub — auth + 2 tables, no real project)`,
        providers: "none — no Yahoo, Sleeper, or ESPN traffic is generated",
        stub_calls: {
          auth_v1_user: seen.auth,
          platform_connections: seen.platform_connections,
          profiles: seen.profiles,
          unstubbed_paths: seen.unknown,
        },
      },
    }, null, 2));

    if (seen.unknown.length) {
      console.error(`[load] WARNING: ${seen.unknown.length} Supabase calls hit an unstubbed path; the numbers above are not trustworthy.`);
      process.exitCode = 1;
    }
  } finally {
    await shutdown();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { createSupabaseStub, STUB_USER_ID };
