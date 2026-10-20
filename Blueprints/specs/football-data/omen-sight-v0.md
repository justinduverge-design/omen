# Omen Sight v0

Sight is Omen's own read of football: numbers computed from the warehouse's facts, versioned, shown with
their parts, and graded against what happened and against provider projections.

## Layers

| Layer | What it is | Status |
|---|---|---|
| Sight | One per-player number for the week, on one scale across positions (flex-comparable) | not built |
| Position ratings | RAT-QB, RAT-RB, RAT-WR, RAT-TE (K and DEF to come) | QB, RB, WR, TE v0 |
| Components | The eye test under each rating: role and efficiency | shown on every value |

## Ratings v0 (unfitted, not opponent-adjusted)

Method (`src/services/footballWarehouse/sightGrade.js`, shared with RAT-QB): shrink each component toward
the qualified cohort's pooled mean, z-score it, take the weighted signed sum, and grade 50 + 10 z, clamped 0-100.
Season-to-date, regular season. A cohort under 8 qualified players is not graded.

| Rating | Qualifies | Components (weight) |
|---|---|---|
| RAT-RB | 40+ carries | carry share .25, rush EPA/carry .20, rush success .15, explosive run rate (10+) .10, target share .15, EPA/target .10, fumble rate (-) .05 |
| RAT-WR | 25+ targets | target share .25, EPA/target .20, catch over expected .15, air yards/target .10, YAC EPA/reception .10, explosive catch rate (20+) .10, red-zone target rate .10 |
| RAT-TE | 20+ targets | target share .30, EPA/target .20, catch over expected .15, red-zone target rate .15, YAC EPA/reception .10, air yards/target .10 |

Role shares use the player's team plays in the games he appeared in. Weights and shrinkage constants are
judgment values; v1 fits them against graded outcomes.

## Rules

- A number is evidence of something specific, never a verdict. No feature may read one value as a decision
  (the "0.0 means drop" mistake).
- A player under the qualification minimum has no grade, not a low grade.
- Ratings are stored in `football.football_metric_runs` / `football_metric_values` (`omen_rb_grade`,
  `omen_wr_grade`, `omen_te_grade`, `omen_qb_grade`), computed after each daily ingest. A rating failure never
  fails the ingest.
- Sight reaches the app as an optional `sight` block behind one switch (`SIGHT_ENABLED`): present renders,
  absent hides.

## Next

Weekly (through-week) runs so each week's grade can be graded; K and DEF; the Sight composite; grading Sight
and provider projections against league-scored outcomes; the `sight` block in API responses.

## Context layers (v2, built 2026-10-16, served once the bundle is complete)

Held out 2022-2025 unless noted; correlation with next-week fantasy points.

| Layer | Inputs | Result |
|---|---|---|
| Game context | team implied total (Vegas total and spread), opponent points allowed to position | QB 0.320 -> 0.373; small gains elsewhere. Kept. |
| K and DEF | Omen's own standard scoring from play-by-play | DEF 0.297 vs production 0.075 (12/12). K ~0.02: kicker weeks are near random; served with confidence low. |
| Role changes | usage trend (last 3 weeks vs season), vacated share of teammates out next week | 2024-2025: RB 0.551 vs 0.542 (vacated +0.83), QB/TE via trend; WR flat. Kept. |
| Weather | game-day wind, cold (recorded weather as a perfect forecast) | No gain (QB 0.375 vs 0.379, RB 0.539 vs 0.541). The Vegas line already prices it. Not added; no forecast pipeline. |
