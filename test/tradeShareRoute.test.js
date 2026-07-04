"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const tradeRoutes = require("../src/routes/trade");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/trade", tradeRoutes);
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, { method = "GET", path, body } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") || "";
    const parsedBody = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
    return {
      status: res.status,
      contentType,
      body: parsedBody,
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function validSharePayload(overrides = {}) {
  return {
    send: [{ name: "Bench RB", position: "RB", team: "SEA", projected_points: 10 }],
    receive: [{ name: "Starter WR", position: "WR", team: "DET", projected_points: 14 }],
    scoring_format: "ppr",
    ...overrides,
  };
}

test("POST /api/trade/share stores a public trade snapshot and GET returns it by hash", async () => {
  const app = buildApp();
  const created = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: validSharePayload(),
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.contract_version, "trade-share.v1");
  assert.match(created.body.hash, UUID_RE);
  assert.equal(created.body.api_path, `/api/trade/share/${created.body.hash}`);
  assert.equal(created.body.expires_at.endsWith("Z"), true);

  const read = await request(app, {
    path: `/api/trade/share/${created.body.hash}`,
  });

  assert.equal(read.status, 200);
  assert.equal(read.body.contract_version, "trade-share.v1");
  assert.equal(read.body.hash, created.body.hash);
  assert.equal(read.body.is_public, true);
  assert.equal(read.body.trade.send[0].name, "Bench RB");
  assert.equal(read.body.trade.receive[0].name, "Starter WR");
  assert.equal(read.body.trade.scoring_format, "ppr");
  assert.equal(read.body.result.verdict, "accept");
  assert.equal(read.body.result.net_value, 2.5);
});

test("POST /api/trade/share rejects sensitive credential-like fields", async () => {
  const app = buildApp();
  const res = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: validSharePayload({
      receive: [{
        name: "Starter WR",
        position: "WR",
        projected_points: 14,
        espn_s2: "never-store-this",
      }],
    }),
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "trade_share_sensitive_field");
});

test("POST /api/trade/share rejects oversized public snapshots", async () => {
  const app = buildApp();
  const res = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: validSharePayload({
      send: [{
        name: "Bench RB",
        position: "RB",
        projected_points: 10,
        status: "x".repeat(20_000),
      }],
    }),
  });

  assert.equal(res.status, 413);
  assert.equal(res.body.error, "trade_share_payload_too_large");
});

test("GET /api/trade/share/:hash rejects malformed hashes before storage lookup", async () => {
  const app = buildApp();
  const res = await request(app, {
    path: "/api/trade/share/not-a-share-hash",
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_trade_share_hash");
});

test("GET /api/trade/share/:hash/og.svg renders a server-side public OG image", async () => {
  const app = buildApp();
  const created = await request(app, {
    method: "POST",
    path: "/api/trade/share",
    body: validSharePayload(),
  });

  const image = await request(app, {
    path: `/api/trade/share/${created.body.hash}/og.svg`,
  });

  assert.equal(image.status, 200);
  assert.match(image.contentType, /image\/svg\+xml/);
  assert.match(image.body, /Accept the deal/);
  assert.match(image.body, /Bench RB/);
  assert.match(image.body, /Starter WR/);
  assert.doesNotMatch(image.body, /cookie|token|secret|espn_s2|swid/i);
});
