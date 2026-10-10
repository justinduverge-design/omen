"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

/**
 * The evidence taxonomy is closed in code (src/services/evidenceVocabulary.js) because the
 * contract schemas cannot carry it as an enum without a breaking change. This test is the lock:
 * the real builders, the literal strings in their source, and every recorded fixture must stay
 * inside the vocabulary. Adding a value means editing evidenceVocabulary.js on purpose.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { START_SIT, WAIVER, MOVE_DETAIL } = require("../src/services/evidenceVocabulary");
const { buildEvidence } = require("../src/services/startSitDetail");
const { breakdownEvidence } = require("../src/services/projectionBreakdown");
const { fantasyMetricsEvidence, gameEnvironmentEvidence } = require("../src/services/fantasyMetrics/fantasyMetricsLines");
const { evidenceFor } = require("../src/services/waiverAnalysis");
const moves = require("../src/routes/moves");

function assertInside(rows, vocab, label) {
  assert.ok(rows.length > 0, `${label}: produced no rows`);
  for (const row of rows) {
    assert.ok(vocab.categories.includes(row.category), `${label}: category "${row.category}" is not in the vocabulary`);
    assert.ok(vocab.kinds.includes(row.kind), `${label}: kind "${row.kind}" is not in the vocabulary`);
  }
}

function literals(fn) {
  const source = fn.toString();
  const found = { categories: new Set(), kinds: new Set() };
  for (const m of source.matchAll(/\bcategory:\s*"([^"]+)"/g)) found.categories.add(m[1]);
  for (const m of source.matchAll(/\bkind:\s*"([^"]+)"/g)) found.kinds.add(m[1]);
  return found;
}

function assertLiteralsInside(fns, vocab, label) {
  for (const fn of fns) {
    const { categories, kinds } = literals(fn);
    for (const c of categories) assert.ok(vocab.categories.includes(c), `${label} ${fn.name}: literal category "${c}" is unlisted`);
    for (const k of kinds) assert.ok(vocab.kinds.includes(k), `${label} ${fn.name}: literal kind "${k}" is unlisted`);
  }
}

const AVAILABLE_BREAKDOWN = {
  status: "available",
  provider: "sleeper",
  provider_points: 15.7,
  other_points: 0,
  lines: [{ stat: "rec", label: "receptions", quantity: 6, points_per: 1, points: 6 }],
};
const UNAVAILABLE = { status: "unavailable", provider: "yahoo", reason_code: "no_stat_line", reason: "Yahoo does not give Omen a projected stat line." };

function player(key, name, status = null) {
  return { player_key: key, name, position: "WR", team: key === "a" ? "SEA" : "DEN", projected_points: 12, status };
}
const USAGE = { games: 3, targets_per_game: 7, target_share: 0.25, snap_share: 0.8, carries_per_game: 0, attempts_per_game: 0 };

test("start-sit evidence: every row from the real builder is in the vocabulary", () => {
  const start = player("a", "Alpha", "Q");
  const sit = player("b", "Beta", "OUT");
  const full = buildEvidence({
    start, sit, delta: 3, scoringFormat: "1 point per reception",
    usage: new Map([["a", USAGE], ["b", USAGE]]),
    teamSystem: new Map([["SEA", "Seattle runs a pass-heavy offense."], ["DEN", "Denver runs the ball."]]),
    breakdowns: new Map([["a", AVAILABLE_BREAKDOWN], ["b", UNAVAILABLE]]),
  });
  assertInside(full, START_SIT, "full start-sit");

  // Every category the builder can emit is exercised, so a new branch cannot hide.
  const seen = new Set(full.map((r) => r.category));
  const bare = buildEvidence({ start: player("a", "Alpha"), sit: player("b", "Beta"), delta: 0.5, scoringFormat: null });
  for (const r of bare) seen.add(r.category);
  assertInside(bare, START_SIT, "bare start-sit");

  // Omen's own stats (beta slice): a minimal season bundle emits omen_metric and game_environment.
  const line = { receiving_receptions: 5, receiving_yards: 60 };
  const rollups = [1, 2, 3].map((week) => ({
    player: "G1", week, team: "SEA", targets: 6, carries: 0, expected: line, actual: line, fallbackPlays: 0,
    opportunity: { rz_targets: 1, i10_targets: 0, ez_targets: 0, deep_targets: 0, rz_carries: 0, i10_carries: 0, gl_carries: 0 },
  }));
  const bundle = {
    byPlayer: new Map([["G1", rollups]]), byTeam: new Map([["SEA", rollups]]), teamWeeks: new Map([["SEA", [1, 2, 3]]]),
    positions: new Map([["G1", "WR"]]), names: new Map(), games: [{ week: 4, home: "SEA", away: "DEN", spread: 3, total: 44 }],
  };
  const metrics = buildEvidence({
    start: player("a", "Alpha"), sit: player("b", "Beta"), delta: 3, scoringFormat: null,
    fantasyMetrics: { bundle, gsisByKey: new Map([["a", "G1"]]), week: 4 },
  });
  for (const r of metrics) seen.add(r.category);
  assertInside(metrics, START_SIT, "start-sit with fantasy metrics");
  assert.deepEqual([...seen].sort(), [...START_SIT.categories].sort(), "vocabulary lists a category the builder never emits, or the test misses a branch");
});

test("projection breakdown rows are in the start-sit vocabulary", () => {
  const rows = breakdownEvidence([
    { name: "Alpha", breakdown: AVAILABLE_BREAKDOWN },
    { name: "Beta", breakdown: UNAVAILABLE },
    { name: "Gamma", breakdown: UNAVAILABLE },
  ]);
  assertInside(rows, START_SIT, "breakdownEvidence");
});

test("waiver evidence rows are in the waiver vocabulary", () => {
  const best = { solves_out_starter: false, improvement: 4, displaced: { name: "D" }, player: { name: "P" } };
  assertInside(evidenceFor(best, "PPR"), WAIVER, "waiver with scoring");
  assertInside(evidenceFor({ ...best, solves_out_starter: true }, null), WAIVER, "waiver out starter");
});

test("move-detail code-built evidence is in the vocabulary", () => {
  const legacy = moves.evidenceAtTheTime({ scoring: "ppr", target_player: "X", confidence: 0.8, reasoning: "because" });
  assertInside(legacy, MOVE_DETAIL, "legacy builder");
  const noScoring = moves.evidenceAtTheTime({ target_player: "X" });
  assertInside(noScoring, MOVE_DETAIL, "legacy builder, no scoring");

  // The decision builder's category/kind come from the DB (family / evidence_kind) and are open;
  // only the code-side fallback is closed.
  for (const kind of ["limitation", "verified", "projection", "model", "inference", "anything_else"]) {
    assert.ok(MOVE_DETAIL.categories.includes(moves.evidenceCategory(kind)), `evidenceCategory(${kind})`);
  }
});

test("literal category/kind strings in the evidence builders' source are all listed", () => {
  assertLiteralsInside([buildEvidence, breakdownEvidence, fantasyMetricsEvidence, gameEnvironmentEvidence], START_SIT, "start-sit");
  assertLiteralsInside([evidenceFor], WAIVER, "waiver");
  assertLiteralsInside([moves.evidenceAtTheTime, moves.decisionEvidence], MOVE_DETAIL, "move-detail");
});

test("every evidence row in a recorded fixture is in its contract's vocabulary", () => {
  const root = path.join(__dirname, "contracts", "fixtures");
  const vocabByContract = {
    "start-sit-detail.v1": [START_SIT, ["evidence"]],
    "start-sit-detail.v2": [START_SIT, ["evidence"]],
    "waiver-analysis.v1": [WAIVER, ["evidence"]],
    "move-detail.v1": [MOVE_DETAIL, []], // DB-derived rows are open; checked below for what is recorded
  };
  let checked = 0;
  for (const [contract, [vocab, keys]] of Object.entries(vocabByContract)) {
    const dir = path.join(root, contract);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      const body = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      const walk = (node, key) => {
        if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
        if (!node || typeof node !== "object") return;
        const isRow = "category" in node && "kind" in node && "statement" in node;
        const inScope = contract === "move-detail.v1" ? key === "evidence_at_the_time" : keys.includes(key);
        if (isRow && inScope) {
          checked += 1;
          assert.ok(vocab.categories.includes(node.category), `${contract}/${file}: category "${node.category}" unlisted`);
          assert.ok(vocab.kinds.includes(node.kind), `${contract}/${file}: kind "${node.kind}" unlisted`);
        }
        for (const [k, v] of Object.entries(node)) walk(v, k === "evidence" || k === "evidence_at_the_time" ? k : key);
      };
      walk(body, null);
    }
  }
  assert.ok(checked > 0, "no evidence rows found in fixtures; the scan is broken");
});

test("signal-vs-noise rows from the real builder, and the signalNoise kinds, are in the vocabulary", () => {
  const { KIND } = require("../src/services/signalNoise");
  for (const k of Object.values(KIND)) assert.ok(START_SIT.kinds.includes(k), `signalNoise kind ${k}`);
  const rows = [1, 2, 3, 4].map((week) => ({ week, snap_share: 0.8, targets: 6, carries: 0 }));
  const start = player("a", "Alpha");
  const sit = player("b", "Beta");
  const evidence = buildEvidence({
    start, sit, delta: 3, scoringFormat: "1 point per reception", signal: true,
    weeklyUsage: new Map([["a", rows], ["b", rows]]),
  });
  assert.ok(evidence.some((r) => r.category === "recent_usage" && r.kind === "observed_context"));
  assert.ok(evidence.some((r) => /projection gap/.test(r.statement)));
  assertInside(evidence, START_SIT, "start-sit with signal rows");
});
