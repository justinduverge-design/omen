"use strict";

// `src/config` validates required env at boot and calls process.exit(1) when
// any is missing, so these must be set before it is ever required.
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

/**
 * P1-DraftAssistantSideline — Draft Assistant is cut from 1.0 and sidelined to
 * the 2027 season (founder decision 2026-08-11; facts-of-record #9).
 *
 * Most of these are deliberately *source-absence* assertions, which looks like
 * the opposite of the lesson recorded in the P1-ConnectContinueRoute handoff
 * ("when a frontend fix is a decision, move the decision into lib/ and test it
 * for real"). That lesson holds for decisions. Most of this item is not a
 * decision — it is a removal, and the property under test is that a string and
 * a route are *not reachable anywhere*. A grep is the right instrument for
 * proving absence; a behavioral test can only prove absence at the one call
 * site it exercises.
 *
 * The two parts that ARE decisions are tested for real, not by grep:
 *   - the `DRAFT_ASSISTANT_ENABLED` flag must fail closed — covered below.
 *   - `/api/dashboard/summary` must no longer advertise the tool — covered in
 *     `test/dashboardSummary.test.js`, where an actual request is made.
 *
 * The implementation is PRESERVED, not deleted: 2027 ships it on a Slops-built
 * ADP. These tests assert the surface is gone AND that the code is still there.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));

/**
 * Every removal site carries a dated `P1-DraftAssistantSideline` comment naming
 * what was taken out, because the decision log's re-activation path promises
 * those comments are greppable in 2027. Those comments contain the very string
 * these tests assert is gone — so asserting over raw source would force a
 * choice between a passing test and a usable re-activation trail.
 *
 * The property that actually matters is that no *user-facing* claim survives.
 * A comment is not user-facing. So comments are stripped before asserting, and
 * the strings are pinned against what actually renders.
 */
const readRendered = (...parts) =>
  read(...parts)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")   // JSX comment blocks
    .replace(/\/\*[\s\S]*?\*\//g, "")       // block comments
    .replace(/^\s*\/\/.*$/gm, "");          // line comments

test("no navigation entry routes to Draft Assistant", () => {
  const header = readRendered("frontend", "src", "components", "layout", "Header.jsx");

  assert.ok(!/Draft Assistant/.test(header),
    "the primary nav must not list Draft Assistant");
  assert.ok(!/'\/draft'/.test(header),
    "the primary nav must not link to /draft");
  // The rest of the Tools group must survive the removal.
  assert.match(header, /Trade Analyzer/);
  assert.match(header, /Waiver Wire/);
});

test("/draft is not a served route and falls through to not-found", () => {
  const routes = readRendered("frontend", "src", "routes", "index.jsx");

  assert.ok(!/path="\/draft"/.test(routes),
    "/draft must not be a served route");
  assert.ok(!/^import DraftAssistant/m.test(routes),
    "the router must not import the Draft Assistant page");
  assert.ok(!/<DraftAssistant\s*\/?>/.test(routes),
    "the router must not render the Draft Assistant page");
  // Absence alone is not enough — an unmatched path has to land somewhere
  // honest, so the catch-all must still be present for /draft to 404 rather
  // than render a blank layout.
  assert.match(routes, /path="\*"/,
    "a catch-all route must still exist so /draft returns not-found");
});

test("/draft is no longer an allowlisted post-login destination", () => {
  // Found while sweeping: `sanitize()` in nextUrl.js allowlisted '/draft', so a
  // stored or crafted `?next=/draft` still passed validation and would land a
  // freshly signed-in user on a 404. The allowlist is a set of places it is
  // safe to send someone, and a removed route is not one of them.
  const nextUrl = readRendered("frontend", "src", "lib", "nextUrl.js");

  assert.ok(!/'\/draft'/.test(nextUrl),
    "/draft must not be an allowlisted redirect destination");
  assert.match(nextUrl, /'\/football'/, "the real destinations must survive");
  assert.match(nextUrl, /'\/trade'/);
});

test("the Football page has no Draft Assistant tab", () => {
  const football = readRendered("frontend", "src", "pages", "Football.jsx");

  assert.ok(!/Draft Assistant/.test(football),
    "the Football tab bar must not offer Draft Assistant");
  assert.ok(!/import DraftAssistant/.test(football),
    "Football must not import the Draft Assistant page");
  assert.ok(!/case 'draft'/.test(football),
    "the tab switch must not have a draft branch");
  assert.match(football, /id: 'trade'/, "the remaining tabs must be intact");
  assert.match(football, /id: 'omen'/);
  assert.match(football, /id: 'history'/);
});

test("the help drawer does not describe or link Draft Assistant", () => {
  const help = readRendered("frontend", "src", "components", "help", "HelpButton.jsx");

  assert.ok(!/Draft Assistant/.test(help),
    "contextual help must not describe a feature that is not in 1.0");
  assert.ok(!/'\/draft'/.test(help),
    "contextual help must not key or link a /draft entry");
});

test("marketing copy makes no Draft Assistant claim", () => {
  const landing = readRendered("frontend", "src", "pages", "Landing.jsx");
  const omenLanding = readRendered("frontend", "src", "pages", "OmenLanding.jsx");

  assert.ok(!/Draft Assistant/.test(landing),
    "the landing page must not advertise Draft Assistant");
  assert.ok(!/href="\/draft"/.test(landing),
    "the landing page must not link to /draft");
  assert.ok(!/Draft Assistant/.test(omenLanding),
    "the about page feature list must not advertise Draft Assistant");
});

test("legal copy does not describe a feature that does not ship", () => {
  const privacy = readRendered("frontend", "src", "pages", "Privacy.jsx");
  const terms = readRendered("frontend", "src", "pages", "Terms.jsx");

  assert.ok(!/draft tools/i.test(privacy),
    "Privacy must not claim draft tools among the purposes of processing");
  assert.ok(!/draft tools/i.test(terms),
    "Terms must not list draft tools among what Omen provides");
});

test("the backend mounts /api/draft-assistant only behind the flag", () => {
  const server = read("src", "server.js");

  // The item sanctions "a disabled flag" as the preservation mechanism, so the
  // mount string is expected to still be present. What must NOT be true is
  // that it is reached unconditionally, so the property under test is the
  // guard, not the absence of the string.
  assert.match(server, /if \(config\.draftAssistant\.enabled\) \{[\s\S]*?app\.use\("\/api\/draft-assistant"/,
    "the /api/draft-assistant mount must sit inside the DRAFT_ASSISTANT_ENABLED guard");
});

test("the Draft Assistant flag fails closed", (t) => {
  // This is the one genuinely behavioral piece of the removal — a decision,
  // so it is tested for real rather than by grep. Default-off is the whole
  // safety property: an unset variable in production must not ship the
  // feature, and neither must a typo, a blank string, or a truthy-looking
  // value that is not exactly "true".
  const configPath = require.resolve("../src/config");
  const original = process.env.DRAFT_ASSISTANT_ENABLED;
  t.after(() => {
    if (original === undefined) delete process.env.DRAFT_ASSISTANT_ENABLED;
    else process.env.DRAFT_ASSISTANT_ENABLED = original;
    delete require.cache[configPath];
  });

  const loadWith = (value) => {
    if (value === undefined) delete process.env.DRAFT_ASSISTANT_ENABLED;
    else process.env.DRAFT_ASSISTANT_ENABLED = value;
    delete require.cache[configPath];
    return require("../src/config").draftAssistant.enabled;
  };

  assert.equal(loadWith(undefined), false, "unset must mean disabled");
  assert.equal(loadWith(""), false, "empty must mean disabled");
  assert.equal(loadWith("false"), false);
  assert.equal(loadWith("1"), false, "only the exact string \"true\" enables it");
  assert.equal(loadWith("yes"), false);
  assert.equal(loadWith("TRUE"), true, "case and surrounding space are tolerated");
  assert.equal(loadWith("  true  "), true);
  assert.equal(loadWith("true"), true);
});

test("the implementation is preserved for 2027, not deleted", () => {
  // facts-of-record #9: removal is from the reachable surface only. The 2027
  // plan ships this on a Slops-built ADP, and these files are that head start.
  // If a later cleanup pass deletes them, this test is the tripwire.
  assert.ok(exists("src", "services", "adp.js"),
    "adp.js is the 2027 starting point and must not be deleted");
  assert.ok(exists("src", "services", "sleeperDraft.js"),
    "the Sleeper draft service must not be deleted");
  assert.ok(exists("src", "services", "sleeperDraftAccess.js"),
    "the Sleeper draft access service must not be deleted");
  assert.ok(exists("src", "routes", "draftAssistant.js"),
    "the Draft Assistant router must be preserved, only unmounted");
  assert.ok(exists("frontend", "src", "pages", "DraftAssistant.jsx"),
    "the Draft Assistant page must be preserved, only unrouted");
});

test("the preserved code records where it went and how it comes back", () => {
  const decisions = read("Direction", "decision_log.md");

  // The 2026-08-11 entry records the *decision* to sideline, and matching only
  // on that would pass before any work was done — it did, on the first run of
  // this test. The `Done when:` asks for something the decision entry cannot
  // contain: the location of the preserved implementation and the exact steps
  // to turn it back on. That is an execution record, so it is what is pinned.
  assert.match(decisions, /Draft Assistant re-activation path \(2027\)/,
    "the decision log must carry a named re-activation path, not just the decision to sideline");
  assert.match(decisions, /src\/routes\/draftAssistant\.js/,
    "the re-activation path must name where the preserved implementation lives");
  assert.match(decisions, /DRAFT_ASSISTANT_ENABLED/,
    "the re-activation path must name the flag that turns the backend surface back on");
});
