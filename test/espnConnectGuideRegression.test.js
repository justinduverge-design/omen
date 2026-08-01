"use strict";

// F4 regression coverage: /espn-connect share/copy fallbacks and the ESPN Connect
// extension must never carry a cookie name or value into a share payload, a log
// line, or a network request. Found missing during the 2026-07-31 F4 verification
// pass (Direction/reviews/2026-07-31-f4-espn-public-handoff-verification.md) —
// the page and extension were manually verified safe, but no automated test
// existed to catch a future regression. Follows this repo's static-source-
// assertion convention for frontend/extension code (see appStoreBuildKillSwitch.test.js)
// since there is no component-rendering test harness for the frontend.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

const COOKIE_SHAPED_PATTERN = /espn_s2|swid|espn-s2|espn-swid/i;

test("EspnConnectGuide.jsx share/mailto/sms payloads never reference a cookie-shaped value", () => {
  const src = read("frontend", "src", "pages", "EspnConnectGuide.jsx");

  // The only string literals shared/copied/texted/emailed are GUIDE_URL and
  // SHARE_TEXT — assert those literals themselves are cookie-free, and that
  // no other identifier feeds the share() function, the mailto href, or the
  // sms href.
  const guideUrlLiteral = src.match(/const GUIDE_URL = '([^']*)'/)?.[1];
  const shareTextLiteral = src.match(/const SHARE_TEXT = '([^']*)'/)?.[1];
  assert.ok(guideUrlLiteral, "GUIDE_URL literal not found");
  assert.ok(shareTextLiteral, "SHARE_TEXT literal not found");
  assert.doesNotMatch(guideUrlLiteral, COOKIE_SHAPED_PATTERN);
  assert.doesNotMatch(shareTextLiteral, COOKIE_SHAPED_PATTERN);

  const shareFn = src.match(/async function share\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.match(shareFn, /GUIDE_URL/, "share() must reference GUIDE_URL");
  assert.doesNotMatch(shareFn, COOKIE_SHAPED_PATTERN, "share() must never reference a cookie-shaped identifier");

  const mailtoHrefLine = src.match(/const href = `mailto:[^\n]*/)?.[0] ?? "";
  assert.match(mailtoHrefLine, /SHARE_TEXT/);
  assert.match(mailtoHrefLine, /GUIDE_URL/);
  assert.doesNotMatch(mailtoHrefLine, COOKIE_SHAPED_PATTERN);

  const smsHrefLine = src.match(/href=\{`sms:[^\n]*/)?.[0] ?? "";
  assert.doesNotMatch(smsHrefLine, COOKIE_SHAPED_PATTERN);
});

test("extension manifest.json keeps host_permissions and content-script scope tight", () => {
  const manifest = JSON.parse(read("extension", "manifest.json"));

  assert.deepEqual(manifest.host_permissions, ["https://*.espn.com/*"]);
  assert.ok(
    !manifest.host_permissions.some((p) => p.includes("<all_urls>") || p === "*://*/*"),
    "host_permissions must not broaden to all sites"
  );

  const matches = manifest.content_scripts?.[0]?.matches || [];
  assert.ok(matches.length > 0, "expected at least one content-script match pattern");
  for (const pattern of matches) {
    assert.match(
      pattern,
      /^https?:\/\/(slopssaloon\.com|localhost:5173)\/account\/connect/,
      `content script match pattern too broad: ${pattern}`
    );
  }
});

test("extension popup.js never transmits cookie values over the network", () => {
  const src = read("extension", "popup.js");

  assert.doesNotMatch(src, /\bfetch\s*\(/, "popup.js must never call fetch()");
  assert.doesNotMatch(src, /XMLHttpRequest/, "popup.js must never use XMLHttpRequest");

  // Cookie values may only flow into chrome.storage.session (in-memory,
  // cleared by content-omen.js after one use) — never chrome.storage.local,
  // which persists across browser restarts.
  assert.match(src, /chrome\.storage\.session\.set/);
  // The source comment explicitly says "never chrome.storage.local" (by design,
  // since local storage persists across restarts) — assert there's no actual
  // *usage* (.set/.get call), not merely that the string never appears at all.
  assert.doesNotMatch(src, /chrome\.storage\.local\s*\.\s*(set|get)/);
});

test("extension popup.js diagnostic logging carries only domain/boolean/count fields, never a raw cookie value", () => {
  const src = read("extension", "popup.js");

  const diagnosticShape = src.match(/diagnostic:\s*\{[\s\S]*?\n\s*\},/)?.[0] ?? "";
  assert.ok(diagnosticShape, "expected a diagnostic object literal in getCookie()");
  assert.match(diagnosticShape, /foundOn/);
  assert.match(diagnosticShape, /agree/);
  assert.match(diagnosticShape, /distinctValueCount/);
  // The diagnostic must reference presence/count only — never the resolved
  // cookie `value` itself.
  assert.doesNotMatch(diagnosticShape, /\bvalue\b/);
});

test("extension content-omen.js never logs the staged payload object directly", () => {
  const src = read("extension", "content-omen.js");

  const logCalls = src.match(/console\.(log|error|warn)\([^)]*\)/g) || [];
  assert.ok(logCalls.length > 0, "expected at least one console call to check");
  for (const call of logCalls) {
    assert.doesNotMatch(
      call,
      /\bpayload\b(?!\.diagnostics)/,
      `console call must not log the raw payload object: ${call}`
    );
  }

  // The one payload-derived value that IS logged must be the diagnostics
  // sub-object (domain/boolean/count shape from popup.js), never espn_s2/swid directly.
  const diagnosticsLogLine = src.match(/console\.log\([^)]*diagnostics[^)]*\)/)?.[0] ?? "";
  assert.ok(diagnosticsLogLine, "expected a diagnostics log line");
  assert.doesNotMatch(diagnosticsLogLine, /payload\.espn_s2|payload\.swid/);
});
