"use strict";

// Regression: production logged `MaxListenersExceededWarning: 11 finish
// listeners added to [ServerResponse]` on GET /api/health. Sentry's Express
// instrumentation attached one `res.once("finish")` per middleware layer, and
// a synchronous chain holds every one of them at once. Tracing is off
// (tracesSampleRate 0), so those layer spans were pure overhead.
//
// Own file on purpose: Sentry.init and the Express hook are process-wide, and
// express must be required after init for the instrumentation to attach.

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, test } = require("node:test");

const sentryDsnEnvName = ["SENTRY", "DSN"].join("_");
process.env[sentryDsnEnvName] = "http://fake@127.0.0.1:9/1";

const { flushSentry, initSentry } = require("../src/middleware/sentry");
initSentry({ component: "api" });
const express = require("express");

after(async () => {
  delete process.env[sentryDsnEnvName];
  await flushSentry(0);
});

function get(server, path) {
  return new Promise((resolve, reject) => {
    http.get({ port: server.address().port, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

test("a deep synchronous middleware chain adds no per-layer finish listeners", async (t) => {
  const warnings = [];
  const onWarning = (w) => { if (w.name === "MaxListenersExceededWarning") warnings.push(w); };
  process.on("warning", onWarning);
  t.after(() => process.off("warning", onWarning));

  const app = express();
  // Twelve synchronous layers, deeper than the 10-listener default and in the
  // same shape as the /api/health path through server.js.
  for (let i = 0; i < 12; i += 1) app.use((_req, _res, next) => next());
  const router = express.Router();
  router.get("/health", (_req, res) => res.json({ finish: res.listenerCount("finish") }));
  app.use("/api", router);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const res = await get(server, "/api/health");
  assert.equal(res.status, 200);
  const { finish } = JSON.parse(res.body);
  assert.ok(finish <= 2, `expected no per-layer finish listeners, saw ${finish}`);

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(warnings.map((w) => w.message), []);
});

test("an error thrown in a route is still captured with the route's transaction name", async (t) => {
  const Sentry = require("@sentry/node");
  const events = [];
  Sentry.getClient().on("beforeSendEvent", (event) => events.push(event));

  const app = express();
  app.get("/boom/:id", () => { throw new Error("route-boom"); });
  Sentry.setupExpressErrorHandler(app);
  app.use((_err, _req, res, _next) => res.status(500).end());

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const res = await get(server, "/boom/7");
  assert.equal(res.status, 500);
  await Sentry.flush(200);

  const event = events.find((e) => e.exception?.values?.[0]?.value === "route-boom");
  assert.ok(event, "route error reached Sentry");
  assert.equal(event.transaction, "GET /boom/:id");
});
