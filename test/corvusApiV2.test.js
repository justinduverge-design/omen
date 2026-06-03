"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.REDIS_URL ||= "https://redis.example";
process.env.REDIS_TOKEN ||= "test-redis-token";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", require("../src/corvus_api_v2"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path, { method = "GET", body } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const contentType = res.headers.get("content-type") || "";
    return {
      status: res.status,
      headers: res.headers,
      body: contentType.includes("application/json") ? await res.json() : await res.text(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function assertRetiredRoute(res, { deprecatedEndpoint, canonicalEndpoint = null }) {
  assert.equal(res.status, 410);
  assert.deepEqual(res.body, {
    error: "Legacy endpoint retired",
    code: "legacy_route_retired",
    deprecated_endpoint: deprecatedEndpoint,
    canonical_endpoint: canonicalEndpoint,
  });
}

test("GET /api/health returns 200 without auth", async () => {
  const app = buildApp();
  const res = await request(app, "/api/health");

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("POST /api/auth/sleeper/connect is retired with canonical route hint", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/sleeper/connect", {
    method: "POST",
    body: { username: "test-user", userId: "attacker-chosen-user" },
  });

  assertRetiredRoute(res, {
    deprecatedEndpoint: "/api/auth/sleeper/connect",
    canonicalEndpoint: "/api/platforms/sleeper/connect",
  });
});

test("GET /api/auth/yahoo/authorize is retired with canonical route hint", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/yahoo/authorize?userId=attacker-chosen-user&leagueId=1");

  assertRetiredRoute(res, {
    deprecatedEndpoint: "/api/auth/yahoo/authorize",
    canonicalEndpoint: "/api/yahoo/auth",
  });
});

test("GET /api/auth/yahoo/callback redirects to canonical callback with query", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/yahoo/callback?code=test&state=test");

  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/api/yahoo/callback?code=test&state=test");
});

test("POST /api/auth/espn/connect is retired with canonical route hint", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/espn/connect", {
    method: "POST",
    body: {
      espnS2: "secret-cookie",
      swid: "{secret-swid}",
      leagueId: "123",
      userId: "attacker-chosen-user",
    },
  });

  assertRetiredRoute(res, {
    deprecatedEndpoint: "/api/auth/espn/connect",
    canonicalEndpoint: "/api/platforms/espn/connect",
  });
});
