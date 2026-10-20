"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STAT_KEYS,
  projectPlayerWeek,
  scoreStatLine,
  scoreSleeperStatLine,
} = require("../src/services/omenProjections");
const { buildChallengerRow } = require("../src/services/omenProjections/challenger");
const { disagreement, evaluate, renderMarkdown } = require("../src/services/omenProjections/backtest");

const emptyStats = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
function wrGame(week, over = {}, season = 2025) {
  return {
    season,
    week,
    team: "KC",
    stats: { ...emptyStats, targets: 8, receptions: 5, receiving_yards: 70, ...over },
    opp: null,
    implied_points: 24,
  };
}
const games = (weeks, over) => weeks.map((w) => wrGame(w, over));

test("challenger row: shown only for a real gap with real facts behind it, never for low confidence", () => {
  const h = games([1, 2, 3, 4, 5, 6, 7, 8]);
  const omen = projectPlayerWeek({
    position: "WR",
    season: 2025,
    week: 9,
    team: "KC",
    history: h,
    game: { implied_points: 24 },
  });
  const omenPts = scoreStatLine(omen.stat_line, "ppr");
  const providerLine = { rec: 3, rec_yd: 30, rec_td: 0.2, pts_ppr: 99 };
  const base = {
    providerLabel: "Sleeper projection",
    providerStatLine: providerLine,
    omen,
    scoring: "ppr",
    threshold: 4,
    history: h,
  };

  const row = buildChallengerRow({ ...base, providerPoints: scoreSleeperStatLine(providerLine, "ppr") });
  assert.equal(row.role, "challenger");
  assert.equal(row.direction, "omen_higher");
  assert.equal(row.omen_points, Math.round(omenPts * 10) / 10);
  assert.ok(row.facts.length >= 1 && row.facts.length <= 3);
  assert.ok(row.facts.every((f) => f.kind && f.label));
  assert.equal(row.weight, "slight", "no backtest track record: never stronger than slight");
  assert.equal(row.omen_label, "Omen projection");

  assert.equal(
    buildChallengerRow({ ...base, providerPoints: 1, trackRecord: { omen_closer_share: 0.6, n: 400 } }).weight,
    "strong",
  );
  assert.equal(
    buildChallengerRow({ ...base, providerPoints: 1, trackRecord: { omen_closer_share: 0.4, n: 400 } }).weight,
    "slight",
  );

  assert.equal(buildChallengerRow({ ...base, providerPoints: omenPts + 1 }), null);
  const espn = buildChallengerRow({
    ...base,
    providerLabel: "ESPN projection",
    providerStatLine: undefined,
    providerPoints: omenPts - 9,
    history: games([1, 2, 3, 4, 5, 6, 7, 8], { targets: 14 }),
  });
  assert.equal(espn.provider_label, "ESPN projection");
  assert.ok(espn.facts.some((f) => f.kind === "usage" && f.key === "targets"));

  const thin = projectPlayerWeek({ position: "WR", season: 2025, week: 3, team: "KC", history: [wrGame(1)] });
  assert.equal(buildChallengerRow({ ...base, omen: thin, providerPoints: 0 }), null);
  assert.equal(
    buildChallengerRow({
      ...base,
      omen: projectPlayerWeek({ position: "K", season: 2025, week: 3, history: [] }),
      providerPoints: 0,
    }),
    null,
  );
  assert.equal(buildChallengerRow({ ...base, providerPoints: NaN }), null);
});

const mk = (i, omen, provider, actual) => ({
  season: 2024,
  week: 1 + (i % 17),
  player_id: `p${i}`,
  position: "WR",
  band: "high",
  bucket: "established",
  sd_hat_ppr: null,
  relevance_ppr: 8,
  actual: { standard: actual, half_ppr: actual, ppr: actual },
  pred: {
    model: { standard: omen, half_ppr: omen, ppr: omen },
    sleeper: { standard: provider, half_ppr: provider, ppr: provider },
  },
});
function disagreementRows() {
  const rows = [];
  for (let i = 0; i < 40; i += 1) rows.push(mk(i, 20, 10, 19)); // Omen far from the provider, Omen right
  for (let i = 40; i < 80; i += 1) rows.push(mk(i, 10, 10.5, 10 + (i % 2 ? 2 : -2))); // close, both off
  return rows;
}

test("disagreement report says who was closer where Omen and the provider differ most", () => {
  const d = disagreement(disagreementRows(), "ppr");
  assert.equal(d.paired_n, 80);
  assert.ok(d.threshold_points > 0 && d.threshold_points < 3);
  assert.equal(d.over_threshold.n, 40);
  assert.equal(d.over_threshold.omen_closer_share, 1);
  assert.equal(d.over_threshold_omen_higher.n, 40);
  assert.equal(d.over_threshold_omen_lower.n, 0);
  assert.equal(d.top_decile.n, 8);
  assert.equal(d.top_decile.omen_closer_share, 1);
  assert.equal(d.deciles.length, 10);
  assert.equal(disagreement(disagreementRows().slice(0, 5), "ppr"), null);
  assert.equal(
    disagreement(
      disagreementRows().map((r) => ({ ...r, pred: { model: r.pred.model } })),
      "ppr",
    ),
    null,
  );
});

test("the evaluated report and markdown carry the disagreement tables", () => {
  const results = evaluate(disagreementRows(), { positions: ["WR"] });
  assert.equal(results.all.positions.WR.disagreement.ppr.paired_n, 80);
  const meta = {
    method_version: "omen-proj-v1",
    generated_at: "x",
    test_seasons: [2024],
    warmup_seasons: 1,
    records: 80,
    relevant_universe: "r",
    universe_note: "n",
    leakage_guards: ["g"],
    scoring_check: { n: 0 },
    sleeper: { requested: true, available: true, rows: 80 },
  };
  assert.match(renderMarkdown({ meta, results }), /Omen vs provider disagreement, ppr/);
});
