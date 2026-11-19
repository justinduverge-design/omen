"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { forecastHorizons, METHOD_VERSION, projectPlayerWeek } = require("../src/services/footballWarehouse/sightStatline");
const { walkForward } = require("../src/services/footballWarehouse/sightStatlineBacktest");
const { scoreStatLine } = require("../src/services/scoring/statLineScoring");

// Synthetic player and weekly facts, with no real user data.
const row = (week, targets) => ({
  season: 2024, week, stats: { targets, receptions: targets / 2, receiving_yards: targets * 8, receiving_tds: 0.2 },
});
const history = [row(1, 4), row(2, 8), row(3, 10)];
const origin = { season: 2024, week: 3 };

test("four forecasts use the projector and PPR scoring from the same origin", () => {
  const result = forecastHorizons({ position: "WR", history, origin });
  assert.equal(result.method_version, METHOD_VERSION);
  assert.deepEqual(result.horizons.map((entry) => entry.h), [1, 2, 3, 4]);
  for (const entry of result.horizons) {
    const expected = projectPlayerWeek({ position: "WR", history, season: 2024, week: origin.week + entry.h });
    assert.deepEqual(entry.stat_line, expected.stat_line);
    assert.equal(entry.ppr, scoreStatLine(expected.stat_line, "ppr"));
  }
});

test("facts after the origin do not affect any horizon, even across seasons", () => {
  const baseline = forecastHorizons({ position: "WR", history, origin });
  const future = [...history, row(4, 1000), { ...row(1, 2000), season: 2025 }];
  assert.deepEqual(forecastHorizons({ position: "WR", history: future, origin }), baseline);
  assert.notDeepEqual(forecastHorizons({ position: "WR", history: [...history, row(3, 1000)], origin }), baseline);
});

test("empty history uses the projector's debut priors; unsupported positions stay unscored", () => {
  const result = forecastHorizons({ position: "RB", history: [], origin });
  assert.equal(result.horizons.length, 4);
  for (const entry of result.horizons) {
    assert.deepEqual(entry.stat_line, projectPlayerWeek({ position: "RB", history: [], season: 2024, week: 3 + entry.h }).stat_line);
    assert.ok(Number.isFinite(entry.ppr));
  }
  assert.ok(forecastHorizons({ position: "K", history: [], origin }).horizons.every((h) => h.stat_line === null && h.ppr === null));
});

test("target weeks advance across the regular-season boundary", () => {
  const end = { season: 2024, week: 18 };
  const result = forecastHorizons({ position: "WR", history, origin: end });
  for (const entry of result.horizons) {
    assert.deepEqual(entry.stat_line, projectPlayerWeek({ position: "WR", history, season: 2025, week: entry.h }).stat_line);
  }
});

test("h = 1 equals walkForward's model with the same facts and priors", async () => {
  const playerWeeks = [...history, row(4, 12)].map(({ season, ...fact }) => ({
    ...fact, player_id: "fixture-wr", position: "WR", team: "AAA",
  }));
  const source = { loadSeason: async () => ({ playerWeeks, games: [] }) };
  const { records } = await walkForward({ source, testSeasons: [2024], warmupSeasons: 0, positions: ["WR"] });
  const record = records.find((entry) => entry.week === 4 && entry.horizon === 1);
  assert.ok(record);
  const forecast = forecastHorizons({ position: "WR", history, origin }).horizons[0];
  assert.deepEqual(forecast.stat_line, record.stat_pred.model);
  assert.equal(forecast.ppr, record.pred.model.ppr);
});
