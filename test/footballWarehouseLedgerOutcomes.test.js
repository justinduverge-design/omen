"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const cron = require("../src/omen_tuesday_cron");
const { createWarehouseOutcomeRepository } = require("../src/services/footballWarehouse/outcomeRepository");
const { providerRefFromDecision } = require("../src/services/footballWarehouse/ledgerOutcomes");

const TUESDAY = new Date("2026-10-06T11:00:00.000Z"); // NFL week 5 begins; week 4 is finished.

function legacyDecision(id, playerKey, over = {}) {
  return {
    id,
    season: 2026,
    week: 4,
    call_type: "legacy",
    headline: "Start him",
    internal_score: 68,
    scoring_format: "ppr",
    scoring_contract_version: null,
    scoring_contract_hash: null,
    scoring_coverage_state: null,
    recommendation: { primary_player: { id: playerKey, name: "Some Name" } },
    ...over,
  };
}

/** A fake warehouse query keyed by what the repository sends; it never sees a player name. */
function fakeQuery({ ingestedWeeks = [4], crosswalk = {}, lines = {}, fail = false, log = [] } = {}) {
  return async (request) => {
    log.push(request);
    if (fail) throw new Error("warehouse down");
    if (request.name === "warehouse-week-ingested-v1") {
      return { rows: [{ ingested: ingestedWeeks.includes(request.values[1]) }] };
    }
    const [providers, ids] = request.values;
    return {
      rows: providers.map((provider, i) => {
        const key = `${provider}:${ids[i]}`;
        const playerId = crosswalk[key] ?? null;
        const line = playerId ? lines[playerId] : null;
        return {
          provider,
          provider_id: ids[i],
          player_id: playerId,
          fact_player_id: line ? playerId : null,
          fantasy_points_ppr: line ? String(line.ppr) : null,
          receptions: line ? String(line.receptions) : null,
        };
      }),
    };
  };
}

function harness(entries, query, extra = {}) {
  const saved = [];
  const dependencies = {
    fetchScorableDecisions: async () => entries,
    saveDecisionOutcome: async (_db, { decision, outcome }) => { saved.push({ id: decision.id, outcome }); return "inserted"; },
    warehouseOutcomeRepository: createWarehouseOutcomeRepository({ query }),
    ...extra,
  };
  return { saved, dependencies };
}

const entry = (decision) => ({ decision, outcome: null, action: null });
const CROSSWALK = { "sleeper:111": "omen:player:a", "sleeper:222": "omen:player:b" };
const LINES = {
  "omen:player:a": { ppr: 22.4, receptions: 6 },
  "omen:player:b": { ppr: 3.2, receptions: 1 },
};

test("a graded win from the warehouse is an estimate, never verified", async () => {
  const { saved, dependencies } = harness([entry(legacyDecision("d1", "sleeper:111"))], fakeQuery({ crosswalk: CROSSWALK, lines: LINES }));
  const fetchScores = async () => { throw new Error("GitHub CSV must not be used"); };
  const tally = await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores, dependencies });

  assert.equal(tally.inserted, 1);
  assert.equal(saved[0].outcome.state, "resolved");
  assert.equal(saved[0].outcome.result, "win");
  assert.equal(saved[0].outcome.provenance, "legacy_estimate");
  assert.match(saved[0].outcome.summary, /22\.4/);
});

test("a graded loss from the warehouse", async () => {
  const { saved, dependencies } = harness([entry(legacyDecision("d2", "sleeper:222"))], fakeQuery({ crosswalk: CROSSWALK, lines: LINES }));
  await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores: async () => ({}), dependencies });
  assert.equal(saved[0].outcome.state, "resolved");
  assert.equal(saved[0].outcome.result, "loss");
  assert.equal(saved[0].outcome.provenance, "legacy_estimate");
});

test("Half PPR and Standard totals are derived from the PPR line and receptions", async () => {
  const half = cron.gradeDecisionFromWarehouse(
    { decision: legacyDecision("d", "sleeper:111", { scoring_format: "half_ppr" }), action: null },
    { kind: "points", ppr: 20, receptions: 6 },
  );
  assert.match(half.summary, /17\.0 fantasy points \(Half PPR\)/);
  const std = cron.gradeDecisionFromWarehouse(
    { decision: legacyDecision("d", "sleeper:111", { scoring_format: "standard" }), action: null },
    { kind: "points", ppr: 20, receptions: 6 },
  );
  assert.match(std.summary, /14\.0 fantasy points \(Standard\)/);
  const unknown = cron.gradeDecisionFromWarehouse(
    { decision: legacyDecision("d", "sleeper:111", { scoring_format: "standard" }), action: null },
    { kind: "points", ppr: 20, receptions: null },
  );
  assert.equal(unknown.state, "data_incomplete");
});

test("an unresolved provider id is data_incomplete, never a guess by name", async () => {
  const log = [];
  const entries = [
    entry(legacyDecision("d3", "sleeper:999")),
    entry(legacyDecision("d4", "omen:player:xyz")), // not a provider key: unresolvable
    entry(legacyDecision("d5", null, { recommendation: { primary_player: { name: "Josh Allen" } } })),
  ];
  const { saved, dependencies } = harness(entries, fakeQuery({ crosswalk: CROSSWALK, lines: LINES, log }));
  await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores: async () => ({}), dependencies });

  assert.deepEqual(saved.map((row) => row.outcome.state), ["data_incomplete", "data_incomplete", "data_incomplete"]);
  assert.ok(saved.every((row) => row.outcome.result === undefined));
  assert.ok(!JSON.stringify(log).includes("Josh Allen"), "names never reach the warehouse");
});

test("a resolved player with no line that week is data_incomplete", async () => {
  const { saved, dependencies } = harness([entry(legacyDecision("d6", "sleeper:111"))], fakeQuery({ crosswalk: CROSSWALK, lines: {} }));
  await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores: async () => ({}), dependencies });
  assert.equal(saved[0].outcome.state, "data_incomplete");
});

test("a contract-required call stays data_incomplete: warehouse totals cannot prove league scoring", async () => {
  const live = legacyDecision("d7", "sleeper:111", { call_type: "start_sit", scoring_contract_version: "v1", scoring_contract_hash: "abc" });
  const { saved, dependencies } = harness([entry(live)], fakeQuery({ crosswalk: CROSSWALK, lines: LINES }));
  await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores: async () => ({}), dependencies });
  assert.equal(saved[0].outcome.state, "data_incomplete");
  assert.notEqual(saved[0].outcome.provenance, "verified");
});

test("a week the warehouse has not ingested stays Pending: nothing is written", async () => {
  const { saved, dependencies } = harness([entry(legacyDecision("d8", "sleeper:111"))], fakeQuery({ ingestedWeeks: [], crosswalk: CROSSWALK, lines: LINES }));
  const tally = await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores: async () => ({}), dependencies });
  assert.deepEqual(saved, []);
  assert.deepEqual(tally, { inserted: 0, updated: 0, unchanged: 0, deferred: 1, failed: 0 });
});

test("a warehouse outage falls back to the existing nflverse path unchanged", async () => {
  const { saved, dependencies } = harness(
    [entry(legacyDecision("d9", "sleeper:111", { recommendation: { primary_player: { id: "sleeper:111", name: "Bench Breakout" } } }))],
    fakeQuery({ fail: true }),
  );
  let fetched = 0;
  const fetchScores = async () => { fetched += 1; return { bench_breakout: { name: "Bench Breakout", rec_std: 12, rec_half: 14, rec_ppr: 16 } }; };
  const tally = await cron.scoreLedgerDecisions({}, { now: TUESDAY, fetchScores, dependencies });
  assert.equal(fetched, 1);
  assert.equal(tally.inserted, 1);
  assert.equal(saved[0].outcome.result, "win");
});

test("supabase mode never opens the warehouse", async () => {
  const entries = [entry(legacyDecision("d10", "sleeper:111", { recommendation: { primary_player: { id: "sleeper:111", name: "Bench Breakout" } } }))];
  const saved = [];
  let fetched = 0;
  await cron.scoreLedgerDecisions({}, {
    now: TUESDAY,
    env: { FOOTBALL_DATA_MODE: "supabase" },
    fetchScores: async () => { fetched += 1; return { bench_breakout: { name: "Bench Breakout", rec_std: 12, rec_half: 14, rec_ppr: 16 } }; },
    dependencies: {
      fetchScorableDecisions: async () => entries,
      saveDecisionOutcome: async (_db, { decision }) => { saved.push(decision.id); return "inserted"; },
    },
  });
  assert.equal(fetched, 1);
  assert.deepEqual(saved, ["d10"]);
});

test("the dry-run preview computes outcomes for a week and writes nothing", async () => {
  const entries = [
    entry(legacyDecision("p1", "sleeper:111")),
    entry(legacyDecision("p2", "sleeper:222")),
    entry(legacyDecision("p3", "sleeper:999")),
    { decision: legacyDecision("p4", "sleeper:111"), outcome: null, action: { followed: false } },
    entry(legacyDecision("p5", "sleeper:111", { week: 3 })), // other week: excluded
  ];
  let writes = 0;
  const repository = createWarehouseOutcomeRepository({ query: fakeQuery({ crosswalk: CROSSWALK, lines: LINES }) });
  const report = await cron.previewLedgerOutcomes({}, {
    season: 2026,
    week: 4,
    repository,
    dependencies: {
      fetchScorableDecisions: async () => entries,
      saveDecisionOutcome: async () => { writes += 1; },
    },
  });
  assert.equal(writes, 0);
  assert.equal(report.written, 0);
  assert.deepEqual(report.counts, { calls: 4, graded: 2, data_incomplete: 1, not_executed: 1, pending: 0 });
  assert.deepEqual(report.preview.map((row) => row.state), ["resolved", "resolved", "data_incomplete", "not_executed"]);

  const early = createWarehouseOutcomeRepository({ query: fakeQuery({ ingestedWeeks: [] }) });
  const pending = await cron.previewLedgerOutcomes({}, {
    season: 2026, week: 4, repository: early,
    dependencies: { fetchScorableDecisions: async () => [entry(legacyDecision("p6", "sleeper:111"))] },
  });
  assert.equal(pending.counts.pending, 1);
  assert.equal(pending.preview[0].state, "pending");
});

test("provider refs come only from a provider-prefixed player id", () => {
  assert.deepEqual(providerRefFromDecision(legacyDecision("x", "yahoo:31002")), { provider: "yahoo", providerId: "31002" });
  assert.equal(providerRefFromDecision(legacyDecision("x", "omen:player:abc")), null);
  assert.equal(providerRefFromDecision({ recommendation: { primary_player: { name: "Josh Allen" } } }), null);
});

test("the outcome repository batches 200 ids per query and rejects non-public ids", async () => {
  const log = [];
  const repository = createWarehouseOutcomeRepository({ query: fakeQuery({ log }) });
  const refs = Array.from({ length: 450 }, (_, i) => ({ provider: "sleeper", providerId: String(i) }));
  const out = await repository.readWeekOutcomes({ refs, season: 2026, week: 4 });
  assert.equal(out.size, 450);
  assert.deepEqual(log.map((q) => q.values[0].length), [200, 200, 50]);
  await assert.rejects(() => repository.readWeekOutcomes({ refs: [{ provider: "sleeper", providerId: "a b; drop" }], season: 2026, week: 4 }), TypeError);
});
