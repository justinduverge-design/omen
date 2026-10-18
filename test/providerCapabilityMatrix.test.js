"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { render, JSON_PATH, VIEW_PATH, PROVIDERS } = require("../scripts/generate-provider-matrix");
const { evaluateTradeForConnection } = require("../src/services/omenTradeCandidate");

const ROOT = path.join(__dirname, "..");
const matrix = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const STATUSES = Object.keys(matrix.statuses);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Pinned on purpose. Dropping a capability from the matrix must be a deliberate edit here AND in the JSON.
const EXPECTED_CAPABILITIES = [
  "league_settings",
  "league_scoring_rules",
  "user_roster",
  "league_roster_positions",
  "matchup",
  "standings",
  "league_rosters",
  "waiver_pool",
  "waiver_system",
  "transactions",
  "player_projections",
  "injury_status",
  "draft_data",
  "playoff_settings",
  "trade_deadline",
];

test("the capability list is the pinned one, with no extras and none missing", () => {
  assert.deepEqual(matrix.capabilities, EXPECTED_CAPABILITIES);
  assert.equal(new Set(matrix.capabilities).size, matrix.capabilities.length, "duplicate capability in the list");
  const inEntries = [...new Set(matrix.entries.map((entry) => entry.capability))].sort();
  assert.deepEqual(
    inEntries,
    [...EXPECTED_CAPABILITIES].sort(),
    "entries use a capability that is not listed, or a listed one has no entries",
  );
});

test("every provider has exactly one entry for every capability", () => {
  const seen = new Set();
  for (const entry of matrix.entries) {
    const key = `${entry.provider}/${entry.capability}`;
    assert.ok(!seen.has(key), `duplicate entry ${key}`);
    seen.add(key);
    assert.ok(PROVIDERS.includes(entry.provider), `unknown provider in ${key}`);
  }
  for (const provider of PROVIDERS) {
    for (const capability of EXPECTED_CAPABILITIES) {
      assert.ok(seen.has(`${provider}/${capability}`), `missing ${provider}/${capability}`);
    }
  }
  assert.equal(matrix.entries.length, PROVIDERS.length * EXPECTED_CAPABILITIES.length);
});

test("entries are well formed: status, reason, verification and date agree", () => {
  for (const entry of matrix.entries) {
    const key = `${entry.provider}/${entry.capability}`;
    assert.ok(STATUSES.includes(entry.status), `${key}: unknown status ${entry.status}`);
    assert.ok(typeof entry.detail === "string" && entry.detail.length > 0, `${key}: detail required`);
    if (entry.status === "available") {
      assert.equal(entry.reason, null, `${key}: an available entry carries no reason`);
    } else {
      assert.ok(matrix.reason_codes[entry.reason], `${key}: reason ${entry.reason} is not in reason_codes`);
    }
    assert.ok(matrix.verification[entry.verification], `${key}: unknown verification ${entry.verification}`);
    if (entry.last_verified === null) {
      assert.fail(`${key}: last_verified is null; use a date and say how it was verified`);
    }
    assert.match(entry.last_verified, DATE, `${key}: last_verified must be YYYY-MM-DD`);
    assert.ok(entry.last_verified <= matrix.as_of, `${key}: last_verified is after as_of`);
    assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, `${key}: evidence required`);
  }
});

test("every reason code in the vocabulary is used by some entry", () => {
  const used = new Set(matrix.entries.map((entry) => entry.reason).filter(Boolean));
  for (const code of Object.keys(matrix.reason_codes)) {
    assert.ok(used.has(code), `reason code ${code} is defined but no entry uses it; remove it`);
  }
});

test("source still matches each entry's evidence", () => {
  for (const entry of matrix.entries) {
    const key = `${entry.provider}/${entry.capability}`;
    for (const anchor of entry.evidence) {
      const source = read(anchor.file);
      for (const needle of anchor.includes || []) {
        assert.ok(
          source.includes(needle),
          `${key}: ${anchor.file} no longer contains ${JSON.stringify(needle)}. The code moved: re-verify this entry and update the matrix.`,
        );
      }
      for (const needle of anchor.excludes || []) {
        assert.ok(
          !source.includes(needle),
          `${key}: ${anchor.file} now contains ${JSON.stringify(needle)}, so a capability the matrix says is not read has started to be read. Update the matrix.`,
        );
      }
    }
  }
});

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return sourceFiles(full);
    return item.name.endsWith(".js") ? [full] : [];
  });
}

test("provider fields listed as unused are still unread anywhere in src", () => {
  const sources = sourceFiles(path.join(ROOT, "src")).map((file) => [file, fs.readFileSync(file, "utf8")]);
  for (const item of matrix.unused_surface) {
    assert.ok(PROVIDERS.includes(item.provider), `${item.field}: unknown provider`);
    assert.ok(["observed", "documented"].includes(item.kind), `${item.field}: kind must be observed or documented`);
    assert.ok(["high", "medium", "low"].includes(item.value), `${item.field}: value must be high, medium or low`);
    assert.ok(Array.isArray(item.tokens) && item.tokens.length > 0, `${item.field}: tokens required`);
    for (const token of item.tokens) {
      const hit = sources.find(([, text]) => text.includes(token));
      assert.ok(
        !hit,
        `${item.provider}/${token} is read in ${hit && path.relative(ROOT, hit[0])}. Move it from unused_surface into entries and update the matrix.`,
      );
    }
    if (item.kind === "observed") {
      const doc = item.evidence.split(" ")[0];
      assert.ok(fs.existsSync(path.join(ROOT, doc)), `${item.field}: observed evidence file ${doc} is missing`);
    }
  }
});

test("runtime reason codes equal what the trade candidate path can return", () => {
  const source = read("src/services/omenTradeCandidate.js");
  const block = source.match(/UNAVAILABLE_COPY = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(block, "UNAVAILABLE_COPY block not found; update this test");
  const inCode = [...block[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual([...matrix.runtime_reasons].sort(), inCode);
});

test("every provider the trade candidate path reads is in the matrix", () => {
  const source = read("src/services/omenTradeCandidate.js");
  const readers = source.match(/const READERS = Object\.freeze\(\{([^}]*)\}\)/);
  assert.ok(readers, "READERS not found; update this test");
  const inCode = [...readers[1].matchAll(/([a-z]+):/g)].map((match) => match[1]).sort();
  assert.deepEqual(inCode, [...PROVIDERS].sort());
});

test("the markdown view is current", () => {
  assert.equal(fs.readFileSync(VIEW_PATH, "utf8"), render(matrix));
});

test("behavior: a Yahoo roster with no derived projection cannot weigh a trade", async () => {
  const yahooEntry = matrix.entries.find(
    (entry) => entry.provider === "yahoo" && entry.capability === "player_projections",
  );
  assert.equal(yahooEntry.status, "degraded");
  assert.equal(yahooEntry.reason, "derived_projection");
  const player = (id) => ({ player_id: id, name: `P${id}`, position: "RB", projected_points: null });
  const result = await evaluateTradeForConnection({
    connection: { platform: "yahoo", league_id: "nfl.l.1" },
    roster: { week: 6, slots: { starters: [player("1")], bench: [player("2")] } },
    platformLabel: "Yahoo",
    deps: { yahooAuth: { accessToken: "test" } },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "projections_unavailable");
  assert.ok(matrix.runtime_reasons.includes(result.reason));
  assert.equal(result.candidate, null);
});

test("behavior: a missing Yahoo or ESPN credential reads as reauth_required, not a guess", async () => {
  const player = (id) => ({ player_id: id, name: `P${id}`, position: "RB", projected_points: 10 });
  const roster = { week: 6, slots: { starters: [player("1")], bench: [player("2")] } };
  for (const platform of ["yahoo", "espn"]) {
    const result = await evaluateTradeForConnection({
      connection: { platform, league_id: "1" },
      roster,
      platformLabel: platform,
      deps: { adapters: { yahoo: {}, espn: {}, sleeper: {} } },
    });
    assert.equal(result.status, "unavailable", platform);
    assert.equal(result.reason, "reauth_required", platform);
  }
});
