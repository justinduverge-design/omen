# Omen RAT-QB v0 (QB Omen Grade, first warehouse metric run)

**Status:** Built, not wired. Nothing reads it: not VORP, not the decision engine, not the app. The ingest entrypoint does not call it yet.
**Registry:** `RAT-QB` in `omen-stat-registry-v1.md` §3 (the registry's "Omen QB value v0" note). This is the v0 slice of that definition.
**Stored as:** `metric_name = omen_qb_grade`, `formula_version = v0`, in `football.football_metric_runs`, `football_metric_run_inputs`, `football_metric_values`.
**Code:** `src/services/footballWarehouse/ratQbMetric.js` (pure math), `ratQbRun.js` (reads the warehouse), `metricRunWriter.js` (generic run writer).
**Tests:** `test/footballWarehouseRatQb.test.js` (math), `warehouse/test/rat-qb-metric-run-integration.js` via `warehouse/test/run-rat-qb-metric-run.sh` (real Postgres 17).
**Report:** `scripts/rat-qb-face-validity.js` prints the stored top and bottom 10.

## What v0 is, and is not

- **Unfitted.** Weights are equal and fixed. Shrinkage constants are documented judgment values (below), not fitted to history. Every run row and every value says `fitted: false`.
- **No opponent adjustment.** A QB who faced soft defences is not corrected. The registry's final RAT-QB is opponent-adjusted; v0 is not, and says so on every row (`opponent_adjusted: false`).
- **Open data only.** Inputs are nflverse play-by-play already in `football.nfl_plays` (`rights_basis = nflverse_open_data`). FTN is never loaded into the warehouse.
- **Efficiency, not volume** (registry 3.1). Volume is the role metric, not this one.

## Deviation from the registry: `turnover_rate`, not `is_interception_worthy`

The registry lists a "turnover-worthy play rate (`is_interception_worthy`)". That is an FTN charting field. FTN is not in the warehouse and cannot be. v0 uses the **actual** turnover rate from nflverse columns: interceptions plus fumbles lost by the QB, per dropback. The component is named `turnover_rate`. Actual turnovers are noisier than charted turnover-worthy plays (they include luck on drops, tipped balls and recoveries), which is why this component has the largest shrinkage constant. Also dropped from the registry list in v0: "performance against blitz and with QB out of pocket" (FTN fields). The deviation needs a `decision_log.md` entry (proposed text in the PR description).

## Scope of a run

- Season `S`, regular season only (`nfl_games.game_type = 'REG'`; playoff plays are ignored).
- `week = NULL`: the whole regular season in the warehouse. `week = N`: season to date through week `N` inclusive (plays with `week <= N`). Each is its own run row.
- Only plays with a non-null `epa`. Spikes (`qb_spike`) and kneels (`qb_kneel`) are excluded everywhere.
- Only players whose `football_position = 'QB'` and who have a `gsis_id`.

## Raw counts per QB

Read from `nfl_plays` columns and the `source_row` jsonb (nflverse names). A flag is true when it equals 1.

| Count | Definition |
|---|---|
| `dropbacks` | plays with `qb_dropback = 1` (passes, sacks, scrambles). Attributed to `passer_player_id`; a scramble with no passer is attributed to `rusher_player_id` |
| `epaSum` | sum of `epa` over those dropbacks |
| `sacks` | dropbacks with `sack = 1` |
| `cpoeN`, `cpoeSum` | dropbacks with `pass_attempt = 1` and non-null `cpoe` |
| `interceptions` | dropbacks with `interception = 1` |
| `fumblesLost` | dropbacks with `fumble_lost = 1` where `fumbled_1_player_id` equals the QB's own `gsis_id` (a receiver's fumble after the catch is not the QB's) |
| `rushes`, `rushEpaSum` | designed QB runs: `rush_attempt = 1`, `qb_scramble = 0`, `qb_dropback = 0`, rusher is the QB (scrambles are already inside dropbacks) |

## Components

| Key | Raw value | n (shrink weight) | Sign | Shrink k |
|---|---|---|---|---|
| `epa_per_dropback` | `epaSum / dropbacks` | dropbacks | + | 150 |
| `cpoe` | `cpoeSum / cpoeN` (nflverse CPOE units, percentage points) | cpoeN | + | 250 |
| `sack_avoidance_rate` | `1 - sacks / dropbacks` | dropbacks | + | 300 |
| `turnover_rate` | `(interceptions + fumblesLost) / dropbacks` | dropbacks | - (lower is better) | 500 |
| `rush_epa` | `rushEpaSum / rushes` | designed rushes | + | 100 |

The `k` values are rough noise-to-signal ratios (per-play variance divided by an assumed between-QB true variance), written down so they can be argued with. They are **unfitted v0 constants**; fitting them (and the weights) on 2016-2025 history is the work that makes v1.

## Formula (exact)

Let `Q` be the qualified QBs of the run (below). For each component `c`:

1. **Pooled prior** `mu_c = sum over Q of (component sum) / sum over Q of n`. For `epa_per_dropback`: total EPA over total dropbacks. For `sack_avoidance_rate`: total non-sack dropbacks over total dropbacks. For `cpoe`: total CPOE over total attempts with CPOE. For `rush_epa`: total rush EPA over total designed rushes.
2. **Shrink** `s_c = (n * raw + k_c * mu_c) / (n + k_c)`. A QB with `n = 0` (no designed rushes, no CPOE) gets `s_c = mu_c`: the cohort mean, never zero.
3. **Standardise across Q**: `z_c = (s_c - mean_Q(s_c)) / sd_Q(s_c)` (population sd; if sd < 1e-9, `z_c = 0`).
4. **Composite** `C = sum_c w_c * sign_c * z_c` with `w_c = 0.2` for all five components (equal, unfitted).
5. **Grade** `G = 50 + 10 * (C - mean_Q(C)) / sd_Q(C)` (population sd; if sd < 1e-9, `G = 50`), clamped to `[0, 100]`, rounded to six decimals. Step 5 re-standardises the composite because the average of imperfectly correlated z-scores has an sd below 1; without it "10 points = one sd" would be false.

So 50 is the average qualified QB of that run, and 10 points is one standard deviation of the composite across qualified QBs that season (before clamping).

## Qualification and the not-enough-snaps rule

- Qualified: `dropbacks >= 100` in the run's scope.
- Below 100: **no row is stored.** The UI/API reads "no value for this QB in this run" as "not enough snaps yet". The run's `parameters.summary.below_threshold_count` records how many were left out. No marker rows are stored, so a consumer cannot mistake a placeholder for a grade.
- Cohort floor: fewer than 8 qualified QBs means the 50/10 scale is meaningless, so the run **succeeds with zero values** and `summary.outcome` is `cohort_too_small` (or `no_qualified_entities` for zero). Early-season week runs will hit this: after week 1 nobody has 100 dropbacks.

## What is stored

`football_metric_values` row per qualified QB: `entity_type = player`, `entity_id = omen:player:...`, `value` = grade. `components` jsonb holds the counts, per-component `raw / shrunk / z / n / sign / weight`, `composite_z`, `unclamped_grade`, and the flags `fitted: false`, `opponent_adjusted: false`, so the grade can always be explained.

The run row's `parameters` hold the constants, the scope, the play count and (under `summary`) the cohort statistics. `football_metric_run_inputs` points at every PBP ingest event whose plays were read.

## Run behaviour

- Advisory lock per `(metric, version, season, week)` (week null included); the lock is what prevents duplicate null-week rows, because the table's unique constraint treats nulls as distinct.
- One transaction: row set to `running`, values written, row set to `succeeded`. On failure the transaction rolls back and a `failed` row with a safe error code is recorded; a failure never overwrites a previously `succeeded` run.
- **Idempotent:** a rerun whose input ingest events and base parameters equal the stored run returns `unchanged` and writes nothing. The base parameters include hashes of the QB crosswalk (`gsis_id` + `football_position`) and of the season's `nfl_games.game_type` values, so a crosswalk or schedule change recomputes. A re-ingest of play-by-play (new ingest event) recomputes into the same run row and repoints its inputs. A change to the constants changes `parameters` and recomputes. A change to the formula itself needs a new `formula_version`.
- No play-by-play for the season: fails with code `no_inputs`.

## Limits (state them so nobody over-reads a grade)

- Not opponent-adjusted; not fitted; not validated yet (next section).
- Plays whose passer, rusher or receiver is missing from the player crosswalk are dropped at ingest (counted as unmatched), so a QB's counts can be slightly low.
- `fumble_lost` credit relies on `fumbled_1_player_id`; a missing value means no fumble is charged.
- Turnover rate is actual, not charted; it carries luck.
- Garbage time, game script and receiver quality are not controlled for.
- Playoffs are excluded. Seasons before the warehouse holds PBP have no grades.
- It is a grade of passing-game efficiency; it is not a fantasy projection.

## Proof before shipping (registry 3.3): not done yet

Nothing below has been computed. The grade must not appear in the app until these pass or the grade ships labelled "beta".

1. **Year-over-year stability.** Correlation of grade `S` with grade `S+1` across QBs qualified in both seasons; target >= 0.4. Needs two or more seasons of PBP in the warehouse.
2. **Predictive value.** Grade in `S` should predict `S+1` EPA per dropback better than `S` raw EPA per dropback alone.
3. **Face validity.** Read the top and bottom 10 for the latest full season:

```bash
node scripts/rat-qb-face-validity.js --season 2025 --socket /path/to/pg/socket   # local
FOOTBALL_WAREHOUSE_DATABASE_URL_FILE=/abs/path node scripts/rat-qb-face-validity.js --season 2025
```

It only reads stored runs; if no run exists it says so. Producing the run is `createRatQbRunner({ pool }).run({ season: 2025 })` (not yet wired to the ingest entrypoint).

If stability fails, the fix is in v1 (fit weights and `k`, add opponent adjustment), not in tuning v0 until the table looks right.
