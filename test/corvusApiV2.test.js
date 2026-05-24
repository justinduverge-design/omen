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
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/health returns 200 without auth", async () => {
  const app = buildApp();
  const res = await request(app, "/api/health");

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("POST /api/auth/sleeper/connect rejects missing auth token", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/sleeper/connect", {
    method: "POST",
    body: { username: "test-user", userId: "attacker-chosen-user" },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/auth/yahoo/authorize rejects missing auth token without redirecting", async () => {
  const app = buildApp();
  const res = await request(app, "/api/auth/yahoo/authorize?userId=attacker-chosen-user&leagueId=1");

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("POST /api/auth/espn/connect rejects missing auth token", async () => {
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

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("GET /api/league/standings rejects missing auth token", async () => {
  const app = buildApp();
  const res = await request(app, "/api/league/standings?userId=attacker-chosen-user&leagueId=1");

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Missing bearer token");
});
