"use strict";

const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const Sentry = require("@sentry/node");
const {
  flushSentry,
  initSentry,
  scrubSentryEvent,
} = require("../src/middleware/sentry");

const sentryDsnEnvName = ["SENTRY", "DSN"].join("_");

afterEach(async () => {
  delete process.env[sentryDsnEnvName];
  await flushSentry(0);
});

test("Sentry init is a disabled no-op when no DSN is configured", async () => {
  process.env[sentryDsnEnvName] = "";

  const client = initSentry({ component: "api" });
  const options = client.getOptions();

  assert.equal(Sentry.getClient(), client);
  assert.equal(options.enabled, false);
  assert.equal(Boolean(options.dsn), false);
});

test("Sentry init accepts a fake DSN without sending an event", async () => {
  process.env[sentryDsnEnvName] = "https://fake@fake.ingest.sentry.io/0";

  const client = initSentry({ component: "api" });
  const options = client.getOptions();

  assert.equal(Sentry.getClient(), client);
  assert.equal(options.enabled, true);
  assert.equal(Boolean(options.dsn), true);
});

test("Sentry scrubber drops ESPN credential-bearing request events", () => {
  const result = scrubSentryEvent({
    request: {
      method: "POST",
      url: "https://slopssaloon.com/api/platforms/espn/connect",
    },
  }, {});

  assert.equal(result, null);
});

test("Sentry scrubber redacts OAuth callback code and state from request URLs", () => {
  const result = scrubSentryEvent({
    request: {
      method: "GET",
      url: "https://slopssaloon.com/api/yahoo/callback?code=authorization-code&state=csrf-state&error=invalid_scope",
    },
  }, {});

  assert.equal(result.request.url.includes("authorization-code"), false);
  assert.equal(result.request.url.includes("csrf-state"), false);
  assert.match(result.request.url, /code=%5Bscrubbed%5D/);
  assert.match(result.request.url, /state=%5Bscrubbed%5D/);
});
