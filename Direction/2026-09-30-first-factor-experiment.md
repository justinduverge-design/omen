# First factor experiment — does context beat the projection? (2026-09-30)

> **Corrected after code review (same day).** The first run had a data bug (every game against the Rams lacked an opponent-strength value) and a bootstrap that resampled position-week slices instead of whole weeks. Both are fixed and every number in this report was re-run; none of the conclusions changed. The tables below are the corrected ones. The bar for the family tests (99% interval above zero, 4 of 5 seasons positive, effect at least +0.5 points) was written down before the tests ran (`scripts/research/context-vs-projection/PREREGISTRATION.md`); that file is self-authored and not independently timestamped, and the +0.5 threshold is a judgment, not a law: at +0.2, game lines would pass.

**Question.** Omen's pitch is "real football context, not just comparing projections." Before building a data layer for it: does adding context (game lines, rest, primetime, weather and roof, opponent strength, recent form) to a provider's projection predict who scores more, on weeks the model never saw?

**Method.** 44,480 player-weeks, QB/RB/WR/TE, regular seasons 2018-2025, weeks 1-18. Baseline and outcome both from Sleeper (its weekly projection, and its actual PPR points), so no player-ID mapping is involved. Context from nflverse `games.csv` (spread and total give each team's implied score; rest days; roof, temperature, wind; weekday and kickoff time) and from opponent-allowed points to the position over the previous four weeks of the same season. A ridge regression per position learns the *residual* (actual minus projection); it is trained only on earlier seasons and scored on 2021-2025 (19,103 played player-weeks). The decision metric is the start/sit one: among pairs at the same position and week whose projections are within 2 points (both at least 5), how often does the higher-rated player actually score more? 95% intervals are cluster-bootstrapped over weeks.

## Results

| | Right on close calls | Change vs projection (95% CI) |
|---|---|---|
| Projection only | **54.0%** (129,487 pairs) | — |
| + game lines | 54.3% | +0.22 pts [+0.11, +0.35] |
| + rest / primetime / home | 54.2% | +0.18 [-0.06, +0.43] |
| + weather / roof | 54.2% | +0.21 [-0.04, +0.45] |
| + opponent vs position | 54.2% | +0.14 [-0.03, +0.31] |
| + recent form vs projection | 53.8% | **-0.21** [-0.39, -0.04] |
| All context together | 54.3% | +0.21 [-0.13, +0.58] |
| (QB only, all context) | 55.7% vs 54.3% | +1.33 [+0.13, +2.54] |

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

---

# Update: all families tested (same day, fixed rule)

The founder asked to test every family rather than stop at the first miss. Rule written down **before** any family ran (`scripts/research/context-vs-projection/PREREGISTRATION.md`): a family "works" only if the 99% cluster-bootstrap interval of the close-call hit-rate change has a lower bound above zero, the change is positive in at least 4 of the 5 test seasons, and the effect is at least +0.5 points. 99% not 95% because eight families are tested. Player IDs matched by name and birth date at 99.2% coverage; as a check on that match, Sleeper's actual points agree with nflverse's own PPR calculation with 0.998 correlation.

| Family | Hit rate (baseline 54.04%) | Change | 99% CI | Seasons positive | Result |
|---|---|---|---|---|---|
| A availability (injury report, practice status, returning from injury) | 54.00% | -0.04 | [-0.34, +0.26] | 2/5 | no |
| B usage trends (targets, WOPR, carries, snap share and their trend) | 53.71% | -0.33 | [-0.75, +0.06] | 1/5 | no |
| C player-specific splits (primetime, home/away, dome, cold or wind) | 54.02% | -0.02 | [-0.29, +0.25] | 2/5 | no |
| D team tempo and scheme (pass rate, plays, opponent pass rate faced, new coach) | 54.19% | +0.15 | [-0.08, +0.38] | 3/5 | no |
| E1 game lines (implied team totals, margin) | 54.26% | **+0.22** | [+0.06, +0.37] | **5/5** | no (real, but below +0.5) |
| E2 rest / primetime / home | 54.22% | +0.18 | [-0.14, +0.49] | 3/5 | no |
| E3 weather / roof | 54.25% | +0.21 | [-0.11, +0.54] | 3/5 | no |
| E4 opponent vs position | 54.18% | +0.14 | [-0.08, +0.38] | 4/5 | no |
| E5 recent form vs projection | 53.83% | -0.21 | [-0.46, +0.03] | 1/5 | no |
| All features together | 54.15% | +0.11 | [-0.50, +0.68] | 2/5 | no |

**F, variance.** A player's recent score spread does **not** predict how far next week lands from his own average once you compare players at the same scoring level (Spearman 0.02 to 0.05; the raw 0.14 to 0.18 is just higher scorers having bigger swings). Player-specific ceiling and floor from recent history is not supported.

**G, waiver / rest of season** (predict the average over the next 3 weeks, 11,465 player-weeks): trailing 4-week average MAE 4.49; this week's projection 3.91; usage-plus-schedule model 3.81; the next three weeks of projections (uses future snapshots) 3.51. The model beats the trailing average by 0.69 points and the current projection by **0.10 points** (99% CI [-0.145, -0.068]). By the pre-registered rule G passes; by any practical measure it is marginal, and the rule for G had no practical-size threshold, which was a gap in the pre-registration. Most of the gap over a recency-chaser comes from using a projection at all, which every provider already does. The weekly rank correlation moves from 0.535 (projection) to 0.542.

## What the full set says

1. **Statistically, no football-context family measurably improves on a decent projection for ordering start/sit calls.** Game lines are the only consistent signal and worth about a fifth of a point. This agrees with how projections are built: they already price in lines, matchup, rest and weather.
2. **The projection's own resolving power is the story.** Right 52% of the time within 1 point of projection, 57% at 1 to 2, 60% at 2 to 3, 65% at 3 to 5, 73% at 5 to 8, 82% at 8 or more. Most close calls are noise, and saying so is accurate.
3. **Untested, and the honest limits:** this baseline likely includes kickoff-time information (so availability and late news cannot show a gain here), the models were linear with simple features, depth charts were skipped (inconsistent format across years), coaching and scheme beyond pass rate and a new-coach flag were not tried, win-probability lineup choices need league matchup data we do not have, and nothing here measures speed of news. Trades were not tested.
4. **Where Omen can still be better than a provider, on this evidence:** (a) telling the user when a call is a coin flip and when it is not, with accuracy it can show; (b) bringing ESPN, Yahoo and Sleeper leagues into one place with one honest read; (c) workflow where projections do not decide (waiver claims and timing, trade fairness, deadlines, what changed since you last looked); (d) speed on availability, which needs a mid-week baseline and the forward shadow log to measure.

## Exploratory follow-up (not pre-registered; treat as a hypothesis)

Run per position after the main result, with the same strict rule applied to each (12 combinations checked: 3 feature sets by 4 positions, so about 0.1 false passes are expected at 99%).

| Features | Position | Change | 99% CI | Seasons + | |
|---|---|---|---|---|---|
| lines only | **QB** | **+1.12** | [+0.30, +1.98] | 5/5 | pass |
| lines only | WR | +0.17 | [+0.03, +0.31] | 5/5 | no (below +0.5) |
| lines + weather + rest | WR | +0.60 | [+0.05, +1.11] | 5/5 | pass, but the specification was chosen after looking: weak |
| everything else | | | | | no |

The quarterback result is the cleaner one (a single feature, implied team total, positive in all five seasons, and the theory is sensible: a QB's output follows his team's passing volume). It is also the position with the fewest pairs (13,986). **It is not a basis for building a pipeline.** It is a hypothesis for the forward shadow log, and a cheap one: implied totals come from a schedule file we already read.

---

# Round 2: combinations and interactions (founder's challenge, same day)

**The challenge:** round 1 tested families one at a time, and its one "all together" model was linear and additive, which cannot represent interactions (wind and pass rate, short week and primetime) and never chose a best subset. So "no combination helps" was not established. Round 2 (`PREREGISTRATION_2.md`, written before running) tests four fixed models with the same data split, metric, whole-week bootstrap and pass rule (99% interval above zero, at least 4 of 5 seasons positive, at least +0.5 points):

| Model | Hit rate (baseline 54.04%) | Change | 99% CI | Seasons + | Result |
|---|---|---|---|---|---|
| M1 gradient-boosted trees, all context, pooled | 53.94% | -0.10 | [-0.53, +0.32] | 3/5 | no |
| M2 trees, all context plus the projection itself (nonlinear calibration) | 54.30% | +0.26 | [-0.17, +0.72] | 4/5 | no |
| M3 as M2, one model per position | 54.01% | -0.03 | [-0.57, +0.51] | 3/5 | no |
| M4 nested forward selection of families (the chosen combination never sees the season it is tested on) | 54.35% | +0.31 | [-0.06, +0.70] | 4/5 | no |

**M4's chosen families change every year** (2021 none; 2022 weather + availability + tempo + lines; 2023 opponent + lines + rest; 2024 rest + tempo + weather + form; 2025 lines alone). A real signal would be selected consistently; this is noise-fitting around a small effect.

**What this does and does not rule out.** Combining families and letting trees find interactions does not produce an effect distinguishable from zero, and the best point estimates (+0.26, +0.31) are below the +0.5 bar. It does **not** rule out a true effect of roughly +0.3: the intervals are about 0.9 points wide, so an effect that small cannot be detected with 19,103 player-weeks. A +0.3-point gain would change roughly one close call in 330, which is not a product.

Still untested: depth charts, trades, win-probability lineup choices, news speed, and anything needing a mid-week baseline.
