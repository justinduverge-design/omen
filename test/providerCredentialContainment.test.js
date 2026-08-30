"use strict";

/**
 * S4 — no provider credential is reachable in logs or error envelopes.
 *
 * O8 proved this for GlitchTip payloads (`test/providerErrorCapture.test.js`).
 * This file extends the same bar to the other two surfaces a credential can
 * escape through: **stdout** and the **HTTP error envelope**.
 *
 * The method matters more than the assertions. Reading the adapters and
 * agreeing that they look careful is exactly how a containment claim goes
 * stale — it stays true only until the next field is added, and its failure
 * mode is silence. So each test here:
 *
 *   1. feeds a uniquely-shaped canary credential to a real adapter,
 *   2. provokes a real failure through the adapter's real transport path,
 *      with the fake provider **echoing the credential back** in its body and
 *      headers — the adversarial case, and one ESPN and Yahoo have both been
 *      observed to do,
 *   3. captures everything actually written to stdout and stderr, plus the
 *      client-facing envelope,
 *   4. searches that captured text for the exact canary values.
 *
 * No real credential values appear in this file. Every canary is a
 * syntactically plausible fake, chosen to be a string that could not occur by
 * accident in log output.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const https = require("node:https");
const { test } = require("node:test");
const express = require("express");
const axios = require("axios");

const espnAdapter = require("../src/adapters/espn");
const sleeperAdapter = require("../src/adapters/sleeper");
const YahooClient = require("../src/services/yahoo");
const { buildErrorEnvelope, errorHandler } = require("../src/middleware/errorEnvelope");

// --- Canaries -------------------------------------------------------
//
// Fake, but shaped like the real thing. Each is a distinctive literal so a
// substring search over captured output is exact rather than heuristic.

const CANARY = Object.freeze({
  espnS2: "AECanary0espn0s2000value0must0not0leak0000000000000",
  swidBare: "0BADCAFE-1111-2222-3333-444455556666",
  swid: "{0BADCAFE-1111-2222-3333-444455556666}",
  yahooAccessToken: "ya29.canary0yahoo0access0token0must0not0leak",
  yahooRefreshToken: "canary0yahoo0refresh0token0must0not0leak",
  sleeperAuthorization: "Bearer canary0sleeper0authorization0must0not0leak",
});

/** Every canary secret, as the flat list a leak check walks. */
const ALL_CANARY_VALUES = Object.freeze([
  CANARY.espnS2,
  CANARY.swidBare,
  CANARY.yahooAccessToken,
  CANARY.yahooRefreshToken,
  "canary0sleeper0authorization0must0not0leak",
]);

function assertNoCanary(captured, surface) {
  for (const secret of ALL_CANARY_VALUES) {
    assert.equal(
      captured.includes(secret),
      false,
      `${surface} leaked a credential fragment (${secret.slice(0, 18)}…):\n${captured}`,
    );
  }
}

// --- stdout / stderr capture ----------------------------------------

/**
 * Capture everything the process writes while `fn` runs, and return it as one
 * string alongside whatever `fn` produced.
 *
 * Writes are teed to the real stream rather than swallowed: node:test's own
 * reporter writes to stdout, and dropping its output mid-run would corrupt the
 * report. The winston lines this prints are the evidence, not noise.
 *
 * winston's Console transport, morgan (piped through winston), and any stray
 * `console.log` all land here, so this is the actual emitted-output surface
 * rather than a stand-in for it.
 */
async function captureOutput(fn) {
  const chunks = [];
  const originals = {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  };

  const tee = (original) => function patched(chunk, encoding, callback) {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return original(chunk, encoding, callback);
  };

  process.stdout.write = tee(originals.stdout);
  process.stderr.write = tee(originals.stderr);

  let result;
  let thrown = null;
  try {
    result = await fn();
  } catch (error) {
    thrown = error;
  } finally {
    process.stdout.write = originals.stdout;
    process.stderr.write = originals.stderr;
  }

  return { captured: chunks.join(""), result, thrown };
}

// --- Fake providers --------------------------------------------------

/**
 * Stand in for ESPN over a real socket.
 *
 * `https.request` is redirected at the loopback server, so the adapter builds
 * its real Cookie header, really transmits it, and really parses the response.
 * The server records what it received — which is how the test proves the
 * canary was genuinely on the wire, not merely passed to a stub — and echoes
 * it straight back, which is the worst thing a provider can do.
 */
async function withFakeEspn({ status, body }, fn) {
  const received = { cookie: null };

  const server = http.createServer((req, res) => {
    received.cookie = req.headers.cookie || null;
    res.writeHead(status, {
      "content-type": "application/json",
      // A provider echoing your own credential back in a response header.
      "x-echoed-cookie": String(received.cookie || "").replace(/[\r\n]/g, ""),
    });
    res.end(typeof body === "function" ? body(received) : body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  const originalRequest = https.request;
  https.request = (options, callback) => http.request(
    { ...options, protocol: "http:", hostname: "127.0.0.1", port },
    callback,
  );

  try {
    return await fn(received);
  } finally {
    https.request = originalRequest;
    await new Promise((resolve) => server.close(resolve));
  }
}

/**
 * Stand in for Yahoo. `YahooClient.get` goes through global fetch.
 *
 * Only Yahoo's own host is intercepted; everything else is delegated to the
 * real fetch. The first draft swallowed every call, so the loopback request
 * this suite makes to read its own error envelope came back as the fake Yahoo
 * body — and the test reported a credential leak in an envelope it had never
 * actually reached. A stub broad enough to answer the wrong caller produces
 * findings about itself.
 */
const YAHOO_HOST = "fantasysports.yahooapis.com";

async function withFakeYahoo({ status, body, wwwAuthenticate }, fn) {
  const originalFetch = globalThis.fetch;
  const received = { authorization: null };

  globalThis.fetch = async (url, init = {}) => {
    if (!String(url).includes(YAHOO_HOST)) return originalFetch(url, init);

    received.authorization = init?.headers?.Authorization || null;
    return new Response(body, {
      status,
      headers: {
        "content-type": "application/json",
        ...(wwwAuthenticate ? { "www-authenticate": wwwAuthenticate } : {}),
      },
    });
  };

  try {
    return await fn(received);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/**
 * Stand in for Sleeper.
 *
 * Sleeper's own API is public, so the credential risk here is not a Sleeper
 * secret — it is the axios error itself. An axios failure carries
 * `error.config`, and `config.headers` holds every header the request sent,
 * Authorization included. Anything that logs an axios error whole publishes
 * that. This is the leak vector worth proving closed, so the fake error is
 * built with a populated `config.headers`.
 */
async function withFakeSleeper({ status, data }, fn) {
  const originalGet = axios.get;

  axios.get = async (url) => {
    const error = new Error(`Request failed with status code ${status}`);
    error.isAxiosError = true;
    error.code = "ERR_BAD_REQUEST";
    error.config = {
      url,
      method: "get",
      headers: {
        Authorization: CANARY.sleeperAuthorization,
        cookie: `espn_s2=${CANARY.espnS2}`,
      },
    };
    error.response = {
      status,
      headers: { "content-type": "application/json" },
      data,
    };
    throw error;
  };

  try {
    return await fn();
  } finally {
    axios.get = originalGet;
  }
}

// --- An app that ends in the real error handler ----------------------

/**
 * The shipped terminal handler, reached the way a real failure reaches it.
 * `express.Router` errors bubble here exactly as they do in `server.js`.
 */
function buildErrorApp(failing) {
  const app = express();
  app.set("trust proxy", true);
  app.get("/boom", async (req, res, next) => {
    try {
      await failing();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  app.use(errorHandler);
  return app;
}

async function envelopeFor(failing) {
  const server = http.createServer(buildErrorApp(failing));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/boom`);
    return { status: res.status, text: await res.text() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// --- ESPN ------------------------------------------------------------

test("ESPN auth rejection: the cookie really goes out, and nothing comes back in logs or the envelope", async () => {
  await withFakeEspn({
    status: 401,
    // ESPN returning your own credential inside its refusal.
    body: (received) => JSON.stringify({
      messages: ["not authorized"],
      echoed_request_cookie: received.cookie,
    }),
  }, async (received) => {
    const { captured, thrown } = await captureOutput(() => (
      espnAdapter.verifyLeagueAccess("1234567", CANARY.espnS2, CANARY.swid)
    ));

    // The premise of the whole test: the credential was actually transmitted.
    // Without this, a passing leak check would only prove the request never
    // carried anything to leak.
    assert.ok(received.cookie, "the adapter must have sent a Cookie header");
    assert.ok(
      received.cookie.includes(CANARY.espnS2),
      "the canary espn_s2 must genuinely have been on the wire",
    );

    assert.ok(thrown, "a 401 from ESPN must reject");
    assert.match(thrown.message, /ESPN rejected the request/);

    assertNoCanary(captured, "ESPN 401 stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "ESPN 401 error envelope");
    assert.equal(envelope.status, 401);
  });
});

test("ESPN 500 and malformed-response paths emit no credential", async () => {
  for (const scenario of [
    { status: 500, body: () => JSON.stringify({ error: "upstream boom" }) },
    // Non-JSON is the path that reads the whole body before failing — the one
    // most likely to end up in a log line by accident.
    { status: 200, body: (received) => `<html>session ${received.cookie}</html>` },
  ]) {
    await withFakeEspn(scenario, async () => {
      const { captured, thrown } = await captureOutput(() => (
        espnAdapter.verifyLeagueAccess("1234567", CANARY.espnS2, CANARY.swid)
      ));

      assert.ok(thrown, `HTTP ${scenario.status} must reject`);
      assertNoCanary(captured, `ESPN ${scenario.status} stdout`);

      const envelope = await envelopeFor(() => Promise.reject(thrown));
      assertNoCanary(envelope.text, `ESPN ${scenario.status} error envelope`);
    });
  }
});

test("ESPN transport failure emits no credential", async () => {
  const originalRequest = https.request;
  https.request = (options, callback) => {
    // A real closed port: the adapter's `req.on("error")` path, unmocked.
    const req = http.request({ ...options, protocol: "http:", hostname: "127.0.0.1", port: 1 }, callback);
    return req;
  };

  try {
    const { captured, thrown } = await captureOutput(() => (
      espnAdapter.verifyLeagueAccess("1234567", CANARY.espnS2, CANARY.swid)
    ));

    assert.ok(thrown, "a dead upstream must reject");
    assertNoCanary(captured, "ESPN transport-error stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "ESPN transport-error envelope");
  } finally {
    https.request = originalRequest;
  }
});

// --- Yahoo -----------------------------------------------------------

test("Yahoo 403: the token goes out and neither the body echo nor the challenge comes back", async () => {
  await withFakeYahoo({
    status: 403,
    // Yahoo's own error bodies have carried request context back before.
    body: JSON.stringify({
      error: { description: "This application is not authorized." },
      access_token: CANARY.yahooAccessToken,
      refresh_token: CANARY.yahooRefreshToken,
    }),
    wwwAuthenticate: `OAuth oauth_problem="token_rejected", token=${CANARY.yahooAccessToken}`,
  }, async (received) => {
    const client = new YahooClient(CANARY.yahooAccessToken);

    const { captured, thrown } = await captureOutput(() => client.get("/game/nfl"));

    assert.equal(received.authorization, `Bearer ${CANARY.yahooAccessToken}`);
    assert.ok(thrown, "a 403 from Yahoo must reject");
    assert.equal(thrown.message, "Yahoo API error: 403");

    assertNoCanary(captured, "Yahoo 403 stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "Yahoo 403 error envelope");
    // The diagnostic that made the 403 tractable must still survive — the
    // requirement is containment, not blanket suppression.
    assert.ok(thrown.body.includes("not authorized"));
  });
});

test("Yahoo expired-token path emits no credential", async () => {
  await withFakeYahoo({ status: 401, body: JSON.stringify({ error: "expired" }) }, async () => {
    const client = new YahooClient(CANARY.yahooAccessToken);
    const { captured, thrown } = await captureOutput(() => client.get("/game/nfl"));

    assert.equal(thrown.message, "yahoo_token_expired");
    assertNoCanary(captured, "Yahoo 401 stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "Yahoo 401 error envelope");
  });
});

test("a Yahoo error whose message itself carries a token is scrubbed before the client sees it", () => {
  // The realistic shape: a fetch/transport failure whose message quotes the
  // full URL, and that URL carried the credential in its query string. The
  // handler echoes `err.message` verbatim outside production, so this is the
  // path where a message becomes a response body.
  const error = new Error(
    `request to https://fantasysports.yahooapis.com/fantasy/v2/game/nfl?access_token=${CANARY.yahooAccessToken} failed`,
  );
  error.status = 502;

  const { body } = buildErrorEnvelope(error, { isProd: false });

  assert.equal(body.error.includes(CANARY.yahooAccessToken), false);
  assert.match(body.error, /access_token=\[scrubbed\]/);
  // The actionable part is kept.
  assert.match(body.error, /fantasysports\.yahooapis\.com/);
});

// --- Sleeper ---------------------------------------------------------

test("Sleeper failure: the axios error's own request headers never reach logs or the envelope", async () => {
  await withFakeSleeper({
    status: 403,
    data: { error: "forbidden", echoed_authorization: CANARY.sleeperAuthorization },
  }, async () => {
    const { captured, thrown } = await captureOutput(() => (
      sleeperAdapter.fetchSleeperUser("some-manager")
    ));

    assert.ok(thrown, "a Sleeper 403 must reject");
    // The error genuinely carries the credential — that is the hazard being
    // contained, and asserting it here keeps the test honest about what it
    // is proving.
    assert.equal(thrown.config.headers.Authorization, CANARY.sleeperAuthorization);

    assertNoCanary(captured, "Sleeper 403 stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "Sleeper 403 error envelope");
  });
});

test("Sleeper rate-limit reshaping emits no credential", async () => {
  await withFakeSleeper({ status: 429, data: { error: "slow down" } }, async () => {
    const { captured, thrown } = await captureOutput(() => (
      sleeperAdapter.fetchSleeperUser("some-manager")
    ));

    assert.equal(thrown.code, "sleeper_rate_limited");
    assertNoCanary(captured, "Sleeper 429 stdout");

    const envelope = await envelopeFor(() => Promise.reject(thrown));
    assertNoCanary(envelope.text, "Sleeper 429 error envelope");
  });
});

// --- The backstop itself ---------------------------------------------
//
// The tests above prove the adapters' current failure paths are clean. These
// prove the *boundary* is clean, so a future call site that does the careless
// thing is redacted rather than published. Written against the shipped logger,
// not a copy of it.

test("logging an entire provider error object redacts its credentials", async () => {
  const { logger } = require("../src/middleware/logging");

  const espnError = new Error("ESPN rejected the request");
  espnError.status = 401;

  const { captured } = await captureOutput(async () => {
    // Exactly the mistake the per-call-site convention exists to prevent:
    // hand the logger the whole error and the whole context.
    logger.error("careless provider log", {
      err: espnError.message,
      cookie: `espn_s2=${CANARY.espnS2}; SWID=${CANARY.swid}`,
      access_token: CANARY.yahooAccessToken,
      refresh_token: CANARY.yahooRefreshToken,
      authorization: CANARY.sleeperAuthorization,
      nested: { deeper: { espn_s2: CANARY.espnS2 } },
      raw: `Cookie: espn_s2=${CANARY.espnS2}`,
      league_id: "1234567",
    });
    // Let the transport flush before the capture is torn down.
    await new Promise((resolve) => setImmediate(resolve));
  });

  assertNoCanary(captured, "careless whole-object log");
  // Non-sensitive context still survives, or the backstop would be useless.
  assert.ok(captured.includes("1234567"), "league_id is diagnostic, not a secret");
});

test("a bare SWID value with no key beside it is the one shape the text scrubber cannot see", () => {
  // Stated as a known boundary rather than left implicit. `scrubText` keys off
  // `name=value` / `"name": "value"`, so a value logged with no name attached
  // passes through untouched.
  //
  // This is not a live exposure: no code path logs a bare SWID, and
  // facts-of-record #6 keeps ESPN cookie values out of every emission site by
  // construction (`reportEspnFailure` takes hostname and path only, and never
  // the headers, cookie jar, or body). It is recorded here so the next person
  // reading these tests knows precisely what the backstop does and does not
  // cover, instead of assuming it covers everything.
  const { scrubText } = require("../src/middleware/sentry");

  assert.equal(scrubText(`SWID=${CANARY.swid}`).includes(CANARY.swidBare), false);
  assert.equal(scrubText(CANARY.swid).includes(CANARY.swidBare), true);
});

test("the error handler is the shipped one, and server.js has no second copy", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");

  assert.match(server, /app\.use\(errorHandler\)/);
  assert.match(server, /require\("\.\/middleware\/errorEnvelope"\)/);
  // An inline duplicate would drift, and the drifted copy is the one that ships.
  assert.equal(
    server.includes('error: config.isProd && status >= 500'),
    false,
    "server.js must not carry a second, untested error envelope",
  );
});

// ---------------------------------------------------------------------------
// A8 — 2026-08-30. Found by provoking the scrubber with canaries rather than
// reading it, which is the only way this repo has ever found a hole in it.
// ---------------------------------------------------------------------------

test("A8: request.query_string is scrubbed — an OAuth callback error must not carry the code", () => {
  const { scrubSentryEvent } = require("../src/middleware/sentry");
  const canary = "CANARY_OAUTH_CODE_qqq111";

  // `beforeSend` covered url, headers, data, extra, message and contexts — and not
  // query_string, which Sentry's express integration populates. So the URL beside it was
  // correctly redacted while this delivered the credential verbatim.
  const event = scrubSentryEvent({
    request: {
      url: `https://slopssaloon.com/api/yahoo/callback?code=${canary}`,
      query_string: `code=${canary}&state=abc`,
    },
  });

  assert.ok(!JSON.stringify(event).includes(canary), "no OAuth code may reach the error backend");
});

test("A8: an access token in a query string is scrubbed", () => {
  const { scrubSentryEvent } = require("../src/middleware/sentry");
  const canary = "CANARY_ACCESS_TOKEN_www222";

  const event = scrubSentryEvent({
    request: { url: "/x", query_string: `access_token=${canary}` },
  });

  assert.ok(!JSON.stringify(event).includes(canary));
});

test("A8: an OAuth code is scrubbed as a bare key and in query position", () => {
  const { scrubText, scrubValue } = require("../src/middleware/sentry");
  const canary = "CANARY_CODE_abc";

  assert.ok(!scrubText(`callback failed ?code=${canary}`).includes(canary));
  assert.ok(!JSON.stringify(scrubValue({ code: canary })).includes(canary));
});

test("A8: scrubbing `code` must not destroy the diagnostics an error report exists for", () => {
  const { scrubText, scrubValue } = require("../src/middleware/sentry");

  // `code` cannot join the general vocabulary — that pattern allows any prefix, so it would
  // also redact these. The narrow rule exists precisely to keep them readable.
  for (const kept of ["status_code=500", "error_code=ESPN_404", "country_code=US", "HTTP code 401"]) {
    assert.equal(scrubText(kept), kept, `${kept} must survive scrubbing`);
  }
  const out = scrubValue({ status_code: 500, error_code: "X" });
  assert.equal(out.status_code, 500);
  assert.equal(out.error_code, "X");
});
