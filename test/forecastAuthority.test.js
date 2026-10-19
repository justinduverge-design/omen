"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveForecastAuthority } = require("../src/services/forecastAuthority");

const now = new Date("2026-10-16T12:00:00Z");
const evaluation = (week, n, omenMae, providerMae, finishedAt = "2026-10-15T12:00:00Z", season = 2026) => ({
  season, week, finished_at: finishedAt,
  summary: { positions: { WR: { provider: { n, mae: providerMae, sight_mae_same_players: omenMae } } } },
});

test("Omen leads only on enough current same-player evidence", () => {
  const receipt = resolveForecastAuthority({ position: "WR", modelVersion: "v2", now, evaluations: [
    evaluation(4, 30, 4.1, 4.8), evaluation(5, 35, 4.3, 4.7),
  ] });
  assert.equal(receipt.state, "omen_leads");
  assert.equal(receipt.sample_size, 65);
  assert.equal(receipt.omen_mae, 4.21);
  assert.equal(receipt.provider_mae, 4.75);
  assert.deepEqual(
    [receipt.season_start, receipt.season_end, receipt.week_start, receipt.week_end],
    [2026, 2026, 4, 5]
  );
});

test("provider can earn the lead", () => {
  const receipt = resolveForecastAuthority({ position: "WR", modelVersion: "v2", now, evaluations: [
    evaluation(4, 30, 5.1, 4.2), evaluation(5, 30, 4.9, 4.3),
  ] });
  assert.equal(receipt.state, "provider_leads");
});

test("close, low-sample, stale, and legacy comparisons remain unresolved", () => {
  assert.equal(resolveForecastAuthority({ position: "WR", now, evaluations: [evaluation(4, 30, 4.1, 4.2), evaluation(5, 30, 4.2, 4.2)] }).state, "unresolved_tie");
  assert.equal(resolveForecastAuthority({ position: "WR", now, evaluations: [evaluation(5, 49, 4.0, 5.0)] }).state, "unresolved_low_sample");
  assert.equal(resolveForecastAuthority({ position: "WR", now, evaluations: [evaluation(4, 30, 4.0, 5.0, "2026-08-01T00:00:00Z"), evaluation(5, 30, 4.0, 5.0, "2026-08-08T00:00:00Z")] }).state, "unresolved_stale");
  assert.equal(resolveForecastAuthority({ position: "WR", now, evaluations: [{ week: 5, summary: { positions: { WR: { provider: { n: 100, mae: 4.0 } } } } }] }).state, "unresolved_low_sample");
});
