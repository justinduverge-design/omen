"use strict";

const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const { InMemorySpanExporter } = require("@opentelemetry/sdk-trace");
const telemetry = require("../src/services/telemetry");

afterEach(async () => {
  await telemetry.shutdownTelemetry(100);
});

function startTracing() {
  const exporter = new InMemorySpanExporter();
  assert.equal(telemetry.initTelemetry({ component: "api", env: {}, exporter }), true);
  return exporter;
}

test("tracing is off by default and withSpan is a pass-through", async () => {
  assert.equal(telemetry.initTelemetry({ component: "api", env: {} }), false);
  assert.equal(telemetry.isTelemetryEnabled(), false);
  assert.equal(telemetry.withSpan("x", () => 41 + 1), 42);
  assert.equal(await telemetry.withSpan("x", async () => "ok"), "ok");
});

test("OTEL_ENABLED=false wins over a configured endpoint", () => {
  const config = telemetry.describeTelemetryConfig({
    OTEL_ENABLED: "false",
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel.tail1234.ts.net:4318",
  });
  assert.deepEqual(config, { enabled: false, reason: "disabled" });
});

test("only private, self-hosted endpoints are accepted", () => {
  const ok = (endpoint) => telemetry.describeTelemetryConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: endpoint, OTEL_TAILNET_SUFFIX: "tail1234.ts.net" });
  assert.equal(ok("http://command-center.tail1234.ts.net:4318").url, "http://command-center.tail1234.ts.net:4318/v1/traces");
  // Another tailnet's name (for example a public Funnel host) is not ours.
  assert.equal(ok("https://evil.tail9999.ts.net").reason, "not_private_host");
  assert.equal(telemetry.describeTelemetryConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://cc.tail1234.ts.net:4318" }).reason, "not_private_host");
  assert.equal(ok("http://100.101.102.103:4318/").enabled, true);
  assert.equal(ok("http://otel-collector:4318").enabled, true);
  assert.equal(ok("http://192.168.1.20:4318/v1/traces").url, "http://192.168.1.20:4318/v1/traces");
  assert.equal(ok("https://api.honeycomb.io").reason, "not_private_host");
  assert.equal(ok("https://otlp.example.com:4318").reason, "not_private_host");
  assert.equal(ok("http://8.8.8.8:4318").reason, "not_private_host");
  assert.equal(ok("http://user:pw@otel-collector:4318").reason, "credentials_in_url");
  assert.equal(ok("not a url").reason, "unparseable");
});

test("sample ratio defaults to 0.1 and rejects junk", () => {
  assert.equal(telemetry.sampleRatio(undefined), 0.1);
  assert.equal(telemetry.sampleRatio("0.25"), 0.25);
  assert.equal(telemetry.sampleRatio("2"), 0.1);
  assert.equal(telemetry.sampleRatio("abc"), 0.1);
});

test("attributes outside the allowlist are dropped", () => {
  assert.deepEqual(
    telemetry.safeAttributes({
      "omen.platform": "sleeper",
      user_id: "u-1",
      "enduser.id": "u-1",
      email: "a@b.c",
      league_id: "123",
      "omen.candidates": 3,
      "omen.state": "x".repeat(200),
    }),
    { "omen.platform": "sleeper", "omen.candidates": 3 },
  );
});

test("withSpan nests spans and records only the error class", async () => {
  const exporter = startTracing();
  await assert.rejects(telemetry.withSpan("outer", async () => {
    telemetry.withSpan("inner", () => 1);
    const error = new TypeError("secret detail for user@example.com");
    throw error;
  }), TypeError);
  const spans = exporter.getFinishedSpans();
  const outer = spans.find((s) => s.name === "outer");
  const inner = spans.find((s) => s.name === "inner");
  assert.equal(inner.parentSpanContext.spanId, outer.spanContext().spanId);
  assert.equal(outer.attributes["error.type"], "TypeError");
  assert.equal(JSON.stringify({ name: outer.name, attributes: outer.attributes, status: outer.status }).includes("user@example.com"), false);
  assert.equal(outer.events.length, 0);
});

test("request span carries the route template and none of the cookie, query, header or body", async () => {
  const exporter = startTracing();
  const app = express();
  app.use(telemetry.requestSpanMiddleware);
  app.use(express.json());
  const trade = express.Router();
  trade.post("/:id", (req, res) => telemetry.withSpan("omen.decision.select", () => res.json({ ok: true })));
  app.use("/api/trade", telemetry.routeSpanMiddleware("trade.request"), trade);

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(
      `http://127.0.0.1:${port}/api/trade/abc-123?league_id=987654&access_token=tok-xyz&email=fan%40example.com`,
      {
        method: "POST",
        headers: {
          cookie: "espn_s2=COOKIEVALUE; SWID={SWIDVALUE}",
          authorization: "Bearer BEARERVALUE",
          "content-type": "application/json",
          "x-user-id": "user-555",
        },
        body: JSON.stringify({ user_id: "user-555", league_id: "987654" }),
      },
    );
    assert.equal(response.status, 200);
    await response.json();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const spans = exporter.getFinishedSpans();
  const request = spans.find((s) => s.name.startsWith("POST "));
  assert.ok(request, "request span exported");
  assert.equal(request.name, "POST /api/trade/:id");
  assert.equal(request.attributes["http.route"], "/api/trade/:id");
  assert.equal(request.attributes["http.response.status_code"], 200);
  const tradeSpan = spans.find((s) => s.name === "trade.request");
  assert.equal(tradeSpan.parentSpanContext.spanId, request.spanContext().spanId);
  assert.ok(spans.find((s) => s.name === "omen.decision.select"));

  for (const span of spans) {
    for (const key of Object.keys(span.attributes)) assert.ok(telemetry.SAFE_ATTRIBUTE_KEYS.has(key), key);
    const serialized = JSON.stringify({ name: span.name, attributes: span.attributes, events: span.events });
    for (const leaked of [
      "abc-123", "987654", "tok-xyz", "fan@example.com", "fan%40example.com", "COOKIEVALUE", "SWIDVALUE",
      "BEARERVALUE", "user-555", "league_id", "access_token", "?",
    ]) {
      assert.equal(serialized.includes(leaked), false, `${span.name} leaked ${leaked}`);
    }
  }
});

test("unmatched routes are not named by their raw path", async () => {
  const exporter = startTracing();
  const app = express();
  app.use(telemetry.requestSpanMiddleware);
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/user/someone@example.com?x=1`);
    assert.equal(response.status, 404);
    await response.text();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const [span] = exporter.getFinishedSpans();
  assert.equal(span.name, "GET unmatched");
  assert.equal(JSON.stringify(span.attributes).includes("example.com"), false);
});

test("traceCronJob is a pass-through when tracing is off", async () => {
  const saved = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  try {
    assert.equal(await telemetry.traceCronJob("unit", async () => 7), 7);
    assert.equal(telemetry.isTelemetryEnabled(), false);
  } finally {
    if (saved !== undefined) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = saved;
  }
});
