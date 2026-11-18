"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  resolveForecastAuthority,
  resolveStatlineForecastAuthority,
  STATS_BY_POSITION,
} = require("../src/services/forecastAuthority");

const now = new Date("2026-10-16T12:00:00Z");
const evaluation = (week, n, omenMae, providerMae, finishedAt = "2026-10-15T12:00:00Z", season = 2026) => ({
  season,
  week,
  finished_at: finishedAt,
  summary: { positions: { WR: { provider: { n, mae: providerMae, sight_mae_same_players: omenMae } } } },
});

test("Omen leads only on enough current same-player evidence", () => {
  const receipt = resolveForecastAuthority({
    position: "WR",
    modelVersion: "v2",
    now,
    evaluations: [evaluation(4, 30, 4.1, 4.8), evaluation(5, 35, 4.3, 4.7)],
  });
  assert.equal(receipt.state, "omen_leads");
  assert.equal(receipt.sample_size, 65);
  assert.equal(receipt.omen_mae, 4.21);
  assert.equal(receipt.provider_mae, 4.75);
  assert.deepEqual(
    [receipt.season_start, receipt.season_end, receipt.week_start, receipt.week_end],
    [2026, 2026, 4, 5],
  );
});

test("provider can earn the lead", () => {
  const receipt = resolveForecastAuthority({
    position: "WR",
    modelVersion: "v2",
    now,
    evaluations: [evaluation(4, 30, 5.1, 4.2), evaluation(5, 30, 4.9, 4.3)],
  });
  assert.equal(receipt.state, "provider_leads");
});

test("close, low-sample, stale, and legacy comparisons remain unresolved", () => {
  assert.equal(
    resolveForecastAuthority({
      position: "WR",
      now,
      evaluations: [evaluation(4, 30, 4.1, 4.2), evaluation(5, 30, 4.2, 4.2)],
    }).state,
    "unresolved_tie",
  );
  assert.equal(
    resolveForecastAuthority({ position: "WR", now, evaluations: [evaluation(5, 49, 4.0, 5.0)] }).state,
    "unresolved_low_sample",
  );
  assert.equal(
    resolveForecastAuthority({
      position: "WR",
      now,
      evaluations: [
        evaluation(4, 30, 4.0, 5.0, "2026-08-01T00:00:00Z"),
        evaluation(5, 30, 4.0, 5.0, "2026-08-08T00:00:00Z"),
      ],
    }).state,
    "unresolved_stale",
  );
  assert.equal(
    resolveForecastAuthority({
      position: "WR",
      now,
      evaluations: [{ week: 5, summary: { positions: { WR: { provider: { n: 100, mae: 4.0 } } } } }],
    }).state,
    "unresolved_low_sample",
  );
});

// --- Per-stat, per-position, per-horizon forecast authority (Sight v3) ---

const statEvaluation = ({
  week,
  position,
  stat,
  horizon,
  n,
  omenMae,
  providerMae,
  finishedAt = "2026-10-15T12:00:00Z",
  season = 2026,
  noProvider = false,
}) => ({
  season,
  week,
  finished_at: finishedAt,
  summary: {
    positions: {
      [position]: {
        stats: {
          [stat]: {
            horizons: {
              [horizon]: {
                n,
                omen: { mae: omenMae, bias: -0.1 },
                last3: { mae: omenMae + 0.2 },
                season_avg: { mae: omenMae + 0.4 },
                provider: noProvider
                  ? { n: 0, reason: "no_stored_provider_projections" }
                  : { n, mae: providerMae, omen_mae_same_players: omenMae },
              },
            },
          },
        },
      },
    },
  },
});

test("stat forecast authority: Omen leads where Omen's error beats provider error", () => {
  const receipt = resolveForecastAuthority({
    position: "WR",
    stat: "targets",
    horizon: 1,
    modelVersion: "v3",
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "WR", stat: "targets", horizon: 1, n: 30, omenMae: 1.1, providerMae: 1.5 }),
      statEvaluation({ week: 5, position: "WR", stat: "targets", horizon: 1, n: 35, omenMae: 1.2, providerMae: 1.6 }),
    ],
  });

  assert.equal(receipt.state, "omen_leads");
  assert.equal(receipt.position, "WR");
  assert.equal(receipt.stat, "targets");
  assert.equal(receipt.horizon, 1);
  assert.equal(receipt.scoring_family, null, "stat rows have no scoring family");
  assert.equal(receipt.model_version, "v3");
  assert.equal(receipt.sample_size, 65);
  assert.equal(receipt.weeks, 2);
  assert.equal(receipt.omen_mae, 1.15);
  assert.equal(receipt.provider_mae, 1.55);
});

test("stat forecast authority: provider earns the lead when provider error is lower", () => {
  const receipt = resolveForecastAuthority({
    position: "QB",
    stat: "passing_yards",
    horizon: 2,
    modelVersion: "v3",
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "QB", stat: "passing_yards", horizon: 2, n: 30, omenMae: 32.0, providerMae: 24.0 }),
      statEvaluation({ week: 5, position: "QB", stat: "passing_yards", horizon: 2, n: 30, omenMae: 30.0, providerMae: 25.0 }),
    ],
  });

  assert.equal(receipt.state, "provider_leads");
  assert.equal(receipt.position, "QB");
  assert.equal(receipt.stat, "passing_yards");
  assert.equal(receipt.horizon, 2);
  assert.equal(receipt.scoring_family, null);
  assert.equal(receipt.omen_mae, 31.0);
  assert.equal(receipt.provider_mae, 24.5);
});

test("stat forecast authority: tie when difference is within tie margin", () => {
  const receipt = resolveForecastAuthority({
    position: "RB",
    stat: "carries",
    horizon: 1,
    modelVersion: "v3",
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "RB", stat: "carries", horizon: 1, n: 30, omenMae: 2.5, providerMae: 2.55 }),
      statEvaluation({ week: 5, position: "RB", stat: "carries", horizon: 1, n: 30, omenMae: 2.6, providerMae: 2.62 }),
    ],
  });

  assert.equal(receipt.state, "unresolved_tie");
});

test("stat forecast authority: custom tie margins via policy (proportional or per-stat)", () => {
  // Difference is 2.0 yards (32.0 vs 30.0), which is > default 0.15,
  // but within a custom tieMarginMae of 3.0 or a 10% ratio.
  const evaluations = [
    statEvaluation({ week: 4, position: "QB", stat: "passing_yards", horizon: 1, n: 30, omenMae: 30.0, providerMae: 32.0 }),
    statEvaluation({ week: 5, position: "QB", stat: "passing_yards", horizon: 1, n: 30, omenMae: 30.0, providerMae: 32.0 }),
  ];

  const receiptWithStatMargin = resolveForecastAuthority({
    position: "QB",
    stat: "passing_yards",
    horizon: 1,
    now,
    evaluations,
    policy: { statTieMargins: { passing_yards: 3.0 } },
  });
  assert.equal(receiptWithStatMargin.state, "unresolved_tie");

  const receiptWithRatio = resolveForecastAuthority({
    position: "QB",
    stat: "passing_yards",
    horizon: 1,
    now,
    evaluations,
    policy: { tieMarginRatio: 0.1 }, // 10% of 30.0 is 3.0 > 2.0 diff
  });
  assert.equal(receiptWithRatio.state, "unresolved_tie");
});

test("stat forecast authority: fails closed on low sample size or few weeks", () => {
  // Low player count (<50)
  const lowSample = resolveForecastAuthority({
    position: "TE",
    stat: "receptions",
    horizon: 3,
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "TE", stat: "receptions", horizon: 3, n: 20, omenMae: 1.0, providerMae: 1.5 }),
      statEvaluation({ week: 5, position: "TE", stat: "receptions", horizon: 3, n: 20, omenMae: 1.0, providerMae: 1.5 }),
    ],
  });
  assert.equal(lowSample.state, "unresolved_low_sample");
  assert.equal(lowSample.sample_size, 40);

  // Only 1 week (<2 weeks)
  const oneWeek = resolveForecastAuthority({
    position: "TE",
    stat: "receptions",
    horizon: 3,
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "TE", stat: "receptions", horizon: 3, n: 60, omenMae: 1.0, providerMae: 1.5 }),
    ],
  });
  assert.equal(oneWeek.state, "unresolved_low_sample");
  assert.equal(oneWeek.weeks, 1);
});

test("stat forecast authority: fails closed on stale evaluations or absent provider projections", () => {
  // Stale (>21 days)
  const stale = resolveForecastAuthority({
    position: "WR",
    stat: "receiving_yards",
    horizon: 4,
    now,
    evaluations: [
      statEvaluation({ week: 1, position: "WR", stat: "receiving_yards", horizon: 4, n: 30, omenMae: 10.0, providerMae: 15.0, finishedAt: "2026-08-01T00:00:00Z" }),
      statEvaluation({ week: 2, position: "WR", stat: "receiving_yards", horizon: 4, n: 30, omenMae: 10.0, providerMae: 15.0, finishedAt: "2026-08-08T00:00:00Z" }),
    ],
  });
  assert.equal(stale.state, "unresolved_stale");

  // No stored provider projections
  const noProvider = resolveForecastAuthority({
    position: "WR",
    stat: "receiving_yards",
    horizon: 1,
    now,
    evaluations: [
      statEvaluation({ week: 4, position: "WR", stat: "receiving_yards", horizon: 1, n: 30, omenMae: 10.0, providerMae: 15.0, noProvider: true }),
      statEvaluation({ week: 5, position: "WR", stat: "receiving_yards", horizon: 1, n: 30, omenMae: 10.0, providerMae: 15.0, noProvider: true }),
    ],
  });
  assert.equal(noProvider.state, "unresolved_low_sample");
});

test("resolveStatlineForecastAuthority maps across stats and horizons", () => {
  const evaluations = [
    {
      season: 2026,
      week: 4,
      finished_at: "2026-10-15T12:00:00Z",
      summary: {
        positions: {
          TE: {
            stats: {
              targets: {
                horizons: {
                  1: { provider: { n: 30, mae: 1.8, omen_mae_same_players: 1.2 } },
                  2: { provider: { n: 30, mae: 1.5, omen_mae_same_players: 1.9 } },
                },
              },
              receiving_yards: {
                horizons: {
                  1: { provider: { n: 30, mae: 18.0, omen_mae_same_players: 12.0 } },
                  2: { provider: { n: 30, mae: 15.0, omen_mae_same_players: 19.0 } },
                },
              },
            },
          },
        },
      },
    },
    {
      season: 2026,
      week: 5,
      finished_at: "2026-10-15T12:00:00Z",
      summary: {
        positions: {
          TE: {
            stats: {
              targets: {
                horizons: {
                  1: { provider: { n: 30, mae: 1.8, omen_mae_same_players: 1.2 } },
                  2: { provider: { n: 30, mae: 1.5, omen_mae_same_players: 1.9 } },
                },
              },
              receiving_yards: {
                horizons: {
                  1: { provider: { n: 30, mae: 18.0, omen_mae_same_players: 12.0 } },
                  2: { provider: { n: 30, mae: 15.0, omen_mae_same_players: 19.0 } },
                },
              },
            },
          },
        },
      },
    },
  ];

  const map = resolveStatlineForecastAuthority({
    position: "TE",
    stats: ["targets", "receiving_yards"],
    horizons: [1, 2],
    modelVersion: "v3",
    now,
    evaluations,
  });

  assert.equal(map.targets[1].state, "omen_leads");
  assert.equal(map.targets[1].stat, "targets");
  assert.equal(map.targets[1].horizon, 1);

  assert.equal(map.targets[2].state, "provider_leads");
  assert.equal(map.targets[2].stat, "targets");
  assert.equal(map.targets[2].horizon, 2);

  assert.equal(map.receiving_yards[1].state, "omen_leads");
  assert.equal(map.receiving_yards[2].state, "provider_leads");
});
