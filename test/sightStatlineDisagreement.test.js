"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { disagreement, evaluate, renderMarkdown } = require("../src/services/footballWarehouse/sightStatlineBacktest");

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
