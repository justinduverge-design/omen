"use strict";

/**
 * O8 — provider error capture.
 *
 * The two tests that matter here are the negative ones: no credential
 * fragment reaches the payload, and demo-mode errors never reach the real
 * project. Both are `Done when:` requirements, and both are the kind of
 * property that is easy to satisfy today and quietly break in six months.
 */

const assert = require("node:assert/strict");
const { test } = require("node:test");
const Sentry = require("@sentry/node");
const {
  captureProviderError,
  MAX_BODY_CHARS,
} = require("../src/middleware/providerErrors");
const {
  DEMO_MODE_TAG,
  DEMO_MODE_TAG_VALUE,
  isDemoEvent,
  scrubSentryEvent,
} = require("../src/middleware/sentry");

/** Capture what captureProviderError hands Sentry, without a network call. */
function recordCapture(fn) {
  const original = Sentry.captureException;
  const calls = [];
  Sentry.captureException = (error, hint) => {
    calls.push({ error, hint });
    return "test-event-id";
  };
  try {
    fn();
  } finally {
    Sentry.captureException = original;
  }
  return calls;
}

/** The full payload path: what the helper builds, then what beforeSend does to it. */
function capturedEvent(args) {
  const [call] = recordCapture(() => captureProviderError(args));
  if (!call) return null;
  return scrubSentryEvent({
    exception: {
      values: [{ value: call.error.message, stacktrace: { frames: [] } }],
    },
    tags: call.hint.tags,
    extra: call.hint.extra,
  }, { originalException: call.error });
}

// --- Credential / PII containment ---------------------------------

test("provider capture does not forward an ESPN cookie or SWID", () => {
  const error = new Error("ESPN rejected the request — cookies may be invalid or expired");
  error.status = 401;
  // ESPN's own error bodies have echoed request context before; if one ever
  // carries the cookie back, it must not survive into the payload.
  error.body = "denied for espn_s2=AEB1234secretcookievalue; SWID={11111111-2222-3333-4444-555555555555}";

  const event = capturedEvent({
    provider: "espn",
    operation: "auth_rejected",
    error,
    context: {
      hostname: "lm-api-reads.fantasy.espn.com",
      path: "/apis/v3/games/ffl/seasons/2026/segments/0/leagues/123456",
      // Deliberately passing credentials the caller should never pass. The
      // allowlist is what makes this test pass, not caller discipline.
      espn_s2: "AEB1234secretcookievalue",
      swid: "{11111111-2222-3333-4444-555555555555}",
      cookie: "espn_s2=AEB1234secretcookievalue",
    },
  });

  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes("AEB1234secretcookievalue"), false);
  assert.equal(serialized.includes("11111111-2222-3333-4444-555555555555"), false);
  assert.equal("espn_s2" in event.extra, false);
  assert.equal("swid" in event.extra, false);
  assert.equal("cookie" in event.extra, false);
  // The actionable, non-identifying context does survive.
  assert.equal(event.extra.provider, "espn");
  assert.equal(event.extra.http_status, 401);
});

test("provider capture does not forward a Yahoo access token or refresh token", () => {
  const error = new Error("Yahoo API error: 403");
  error.status = 403;
  error.body = JSON.stringify({
    error: { description: "This application is not authorized to perform this action." },
    access_token: "ya29.super-secret-access-token",
  });
  error.wwwAuthenticate = 'OAuth oauth_problem="token_rejected", token=abc123secret';

  const event = capturedEvent({
    provider: "yahoo",
    operation: "api_get",
    error,
    context: {
      path: "/fantasy/v2/game/nfl",
      http_status: 403,
      access_token: "ya29.super-secret-access-token",
      refresh_token: "refresh-secret-value",
    },
  });

  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes("ya29.super-secret-access-token"), false);
  assert.equal(serialized.includes("refresh-secret-value"), false);
  assert.equal(serialized.includes("abc123secret"), false);
  assert.equal("access_token" in event.extra, false);
  assert.equal("refresh_token" in event.extra, false);
  // Yahoo's own explanation — the whole point of reading the body — survives.
  assert.equal(
    event.extra.provider_body_snippet.includes("not authorized to perform this action"),
    true,
  );
});

test("provider capture does not forward an unlisted context key of any name", () => {
  const event = capturedEvent({
    provider: "sleeper",
    operation: "api_get",
    error: new Error("Sleeper unavailable"),
    context: {
      league_id: "987654321",
      email: "someone@example.com",
      user_ip: "203.0.113.7",
      display_name: "a real person",
      supabase_user_id: "8f0b1c2d-3e4f-5061-7283-94a5b6c7d8e9",
    },
  });

  assert.equal(event.extra.league_id, "987654321");
  for (const leaked of ["email", "user_ip", "display_name", "supabase_user_id"]) {
    assert.equal(leaked in event.extra, false, `${leaked} must not reach the payload`);
  }
  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes("someone@example.com"), false);
  assert.equal(serialized.includes("203.0.113.7"), false);
});

test("provider body snippet is capped so a vendor HTML error page cannot flood the payload", () => {
  const error = new Error("Yahoo API error: 500");
  error.status = 500;
  error.body = "x".repeat(50_000);

  const event = capturedEvent({ provider: "yahoo", operation: "api_get", error });

  assert.equal(event.extra.provider_body_snippet.length, MAX_BODY_CHARS);
});

// --- Demo-mode isolation ------------------------------------------

test("demo-mode provider errors are never captured at all", () => {
  const calls = recordCapture(() => captureProviderError({
    provider: "sleeper",
    operation: "api_get",
    error: new Error("demo_fixture_invalid: expected a lineup recommendation"),
    demo: true,
  }));

  assert.deepEqual(calls, []);
});

test("live provider captures are tagged live, not demo", () => {
  const event = capturedEvent({
    provider: "sleeper",
    operation: "api_get",
    error: new Error("Sleeper unavailable"),
  });

  assert.equal(event.tags[DEMO_MODE_TAG], "live");
  assert.equal(isDemoEvent(event), false);
});

test("beforeSend drops any event thrown under a demo route", () => {
  for (const url of [
    "https://slopssaloon.com/api/demo",
    "https://slopssaloon.com/api/demo/omen",
    "/api/demo/omen?week=1",
  ]) {
    const result = scrubSentryEvent({
      request: { method: "GET", url },
      exception: { values: [{ value: "demo_fixture_invalid" }] },
    }, {});
    assert.equal(result, null, `${url} must not be reported`);
  }
});

test("beforeSend drops any event explicitly tagged as demo mode", () => {
  const result = scrubSentryEvent({
    tags: { [DEMO_MODE_TAG]: DEMO_MODE_TAG_VALUE },
    exception: { values: [{ value: "demo_fixture_invalid" }] },
  }, {});

  assert.equal(result, null);
});

test("a route that merely contains the word demo is still reported", () => {
  // /api/demonstrations is not /api/demo — prefix matching must respect the
  // path segment boundary or a real route could be silently unreportable.
  const result = scrubSentryEvent({
    request: { method: "GET", url: "https://slopssaloon.com/api/demographics" },
    exception: { values: [{ value: "real error" }] },
  }, {});

  assert.notEqual(result, null);
});

// --- Grouping ------------------------------------------------------

test("provider errors group by provider, operation, and status, not by stack", () => {
  const [entitlement] = recordCapture(() => {
    const error = new Error("Yahoo API error: 403");
    error.status = 403;
    captureProviderError({ provider: "yahoo", operation: "api_get", error });
  });
  const [outage] = recordCapture(() => {
    const error = new Error("Yahoo API error: 500");
    error.status = 500;
    captureProviderError({ provider: "yahoo", operation: "api_get", error });
  });

  assert.deepEqual(entitlement.hint.fingerprint, ["provider", "yahoo", "api_get", "403"]);
  assert.deepEqual(outage.hint.fingerprint, ["provider", "yahoo", "api_get", "500"]);
});

test("capture never throws, whatever it is handed", () => {
  const circular = { name: "circular" };
  circular.self = circular;

  assert.doesNotThrow(() => captureProviderError());
  assert.doesNotThrow(() => captureProviderError({ provider: null, error: null }));
  assert.doesNotThrow(() => captureProviderError({
    provider: "yahoo",
    operation: "api_get",
    error: "a bare string, not an Error",
    context: circular,
  }));
});

test("an unrecognized provider name is normalized rather than passed through", () => {
  const [call] = recordCapture(() => captureProviderError({
    provider: "<script>alert(1)</script>",
    operation: "api_get",
    error: new Error("boom"),
  }));

  assert.equal(call.hint.tags.provider, "unknown");
});

// --- DSN validity --------------------------------------------------
//
// Found live in production 2026-08-21: both containers carried
// SENTRY_DSN="paste_the_value_here" + a real DSN. The old guard was
// `Boolean(process.env.SENTRY_DSN)`, so the SDK reported enabled:true,
// built no transport, and dropped every event silently. Omen reported
// errors nowhere, and nothing said so.

const { describeSentryDsn } = require("../src/middleware/sentry");

test("the exact malformed DSN found in production is rejected, not accepted", () => {
  const result = describeSentryDsn(
    "paste_the_value_herehttps://abc123@o4511559534641152.ingest.us.sentry.io/4511559540473856",
  );

  assert.equal(result.configured, true);
  assert.equal(result.valid, false, "a truthy string is not a valid DSN");
  assert.equal(result.reason, "unparseable");
});

test("a valid DSN is accepted and described without exposing its key", () => {
  const result = describeSentryDsn("https://supersecretkey@glitchtip.example/7");

  assert.equal(result.valid, true);
  assert.equal(result.host, "glitchtip.example");
  assert.equal(result.project_id, "7");
  assert.equal(JSON.stringify(result).includes("supersecretkey"), false);
});

test("every invalid DSN shape is reported invalid with a distinguishable reason", () => {
  const cases = [
    ["", "not_configured"],
    ["   ", "not_configured"],
    ["not-a-url-at-all", "unparseable"],
    ["ftp://key@host/1", "bad_scheme"],
    ["https://host/1", "missing_key"],
    ["https://key@host", "missing_project_id"],
    ["https://key@host/", "missing_project_id"],
  ];

  for (const [dsn, reason] of cases) {
    const result = describeSentryDsn(dsn);
    assert.equal(result.valid, false, `${JSON.stringify(dsn)} must be invalid`);
    assert.equal(result.reason, reason, `${JSON.stringify(dsn)} reason`);
  }
});

test("an invalid DSN disables the client instead of enabling a transportless one", () => {
  const dsnEnv = ["SENTRY", "DSN"].join("_");
  const previous = process.env[dsnEnv];
  process.env[dsnEnv] = "paste_the_value_herehttps://abc123@ingest.example/1";

  try {
    const client = require("../src/middleware/sentry").initSentry({ component: "api" });
    // The bug: enabled true with no transport looks healthy and drops everything.
    assert.equal(client.getOptions().enabled, false);
  } finally {
    if (previous === undefined) delete process.env[dsnEnv];
    else process.env[dsnEnv] = previous;
  }
});

test("a dashed-UUID key is rejected — the SDK's own parser refuses it", () => {
  // GlitchTip mints project keys as dashed UUIDs. @sentry/node's DSN grammar
  // allows only [A-Za-z0-9_], so it rejects them with "Invalid Sentry Dsn"
  // and drops every event. Observed live against the omen-backend project.
  // A validator looser than the SDK would report healthy while nothing sends.
  const result = describeSentryDsn("http://2ca26f96-93c6-4d17-8b73-5d184a5680ff@100.98.81.0:8000/1");

  assert.equal(result.valid, false);
  assert.equal(result.reason, "key_not_sdk_parseable");
});

test("the same GlitchTip key with dashes stripped is accepted", () => {
  const result = describeSentryDsn("http://2ca26f9693c64d178b735d184a5680ff@100.98.81.0:8000/1");

  assert.equal(result.valid, true);
  assert.equal(result.host, "100.98.81.0:8000");
  assert.equal(result.project_id, "1");
});
