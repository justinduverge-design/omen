"use strict";

/**
 * O8 verification — real adapter failure -> real SDK -> real wire envelope.
 *
 * Runs the genuine ESPN adapter against ESPN's real reads API, asking for a
 * league id that does not exist. ESPN answers HTTP 404 and doEspnRequest()
 * raises its own error — so the failure originates inside the adapter on a
 * real network round trip, not from a hand-built error object. That is what
 * O8's `Done when:` means by "not a curl-synthetic test".
 *
 * A local sink stands in for the GlitchTip ingest endpoint and records the
 * exact bytes the SDK transmits. That is what makes this a leak test rather
 * than a smoke test: it inspects the payload as sent, not as intended.
 *
 * What this DOES do: one read-only, unauthenticated-in-effect GET to
 * lm-api-reads.fantasy.espn.com for a nonexistent league. The espn_s2/SWID
 * values it sends are obvious non-secrets, present only so the leak
 * assertions have a canary to search the wire for.
 *
 * What this does NOT do: contact Yahoo, Sleeper, Supabase, the real
 * GlitchTip instance, or any real user's league. It needs no credentials
 * and requires network access to ESPN only.
 */

const http = require("node:http");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "verification-placeholder";
process.env.NODE_ENV = "test";

// Credentials the adapter will be handed. Nothing resembling these may
// appear anywhere in the transmitted envelope.
const FAKE_ESPN_S2 = "AEB-verification-canary-espn-s2-value";
const FAKE_SWID = "{DEADBEEF-0000-1111-2222-333344445555}";

async function main() {
  const received = [];
  const sink = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "verification-event" }));
    });
  });

  await new Promise((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const { port } = sink.address();

  process.env.SENTRY_DSN = `http://verificationkey@127.0.0.1:${port}/1`;

  const { initSentry, flushSentry } = require("../src/middleware/sentry");
  initSentry({ component: "api" });

  const espn = require("../src/adapters/espn");

  // A real request through the real adapter to ESPN's real reads API for a
  // league id that does not exist. ESPN returns 404 and doEspnRequest()'s
  // own non-200 branch raises — the same code path a real outage takes.
  let thrown = null;
  try {
    await espn.buildNormalizedRoster("123456", FAKE_ESPN_S2, FAKE_SWID, 1);
  } catch (error) {
    thrown = error;
  }

  await flushSentry(4000);
  await new Promise((resolve) => sink.close(resolve));

  assert.ok(thrown, "the adapter must have actually failed");
  assert.ok(received.length > 0, "the SDK must have transmitted at least one envelope");

  const wire = received.map((r) => r.body).join("\n");

  // 1. Leak check against the bytes actually sent.
  for (const secret of [FAKE_ESPN_S2, FAKE_SWID, "DEADBEEF-0000-1111-2222-333344445555"]) {
    assert.equal(wire.includes(secret), false, `LEAK: ${secret} appeared on the wire`);
  }
  assert.equal(/espn_s2=\S/.test(wire), false, "LEAK: an espn_s2 assignment appeared on the wire");

  // 2. The report must be usable: provider tagged, stack trace present.
  const envelope = received.find((r) => r.body.includes("\"exception\""));
  assert.ok(envelope, "no envelope carried an exception");
  const parsed = envelope.body
    .split("\n")
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
  const event = parsed.find((item) => item?.exception);

  assert.ok(event, "no parsed event carried an exception");
  assert.equal(event.tags?.provider, "espn", "the event must be tagged with its provider");
  assert.equal(event.tags?.omen_mode, "live", "the event must be tagged live, not demo");
  const frames = event.exception.values?.[0]?.stacktrace?.frames || [];
  assert.ok(frames.length > 0, "the event must carry a usable stack trace");
  assert.ok(
    frames.some((f) => String(f.filename || f.abs_path || "").includes("espn.js")),
    "the stack trace must point back into the ESPN adapter",
  );

  console.log("PASS — real adapter failure captured and transmitted");
  console.log(`  envelopes transmitted : ${received.length}`);
  console.log(`  provider tag          : ${event.tags.provider}`);
  console.log(`  mode tag              : ${event.tags.omen_mode}`);
  console.log(`  operation tag         : ${event.tags.provider_operation}`);
  console.log(`  fingerprint           : ${JSON.stringify(event.fingerprint)}`);
  console.log(`  stack frames          : ${frames.length}`);
  console.log(`  credential leaks      : 0`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("FAIL —", error.message);
  process.exit(1);
});
