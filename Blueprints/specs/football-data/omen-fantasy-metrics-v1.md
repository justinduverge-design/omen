# Omen fantasy metrics v1 — expected fantasy points, opportunity, role chart, dynasty outlook

**Status:** Proposed — awaiting founder approval
**Date:** 2026-10-10
**Sprint item:** `FM-XFP` in `Direction/current_sprint.md`
**Production authority:** none. Phase M1 is local and non-production. Each later phase needs its own
founder approval (`Direction/map.md` rules 4 and 5).

## 1. Outcome

Omen calculates its own fantasy stats from data the warehouse already holds with rights admitted.
There are no new sources, no new licences, and no change to the warehouse's sources or rights rule.
The stats explain the call: how a player was used, what that use is usually worth **in this league's
scoring**, and how his role and outlook are moving.

Four products, built in this order:

1. **Expected fantasy points (xFP).** What each player's targets and carries are usually worth, given
   where and how they happened, and points above expected (actual minus expected).
2. **Opportunity.** Red-zone, inside-10, inside-5, end-zone and deep work, plus WOPR. This fills the
   empty `football.nfl_player_weekly_opportunity` table.
3. **Role chart.** A usage-based ranking of each team's players by position, with role-change signals.
   It is never called a "depth chart".
4. **Dynasty outlook.** Vacated opportunity, the age of each position group and draft capital.

## 2. Why these sources (rights)

This spec is the "build our own" answer to the stats the warehouse excludes for rights reasons: Next Gen
Stats, PFR advanced stats, ESPN QBR and depth charts, and OverTheCap contracts
(`sql/2026-10-01-redo/15_nflverse_full_lines.up.sql:23`).

| Input | Warehouse table | Rights basis |
|---|---|---|
| nflverse play-by-play | `football.nfl_plays` (`source_row` keeps the full row) | CC BY 4.0, admitted 2026-08-24 |
| nflverse player-week stats | `football.nfl_player_weekly_stats` | CC BY 4.0, admitted 2026-08-24 |
| nflverse weekly rosters | `football.nfl_weekly_rosters` | CC BY 4.0, admitted 2026-08-24 |
| nflverse `players.csv` | `football.football_players` / `football_player_ids` | Already loaded under `nflverse_open_data`. The 2026-09-25 inventory marks it **conditional on a terms receipt**; see §9. |

Columns confirmed in the live 2026 nflverse files (2026-10-10):

- **Play-by-play:** `air_yards`, `yardline_100`, `down`, `ydstogo`, `goal_to_go`, `pass_location`,
  `run_location`, `run_gap`, `qb_dropback`, `qb_scramble`, `rush_attempt`, `pass_attempt`, `complete_pass`,
  `touchdown`, `fumble_lost`, `cp`, `cpoe`, `xyac_mean_yardage`, `xyac_epa`, `xyac_fd`, `xpass`, `pass_oe`,
  `wp`, `score_differential`, `spread_line`, `total_line`.
- **Player-week:** `target_share`, `air_yards_share`, `wopr`, `racr`, `receiving_air_yards`.
- **`players.csv`:** `birth_date`, `rookie_season`, `draft_year`, `draft_round`, `draft_pick`, `draft_team`.

**Deliberately not used in v1:**
- **FTN charting.** Its CC BY-SA share-alike term would pass on to derived output, so these metrics stay on
  CC BY data. FTN is used for play-type splits in `omen-trend-evidence-v1.md` (founder, 2026-10-10,
  option A), on the football-intelligence path.
- **Snap counts.** Their rights review is still open.
- **Cap space and contracts.** Founder decision 2026-10-10: the warehouse stays as it is.

**Attribution:** every surface that shows these metrics credits "nflverse", as the admitted sources require.

## 3. Expected fantasy points (xFP)

### 3.1 Design: an expected stat line, not a single number

The warehouse has no league data; league scoring rules live in Supabase (`public.league_scoring_rules`).
So the warehouse stores a **league-neutral expected stat line** per player-week. The API turns it into
points for a given league at read time, with the existing scoring engine:

```text
expected facts (warehouse)  ->  calculateContractScore(league contract, expected facts)  ->  xFP in that league
```

Expected facts use the scoring contract's own event keys (`src/services/scoringContract.js` `EVENT_KEYS`).
One scoring language means xFP can't drift from how Omen grades real points.

### 3.2 Per-play expectations (formula `xfp-v1`)

Plays: regular- and post-season plays with a resolved player, excluding two-point attempts, kneels and
spikes. Aborted plays count only when a target or carry was recorded.

**Targets** (`receiver_player_id` set):

| Event key | Expected value |
|---|---|
| `receiving_receptions` | `cp` (nflverse completion probability) |
| `receiving_yards` | `cp × (air_yards + xyac_mean_yardage)` |
| `receiving_touchdowns` | lookup `P(TD \| target)` by `yardline_100` bucket × `air_yards` bucket |
| `fumbles_lost` | lookup `P(fumble lost \| reception)` × `cp` |

**Carries** (`rusher_player_id` set, designed runs and scrambles kept separate):

| Event key | Expected value |
|---|---|
| `rushing_yards` | lookup `E(yards \| carry)` by `yardline_100` bucket × down × `ydstogo` bucket |
| `rushing_touchdowns` | lookup `P(TD \| carry)` by `yardline_100` bucket × `goal_to_go` |
| `fumbles_lost` | lookup `P(fumble lost \| carry)` |

**Buckets (v1, recorded in run `parameters`):**
- `yardline_100`: 1–2, 3–5, 6–10, 11–20, 21–40, 41–60, 61–80, 81–99
- `air_yards`: ≤ 0, 1–9, 10–19, 20+
- `ydstogo`: 1–2, 3–6, 7–10, 11+

A null `cp` or `xyac_mean_yardage` falls back to the lookup table for that bucket and is counted in
`components.fallback_plays`.

**Lookup tables** are trained on earlier seasons only, never the season being scored. Any bucket with
fewer than 200 plays merges into its neighbour. A table is a **versioned model artifact**: JSON with
the formula version, training seasons, per-bucket counts and a SHA-256 of the content. It's built offline
by a script from the same admitted nflverse files and recorded in `football_metric_runs.parameters`.

### 3.3 Player-week output

Expected facts are summed per player-week, with actual facts summed alongside from the same plays:

- `value` = xFP under the **reference PPR contract** (for ranking and the backtest)
- `components` = `{ expected: {<event_key>: n}, actual: {<event_key>: n}, targets, carries, fallback_plays,
  model_artifact_sha256 }`

**Points above expected** = actual PPR minus xFP. **TD over expected** = actual TDs minus expected TDs, for
the season to date and the last 4 weeks.

### 3.4 League-specific xFP and bonus rules

`per_event` and `per_unit` rules apply directly to expected facts. `threshold_bonus` and `range_event`
rules (e.g. +3 at 100 yards) **can't be evaluated honestly on an average**. In v1, xFP in a league leaves
out those rules and returns `bonus_rules_excluded: [...]`. The call states the omission; it never guesses.

### 3.5 v1 scope

RB, WR and TE receiving and rushing, plus QB rushing. **QB passing xFP is v1.1.** Kickers, defence and IDP
are out of scope.

## 3.6 Beta slice for the 2026-10-13 beta (founder, 2026-10-10)

The founder asked for these stats in beta users' hands by Tuesday so they can critique them. The beta slice
ships **descriptive** start/sit evidence lines, computed in the API from nflverse files (6-hour cache,
stale-while-revalidate, one download in flight), with no database writes and no iPhone build:

| Line | Registry | File |
|---|---|---|
| Fated Points and Fate Gap (last 3 games) | FND-02/03 | `src/services/fantasyMetrics/fantasyMetricsLines.js` |
| TD Fate Gap (season, shown at ≥ 1.5 TDs) | FND-04 | same |
| Red-zone work (last 3 games) | FND-05 | same |
| Pecking Order | ROL-01 | same |
| Next Man Up (≥ 2 games without the teammate) | ROL-03 | same |
| Projected Team Score, blowout and shootout watch | ENV-01/02 | same |

- **Tables:** `src/services/fantasyMetrics/xfp-tables-v1.json`, built by `scripts/build-xfp-tables.js` from
  2023–2025 play-by-play. Content SHA-256 `7a3012598ee9940b1113b11fa1068604734144d20a249ae5a07cab88e3f1e41a`.
- **Checks on 2026 weeks 1–5:**
  - play-by-play actual points equal nflverse `fantasy_points_ppr` on the checked player-weeks;
  - targets reconcile with nflverse player-week stats exactly;
  - season Fated Points against actual points: RB 0.98, WR 0.99, TE 1.06.
- **What it skips:** the §7 "beat the baseline" gate. That gate guards *predictive* use. These lines only
  describe what happened, so they are shown as evidence and never used to make the call. The backtest still
  runs before any predictive use.
- **Unknown league scoring** (ESPN and Yahoo today): the line says it is in PPR and that Omen hasn't verified
  the league's scoring.

## 4. Opportunity table

`football.nfl_player_weekly_opportunity` already exists and is empty. Each player-week row is filled from
play-by-play:

| Column | Rule |
|---|---|
| `carries`, `targets` | counted from the same plays as xFP |
| `red_zone_carries`, `red_zone_targets` | `yardline_100 ≤ 20` |
| `inside_10_touches`, `inside_5_touches` | carries + targets with `yardline_100 ≤ 10`; carries with `yardline_100 ≤ 5` (goal-line carries). These match `nflverseFacts.buildOpportunity`, which Codex Batch C uses to fill this table. |
| `end_zone_targets` | `air_yards ≥ yardline_100` |
| `deep_targets` | `air_yards ≥ 20` |
| `snaps`, `snap_share`, `routes` | **null** (snap rights open; routes have no licensed source) |
| `details` | `target_share`, `air_yards_share`, `wopr`, `racr` copied from the player-week row, plus xFP share of team |

`ingest_event_id` points at the play-by-play receipt the row was derived from.

**Reconciliation guard:** for each player-week, play-by-play targets and carries must equal the
`nfl_player_weekly_stats` values within ±1. Rows outside that are counted and reported. A run with more
than 1% of rows outside the tolerance fails before writing.

## 5. Role chart

For each team × position (QB, RB, WR, TE), rank players by **xFP share of the position group** over the
last 3 played weeks, with ties broken by opportunity share.

- **Metric `omen_role_rank`:** `value` = rank; `components` = shares, weeks used, games missed.
- **Role-change signal:** emitted when a player's 3-week share moves ≥ 10 percentage points against the
  prior 3 weeks, or his rank changes. Uses the existing `football-intelligence-signal.v1` shape, so the call
  and iOS can read it without new contracts.
- **Copy:** "usage-based role" or "role in this offense", never "depth chart". A player with fewer than 2 of
  the last 3 weeks played is marked `insufficient_evidence`.

## 6. Dynasty outlook (no cap data)

For season S, by team × position:

| Metric | Rule |
|---|---|
| `omen_dynasty_vacated_opportunity` | targets, carries, air yards and xFP in S−1 by players who are not on the team's week-1 roster in S (left, retired, released) |
| `omen_dynasty_room_age` | opportunity-weighted age of the position group on 1 September of S, from `birth_date`; flags a lead player at or past the v1 age line (RB 27, WR 30, TE 30, QB 35) |
| `omen_dynasty_draft_capital` | per player: `draft_year`, `draft_round`, `draft_pick`, years since draft; undrafted is explicit, not null |

The age lines and the vacated definition are v1 parameters stored on the run. They're starting points, not
claims; the backtest in §7 decides whether they stay.

## 7. Proof before shipping: the backtest

A metric ships only if it beats a simple baseline at predicting what happens next.

- **Test seasons:** 2023, 2024, 2025, each scored with lookup tables trained only on earlier seasons
  (e.g. 2016–2022 for 2023).
- **Weekly target:** a player's PPR points in week W+1.
- **Predictors compared:**
  - baseline = average actual PPR over weeks W−2..W
  - xFP = average xFP over the same weeks
  - blend = 0.5 × each
- **Measures:** mean absolute error and within-position Spearman rank correlation, per position, for players
  with ≥ 3 weeks played.
- **Ship gate:** xFP or the blend beats the baseline on MAE in at least 2 of the 3 test seasons for that
  position. A position that fails doesn't ship; the report says so.
- **Dynasty check:** do teams with more vacated opportunity see their returning or new players' xFP share
  rise in season S? A simple before-and-after table, reported as evidence, not as a gate.
- **Sanity checks:**
  - season xFP totals per position are within ±3% of actual totals (expected points should roughly add up);
  - known-row proof: one named player-week recomputed by hand from play rows.

Results go in `Direction/reviews/<date>-fantasy-metrics-backtest.md` for the founder to read before
Phase M2.

## 8. Phases

| Phase | What | Where | Approval |
|---|---|---|---|
| **M1** | Lookup-table builder, xFP / opportunity / role / dynasty calculators as pure functions, backtest report | local only; nflverse files downloaded to a temp dir; no database writes | this spec |
| **M2** | Metric-run writer into `football_metric_runs` / `_run_inputs` / `_values` and the opportunity table; run against omen-prod 2026 data | omen-prod warehouse | **separate founder yes** (production write) |
| **M3** | API read path: league xFP via `calculateContractScore`, role-change signals, evidence rows in the start/sit call | API server | separate founder yes (deploy) |
| **M4** | Historical runs after the 1999+ backfill lands | omen-prod warehouse | separate founder yes |

## 9. Constraints and open items

- **Warehouse stays as it is.** v1 writes only to tables that already exist and adds no `rights_basis`
  value. No migration.
- **`players.csv` terms receipt.** The 2026-09-25 inventory marks `players` as conditional. Draft capital
  and age depend on it. The receipt must be recorded before M3 shows those metrics to users.
- **Copy rules** (`Direction/facts-of-record.md` facts 16–21):
  - xFP is shown as points and described as "what his usage is usually worth", never as a prediction or a
    guarantee;
  - confidence stays a band, never a percentage;
  - rows claiming Omen predicts or beats a provider are dropped by `evidenceWhy`, and these metrics must not
    try.
- **Mobile untouched.** iOS reads existing signal and evidence shapes; no app build is required for M3.

## 10. Files (M1)

| File | Purpose |
|---|---|
| `src/services/footballMetrics/xfpModel.js` | bucket rules and lookup-table builder (pure) |
| `src/services/footballMetrics/expectedFantasyPoints.js` | per-play expectations and player-week rollup (pure) |
| `src/services/footballMetrics/opportunity.js` | opportunity rows and reconciliation guard (pure) |
| `src/services/footballMetrics/roleChart.js` | role ranks and role-change signals (pure) |
| `src/services/footballMetrics/dynastyOutlook.js` | vacated opportunity, room age, draft capital (pure) |
| `scripts/football-metrics-backtest.js` | downloads admitted files to a temp dir, builds tables, runs §7, writes the report |
| `test/footballMetrics*.test.js` | fixtures per module: bucket edges, null fallbacks, bonus-rule exclusion, reconciliation failure, role ties, vacated players, undrafted players |

Skills: `slops-tdd` (per the map's football-data route), `slops-code-review` before the PR.
