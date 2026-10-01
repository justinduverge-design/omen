# First factor experiment — does context beat the projection? (2026-09-30)

**Question.** Omen's pitch is "real football context, not just comparing projections." Before building a data layer for it: does adding context (game lines, rest, primetime, weather and roof, opponent strength, recent form) to a provider's projection predict who scores more, on weeks the model never saw?

**Method.** 44,480 player-weeks, QB/RB/WR/TE, regular seasons 2018-2025, weeks 1-18. Baseline and outcome both from Sleeper (its weekly projection, and its actual PPR points), so no player-ID mapping is involved. Context from nflverse `games.csv` (spread and total give each team's implied score; rest days; roof, temperature, wind; weekday and kickoff time) and from opponent-allowed points to the position over the previous four weeks of the same season. A ridge regression per position learns the *residual* (actual minus projection); it is trained only on earlier seasons and scored on 2021-2025 (19,103 played player-weeks). The decision metric is the start/sit one: among pairs at the same position and week whose projections are within 2 points (both at least 5), how often does the higher-rated player actually score more? 95% intervals are cluster-bootstrapped over weeks.

## Results

| | Right on close calls | Change vs projection (95% CI) |
|---|---|---|
| Projection only | **54.0%** (129,487 pairs) | — |
| + game lines | 54.3% | +0.22 pts [+0.10, +0.35] |
| + rest / primetime / home | 54.2% | +0.18 [-0.05, +0.39] |
| + weather / roof | 54.2% | +0.21 [-0.02, +0.43] |
| + opponent vs position | 54.2% | +0.12 [-0.04, +0.31] |
| + recent form vs projection | 53.8% | **-0.21** [-0.39, -0.02] |
| All context together | 54.2% | +0.16 [-0.16, +0.50] |
| (QB only, all context) | 55.5% vs 54.3% | +1.14 [-0.11, +2.32] |

Mean error: the projection misses by about 5.2 points; context moves it by well under 0.1, except for QBs, where the gain (6.45 to 5.85) is almost entirely **correcting a bias** (Sleeper over-projects played QBs by 3.0 points on average), not context.

**How reliable the projection itself is, by gap between two players' projections:** within 1 pt: 51.8% (a coin flip); 1-2: 56.5%; 2-3: 59.5%; 3-5: 65.2%; 5-8: 72.9%; 8+: 81.7%.

## What this does and does not show

- **Shows:** the obvious context signals are already priced into a decent projection. Layering them on top buys about 0.2 percentage points on close calls, not distinguishable from zero. A pitch of "we add weather, rest and matchup to the projection and beat ESPN" is not supported by this test.
- **Shows:** close calls are close. Within one point of projection, the projection is right 52% of the time. The honest thing to tell a user there is "coin flip", and the band system already says it.
- **Does not show that no factor works.** Untested: injury report and practice participation, depth-chart and snap-share changes (leading indicators), player-specific splits, coaching and scheme, win-probability lineup choices (ceiling versus floor given the opponent), and waiver and trade value over the rest of a season. Features here were simple and the model linear.
- **The baseline may be stronger than a mid-week pick would have.** Players projected at 8+ points did not play only 1.9% of the time (QB 0.1%, RB 0.4%), which is lower than real life. Sleeper's historical projection is probably a kickoff-time snapshot that already reflects inactives. That makes it a harder baseline than the Tuesday-to-Thursday information a pick is usually made with, so true context value against a mid-week projection could be higher. As-of timing remains unproven; the forward shadow log is the proof. This also softens my earlier claim that these historical projections are "genuine pre-game projections": the correlation check was consistent with that, and the DNP rate is not strong evidence for it.
- Played-only rows were scored (22% of projected player-weeks, mostly small projections, never played), so late-scratch risk is not measured here.

## What it changes

The engine spec's rule, "a factor ships only if it improves out-of-sample error," did its job: the first factors failed. The plan's assumption that a *factor-adjusted expected-points model* is the product is **unproven** and should not be built out (data layer, factor library, tables) until a factor passes. See `Blueprints/specs/omen-decision-engine-v2.md` ("First experiment").
