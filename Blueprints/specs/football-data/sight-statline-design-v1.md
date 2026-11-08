# Sight stat-line forecast v1 (Sight v3): design note

**Status:** Proposed. Design only: no code, no migration, no flag, no production change.
**Date:** 2026-11-07
**Card:** B13-SIGHT-STATLINE (omen#858). This is the first PR the card asks for; the code is the second.
**Founder decisions this follows:** 2026-10-25 "Build 12 keeps points; Build 13 forecasts the stat line"
(`Direction/decision_log.md`); 2026-10-16 evaluated authority replaces provider authority
(`omen-projections-v1.md` section 6). Build 13 package: `Direction/release/builds/build-13.md` ("Forecast liability").
**Depends on:** `omen-projections-v1.md` (the stat-line function and its backtest harness, already written),
`omen-sight-v0.md`, `omen-fantasy-metrics-v1.md`.

## 0. The short version

A stat-line forecaster is **already written and never run**: `src/services/omenProjections/` (`omen-proj-v1`) projects
one week of nflverse stat keys for QB/RB/WR/TE, ships a walk-forward backtest harness, and was proven only on
synthetic worlds (`omen-projections-v1.md` section 10, item 1). This card should not build a second model. It should:

1. run that backtest once, unchanged, on real held-out seasons (the founder's agent, read-only) to get the first real
   scorecard;
2. extend the function from one week to four (this week and three coming, the horizon the 2026-10-23 decision uses);
3. add K and DEF after the skill positions, from the lines `kdefMetric.js` already builds;
4. wire the result in as **Sight v3**, computed beside v1 and v2, graded daily, served only when the founder sets
   `SIGHT_VERSION=v3`;
5. extend the forecast-authority block from "points, per position" to "per stat, per position, per horizon", so Omen
   leads only where its measured error beats the provider's.

Stored points stay PPR so v3 compares with v1/v2; league scoring (custom ESPN, Yahoo) is applied at read time to the
stat line with `scoringContract.calculateContractScore`, which is what replaces Yahoo's approximate scoring.

## 1. What Sight does today

| Piece | File | What it does |
|---|---|---|
| Daily run | `footballWarehouse/derivedStages.js` | After the nflverse facts land (07:15 ET), runs opportunity, RAT-QB, RAT skill, then `createSightRunner`. A Sight failure is reported, never fatal. |
| Run | `footballWarehouse/sightRun.js` | For every played week `w` of the season and each version in `VERSIONS = ["v1","v2"]`, writes one metric run ("Sight through week w") into `football_metric_runs` / `football_metric_values`. A week whose inputs fingerprint (ingest events, `weights_sha256`, `SIGHT_CODE_REVISION`) is unchanged is left alone. |
| Model | `footballWarehouse/sightV1.js`, `sight-weights.v1.json` | Season-to-date RAT components, shrunk and z-scored in the week's cohort, plus points per game to date, times weights fitted per (season, position, phase) on the five earlier seasons (ridge). v2 adds implied team total, opponent allowed to position, usage trend, vacated share, weather. Output: one expected PPR total for **next week** (`sight_points`), a 0-100 grade, drivers. |
| K and DEF | `kdefMetric.js` | Omen's own standard-scoring lines from play-by-play; v2 only. |
| Grading | `sightAccuracyRun.js`, `sightAccuracy.js` | Sight through week G-1 against PPR actually scored in week G; per position: Sight vs points-per-game-to-date vs the stored provider projection (`player_weekly_projections.stat_line->>'pts_ppr'`). Each version is graded when `SIGHT_ENABLED=true`. |
| Authority | `forecastAuthority.js`, `sightRepository.readAuthority` | Per position, from the newest season's succeeded accuracy runs (up to 36): `omen_leads`, `provider_leads`, `unresolved_tie` (MAE gap under 0.15), `unresolved_low_sample` (under 50 player-games or 2 weeks), `unresolved_stale` (over 21 days). PPR, weekly horizon only. |
| Serving | `sightEnrichment.js` | `SIGHT_ENABLED=true` attaches a `sight` block to each player (version from `SIGHT_VERSION`, default `v1`); the crosswind row appears when Omen and the provider differ by more than the position's measured MAE. Absent block hides the surface. |

What it cannot do, and why this card exists: one number, one week ahead, in one scoring system. It has no targets,
carries, yards or touchdown counts, so it cannot be re-scored for a league, cannot say *why* two players differ in
terms a person watches (volume vs efficiency), and gives win probability nothing to work from.

## 2. The model, per stat

Simple and explainable first. The method is `omen-proj-v1` (section 4 of the projections spec), kept as written:
**expected stat = volume x efficiency x play probability**, every constant in `constants.js`, none fitted. A person
can read any number back: "8.1 targets because he averaged 8 over his last games, times a 65% catch rate, times 11.8
yards per catch".

| Stat (nflverse key) | Positions | Built as | Warehouse features |
|---|---|---|---|
| `targets` | WR, TE, RB | recency-weighted targets per game played, shrunk to the position mean (2 pseudo-games), times a game-environment multiplier (implied team points vs the team's recent, clamped 0.9-1.1) | `nfl_player_weekly_stats.targets`, `nfl_games.spread_line/total_line` |
| `receptions` | WR, TE, RB | targets x catch rate (k = 60 pseudo-targets toward the position) | `receptions`, `targets` |
| `receiving_yards` | WR, TE, RB | targets x yards per target (k = 80) | `receiving_yards`, `targets` |
| `receiving_tds` | WR, TE, RB | targets x TD per target (k = 200), prior scaled by red-zone target share vs position (clipped 0.5-2x), times a TD environment multiplier (0.8-1.25) | `stats` jsonb, `nfl_player_weekly_opportunity` red-zone targets |
| `carries` | RB, QB, WR | recency-weighted carries per game, shrunk, times the environment multiplier | `carries` |
| `rushing_yards` | RB, QB, WR | carries x yards per carry (k = 100) | `rushing_yards`, `carries` |
| `rushing_tds` | RB, QB, WR | carries x TD per carry (k = 150), red-zone carry share prior | `stats`, opportunity red-zone carries |
| `passing_attempts`, `completions` | QB | attempts per game (shrunk); completions per attempt (k = 250) | `passing_attempts`, `stats` |
| `passing_yards` | QB | attempts x yards per attempt (k = 300) | `passing_yards` |
| `passing_tds`, `passing_interceptions` | QB | attempts x TD rate (k = 500), x interception rate (k = 500) | `stats` |
| `fumbles_lost` | QB, RB, WR, TE | touches x fumble-lost rate (k = 400) | `stats` |

Why this shape: the weights are recency decay (volume half-life 4 games, efficiency 12, 0.6x per season back), so
volume reacts to a role change and efficiency, which is mostly noise, is pulled to the position. Every efficiency
carries explicit pseudo-opportunities, so a rookie or a thin sample lands on the position rate with a `low`
confidence band instead of an invented number. Flags (`rookie`, `thin_sample`, `team_changed`,
`returning_from_absence`, `no_game_context`) travel with the line.

**Touchdowns "by kind"** means passing, rushing and receiving touchdowns, forecast separately because leagues score
them differently and the rates have different drivers. Return, defensive and two-point touchdowns are not modelled
for skill players (the projections spec already excludes them); a defensive or return TD is a DEF stat (below).

**K and DEF (second phase, own backtest).** Kickers: field-goal attempts per game from the team's implied points
and recent attempt rate; make rate by distance bucket (under 40, 40-49, 50+) and extra points, each regressed to
the league with pseudo-attempts. Defenses: sacks, interceptions, fumble recoveries, defensive TDs, safeties and
points allowed, from the team's recent rate blended with the opponent's implied total (points allowed is the
strongest term: Sight v2's DEF correlation is 0.297 against production's 0.075). Both reuse `kdefMetric.weeklyLines`
for history and Omen's own standard scoring. Kicker weeks are close to random (v2 corr about 0.02), so the likely
outcome is "no better than the naive baseline, served with a low band, authority unresolved". The scorecard decides;
it is not assumed.

**Ablations the backtest must report (each enters only if it helps, as the projections spec says).** (a) without the
game-environment step (`model_no_context`, exists); (b) opponent allowed-over-expected per stat (the warehouse can
build it; `MCH-02`); (c) Sight v2's role features as a volume term (vacated target/carry share when teammates are
out, usage trend), which gained RB 0.542 -> 0.551 in v2; (d) game script (favourites run more), which v1 leaves out.

**Not inputs.** Provider projections never feed Omen's number (benchmark and fallback only). Snap counts and routes
(rights review open), FTN charting (share-alike) and contracts are excluded, as in the projections spec section 2.

## 3. The weeks ahead

The forecast is made for horizons h = 1..4 from the last completed week L: h = 1 is the next game (this week during
the season), h = 2..4 the three after it. Four because the 2026-10-23 decision judges trades and waivers over "this
week and up to three coming ones".

- **History** is the same for every h: facts through week L. No simulated intermediate weeks.
- **Volume and efficiency** are the h = 1 estimates. They do not drift with h; the uncertainty does (below).
- **Bye weeks** are an empty line with reason `bye_week`, from `nfl_games`.
- **Game environment** is applied per target week, but only where a betting line exists for that game. Lines usually
  exist for the coming week or two. Past that, the multiplier is 1.0 and the line carries `no_game_context`.
  Backtest note: nflverse lines are closing lines and the backtest sees them for every horizon, so h >= 3 results
  are **optimistic** on this term. The scorecard therefore reports each horizon with and without the environment
  step, and the serving rule uses the **without** result for any horizon where lines will not exist live.
- **Weather** is out for now: v2 measured no gain, the line already prices it (`omen-sight-v0.md`).
- **Availability** is the weak spot. Bye is exact. Injury status is today's only (`player_injury_reports` holds one
  current row per player, from the Sleeper list, once a day), so statuses scale only the near week by the existing
  rules (out = empty, doubtful x0.15, questionable x0.85, each lowers the band) and fade for later weeks: a player out
  now is not assumed out in week L+4, and an injured player's later weeks carry the `availability_unknown` flag and a
  band one step down. Nothing about availability can be backtested (no historical statuses), so the scorecard is
  explicit that all backtest numbers are **conditional on the player playing**.
- **Uncertainty widens with h.** Each line carries an 80% interval per stat, learned from earlier weeks' residuals by
  position, stat and horizon (the harness already does this for h = 1). The interval is also the input win probability
  will need later; this card produces it and stops there.
- **Output** per player: `{ horizons: [{ h, season, week, stat_line, availability, confidence, interval, flags }] }`,
  the section 5 contract of the projections spec repeated per horizon. No `points` field inside the line.

## 4. The held-out backtest

Harness: `omenProjections/backtest.js` + `pgSource.js` + `scripts/omen-projections-backtest.js`, extended with the
horizon dimension and the per-stat metrics. Walk-forward and leakage-proof by construction (history is appended only
after the week's projections are made, priors rebuilt per season from earlier seasons, intervals from earlier
residuals), with the existing leakage test extended to h = 2..4: change data at and after the forecast origin and
assert nothing projected moves.

**Which weeks.**

| Role | Seasons | Used for |
|---|---|---|
| Warm-up | 2020-2022 | history and priors only, never scored (projections spec: at least 2, 3 preferred) |
| Development | 2023, 2024 | first run; any ablation decision |
| Sealed | 2025 | scored once, only for the final candidate, never looked at while choosing |
| Live forward check | 2026, weeks played so far | no fitting; the provider baseline exists here (below); recomputed daily by the accuracy job |

Regular season only, every forecast origin L = 1..(last week - h) so weeks 2-18 are targets for 2023-2025 (18-week
seasons). Early-season weeks lean on last season's history and are reported separately by Sight's phases
(`early` 1-5, `pre_deadline` 6-9, `post_deadline` 10+). Because constants are not fitted, there is no training split
to leak; the discipline is that no constant moves after the sealed season has been read. If one does, that is a new
method version and the sealed season is spent for the old one, so the next candidate is judged on 2026 live weeks.

**Universe.** `relevant` (pre-week average opportunities over the last three games meet the versioned
`preweek-opportunity-v1` threshold: QB 20 attempts + carries, RB 8 carries + targets, WR 4, TE 3) and `all`, as in the
projections spec. Neither universe is selected by any predictor's fantasy points.

**Predictors compared, per stat:** `model`; `model_no_context`; `last3` (mean of that stat over the last three games
played); `season_avg` (this season so far, else last); `sight_v2` (points only; for the points rows, from the stored
v2 value as of the same origin); `provider` (stored Sleeper stat line, only where present).

**Provider baseline, said plainly.** The only stored provider benchmark is the Sleeper projection, which carries a
stat line (so it can be scored per stat). The warehouse stage fetches only the current week and the next two, so
**history exists only from when storing began**; held-out 2023-2025 has no provider rows, and ESPN and Yahoo
numbers are not stored at all (ESPN's `appliedTotal` is a points total in the league's rules, Yahoo has none). So:
- 2023-2025: Omen vs the naive baselines per stat. This proves the model, not the lead over the provider.
- 2026 live weeks: Omen vs Sleeper per stat and for points, accumulating weekly; this is the evidence the authority
  block uses. **Open question 3** is whether the migration holding that table is applied in production (the
  warehouse map still says "written but not applied"; I could not check production from this run).

**Metrics**, per position x stat x horizon x universe x season: MAE, RMSE, bias (mean signed error), mean within-week
Spearman (weeks with at least 8 players), share of actuals inside the 80% interval (target 0.80), MAE by band
(error should rise as confidence falls), MAE by experience (debut / 1-3 / 4+ prior games). Derived points under
standard, half-PPR and PPR via the scoring engine, for continuity with v1/v2 and with the projections spec's ship
rule. Paired comparison against each baseline: absolute-error difference, **player-clustered** standard error,
verdict `a_better | b_better | no_clear_difference`, only with at least 100 paired player-weeks and 20 player
clusters (`paired-evidence-v1`); below that the verdict is `insufficient_data`.

**Team-sum check (diagnostic, not a constraint).** For each team-week, the sum of projected targets, carries and
pass attempts against the team's actual and typical totals; a systematic miss exposes volume that is double counted
across teammates. It does not alter lines.

## 5. The scorecard and the forecast-authority block

**Scorecard artifact.** A JSON + markdown pair per run (extends the harness output), rows keyed
`(position, stat, horizon, universe, season)`: metrics above, baselines, paired verdicts. Plus a stored,
daily-refreshed live scorecard (below). The first PR with code adds a scorecard test on a fixture season (the card's
check), asserting the numbers on a synthetic world with a known answer and the leakage property.

**Live accuracy job.** `omen_sight_statline_accuracy` (formula version `v3`), a sibling of `omen_sight_accuracy`
written by the same metric-run writer. Forecast origin L is graded as week L + h completes. Its summary mirrors
today's shape one level deeper:

```text
summary.positions[POS].stats[STAT].horizons[h] = {
  n, omen: { mae, bias, ... }, last3: { mae }, season_avg: { mae },
  provider: { n, mae, omen_mae_same_players, ... } | { n, reason: "no_stored_provider_projections" } }
```

and keeps today's `summary.positions[POS].provider` block for points, so v1/v2 authority and the crosswind row keep
working unchanged.

**Authority, extended.** `resolveForecastAuthority` keeps its logic and constants (minimum 50 player-games, 2 weeks,
tie margin, 21-day staleness, size-weighted MAE) and gains two keys, `stat` and `horizon`. Its `scoring_family` stays
`ppr` for points rows; stat rows have no scoring family (a stat is not scored). Results are `omen_leads` /
`provider_leads` / `unresolved_tie` / `unresolved_low_sample` / `unresolved_stale` per `(position, stat, horizon)`.
Tie margins for yards cannot reuse 0.15 points: **margin per stat is a proportion of the position's MAE**, to be set
from the first scorecard, not guessed here (open question 5).

How the lead is used:
1. The per-stat table on the decision screens shows Omen's number beside the provider's; the lead marker appears
   only on a stat whose state is `omen_leads` for that position and horizon. Otherwise both are shown without a
   leader, which is the honest reading of a tie or thin evidence.
2. A points-level lead keeps its present meaning and also depends on the v3 points row, not the stat rows, so a
   league-scored total never claims authority the PPR scorecard did not earn.
3. To say "Omen leads" for a stat the MAE rule (above) is necessary but not sufficient: the paired clustered verdict
   against both naive baselines must also be `a_better` for the sealed season and the live weeks (the existing ship
   rule requires two of three held-out seasons; I recommend it needs the sealed season plus the live check instead,
   because development seasons will have informed the ablations). That is open question 4.
4. No data, no claim: a stat with no provider value for a player shows Omen's number with the source label "Omen" and
   no comparison.

## 6. Running beside current Sight, and the one switch

- **Name:** Sight v3. `VERSIONS` in `sightRun.js` becomes `["v1","v2","v3"]`, and the accuracy loop in
  `derivedStages.js` grades v3 too. v1 and v2 code paths are not touched. `readAuthority` already accepts any
  `v[0-9]{1,3}`, so the authority follows the version.
- **Computed daily, served never by default.** v3 runs every day after the facts, reported never fatal like v1/v2,
  and is graded daily when `SIGHT_ENABLED=true`. Nothing a tester sees changes until the founder sets
  `SIGHT_VERSION=v3`. Rolling back is unsetting it; v1/v2 values are still being written the whole time.
- **Compatible block.** The v3 `sight` block is a superset of v2's: `sight_points` (the PPR score of the h = 1 line,
  so crosswind and grade keep working), `grade`, `confidence`, `drivers` (volume and efficiency terms in plain
  words), plus `statline.horizons[...]`. A client that reads only v2 fields is unaffected by the switch.
- **League scoring at read time.** The stored line is counts. The API applies `scoringContract` for the league
  asking, so Yahoo and custom ESPN leagues get exact points from the same line; unsupported rules return the
  existing `bonus_rules_excluded` statement rather than a guessed number.
- **Storage, no migration in the first code PR.** Lines go into `football_metric_values.components` (jsonb, existing
  table), one value row per player per origin week with all four horizons inside; `value` is the h = 1 PPR points.
  The alternative is the `omen_player_weekly_projections` table sketched in the projections spec section 8: cleaner
  to query per horizon, but it is a schema change that needs the founder's exact approval (staging, verify,
  production). Open question 2.
- **Recompute trigger.** A change to `constants.js` or the method changes a code-revision string in the run's inputs
  (the `SIGHT_CODE_REVISION` pattern), so every origin week recomputes. Old versions stay for comparison.
- **Order of work for the code PRs:** (1) harness extended to h = 1..4 and per-stat scorecard + test; (2) founder's
  agent runs the real backtest read-only; (3) K and DEF; (4) Sight v3 run + accuracy job + authority extension, all
  dark; (5) the founder reads the scorecard and decides the switch. The decision-screen table and win probability are
  separate cards that read the v3 block.

## 7. What it costs on the hardware

**Estimates, not measurements.** I did not run anything in this pass; the first code PR must record wall time and
peak memory and replace these numbers.

- **Host.** KVM1 is 2 vCPU / about 7.9 GB and also runs the API, cron, Nginx and the deploy runner. The daily ingest
  already needs a 3 GB Node heap workaround for the CSV parse (Rust plan, ingest row). So v3 must not add a second
  big load to that window.
- **Per run.** A projection is arithmetic over at most 24 games of one player. About 2,000 players x 4 horizons is
  about 8,000 lines, a few seconds of CPU at most; none of it is model training (no fitted parameters). SQL is the
  cost: one read of the current and previous season's player-weeks (tens of thousands of narrow rows; the opportunity
  table was about 1.4 GB across *all* seasons, so one or two seasons is small), plus the day's lines. Peak memory
  should stay under a few hundred MB if the history is read as a stream per position. v1/v2 already do the same
  shape of work.
- **Daily increments only.** Only the newest origin week needs a v3 run each day (unchanged weeks are skipped by input
  fingerprint). Old origin weeks are needed once, for the live accuracy history, as a one-time backfill that runs
  off-hours.
- **Backtest.** The existing harness takes a few minutes per three seasons at h = 1. With four horizons and the
  with/without-environment pair, expect roughly an order of magnitude more, tens of minutes. It runs **off KVM1**, on
  a restored warehouse copy (the weekly restore proof already makes one) or the founder's Mac, read-only through the
  `omen_warehouse_read` role, as the projections spec's command already specifies.
- **Storage.** About 2,000 value rows per origin week, each a small jsonb. Negligible against the 81 GB free on KVM1.
- **Serving.** The enricher reads the same row it reads today; payload grows by a table per player. Keep the existing
  `compact: true` (list rows draw points and grade only) so whole-league payloads such as the trade roster do not
  balloon, and keep the 800 ms read budget.
- **Money and data.** No paid API; nflverse and the stored Sleeper feed only; no user data enters the model, so
  `scripts/checks/no-pii-outbound.js` is unaffected.

## 8. Open questions for the founder

1. **Build on `omen-proj-v1`, or start over?** I recommend building on it: it is written, tested on synthetic worlds
   and shaped for exactly this. The cost is that its constants are judgment values. Starting over would add time and
   no evidence. Say if you want something fitted (like Sight's ridge weights) instead of hand-set constants.
2. **Storage.** Put v3 lines in `football_metric_values.components` (no migration, recommended for the first PRs) or in
   the new `omen_player_weekly_projections` table (a migration only you can approve)?
3. **Is the provider-projection table live in production?** The warehouse map says migration 0005 is written but not
   applied, and says commercial permission from the provider is pending, while Sight accuracy already reads the table.
   I could not check production. Without stored history the provider comparison is empty and no stat can ever be
   `omen_leads`. Also: should we start storing ESPN's and Yahoo's own numbers (the user's league's), or is Sleeper
   enough as the benchmark?
4. **Rule for "Omen leads".** Keep the 2-of-3-seasons ship rule from the projections spec, or require the sealed 2025
   season plus the 2026 live weeks (my recommendation, because 2023-2024 will have informed the ablations)?
5. **Tie margin and thresholds for yards and TDs.** Today's 0.15 is in points. I propose a margin as a proportion of
   each position's own MAE, set from the first scorecard. Fine to set it then, or do you want a number now?
6. **Horizon length.** Four weeks (this week and three) matches the Build 12 decision; the flexible option is to
   forecast to week 18 for trade value. Longer horizons mostly return the position mean and widen intervals; I would
   not go past four without evidence.
7. **Win probability.** It needs a variance for every player. I plan to store the per-stat 80% interval with each
   line and leave the probability calculation to its own card. Agreed?
8. **K and DEF scope.** If the kicker scorecard shows no gain over the naive baseline, serve K with a `low` band and
   no lead marker, or hide the K stat table? (Recommended: serve, never lead.)
9. **Historical availability.** The backtest is conditional on playing. `nfl_weekly_rosters` carries a roster status
   per week; if it is a reliable did-not-play signal we can backtest an availability term. Do you want that
   investigated, or keep availability rule-based and unscored for now?

## 9. Limits of this note

- Nothing here was run. No backtest number, cost figure or production state is measured; each is marked as an
  estimate or an open question. The warehouse map (`warehouse/map/*.md`) is generated from `catalog.json` and parts
  look out of date (for example "Only RAT-QB exists"), so I relied on the code over the map where they disagree.
- `omen-proj-v1` has never been run on real data; whether it beats `last3` and `season_avg` is the question the first
  backtest answers. If it does not, the finding is the result, and the note's plan stops at step 2 until it is fixed.
- Not in scope: the decision-screen table, win probability, the engine that turns forecasts into start/sit/add/drop/
  cut/trade moves, trade value, and any change to the native app.
