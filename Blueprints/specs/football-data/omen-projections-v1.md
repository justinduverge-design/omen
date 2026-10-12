# Omen projections v1 — Omen's own weekly stat-line projection, how it is served beside the provider's, and how it is proven

**Status:** Proposed. Code is offline and pure (`src/services/omenProjections/`); nothing is wired, nothing is deployed, no
migration is applied anywhere. The table in section 8 is a design only.
**Date:** 2026-10-12
**Founder decisions this follows:**
- 2026-10-11: projections are accepted with rights risk, stored, used only inside the product (`Direction/decision_log.md`).
- 2026-10-12: Omen computes its own projection for every player in every league. Refinement (later 2026-10-12): the league
  **provider's own projection leads for that league** (ESPN's for ESPN, Sleeper's for Sleeper); where the provider exposes none
  (Yahoo) **Omen's leads**; Omen's is shown **beside** the provider's, and a large disagreement becomes a `challenger` evidence row.
  (Those 2026-10-12 entries are not on `main` at the time of writing; this spec records the rule so the log entry can point here.)
**Depends on:** `omen-fantasy-metrics-v1.md` (opportunity counts, xFP), `omen-trend-evidence-v1.md` (shrinkage honesty),
`omen-rat-qb-v0.md` (the same style of unfitted, shrunk, flagged metric), `omen-stat-registry-v1.md` (`OUT-01`, `OUT-02`),
`omen-decision-drivers-v1.md` (evidence roles), `infra/warehouse/projections.md` (the stored Sleeper feed, PR #649).

## 1. What a projection is

For one player, one season, one week: a **projected stat line in nflverse stat keys**, never a points total.

```text
attempts, completions, passing_yards, passing_tds, passing_interceptions,
carries, rushing_yards, rushing_tds,
targets, receptions, receiving_yards, receiving_tds,
fumbles_lost   (= sack + rushing + receiving fumbles lost)
```

Values are expected counts (fractions are expected values, not "he will score 0.4 TDs"). Points are made at read time by
applying a league's scoring contract with the existing engine (`scoringContract.calculateContractScore`, via
`omenProjections/scoring.js`). `toSleeperStatLine` renders an Omen line in Sleeper's key names so every consumer of a Sleeper
stat line (`yahooProjections.scoreStatLine`, optimizer, Omen call) can score an Omen projection unchanged.

Scope v1: QB, RB, WR, TE. Kickers and team defences return `supported: false` and no line (never an invented one). Two-point
conversions and return touchdowns are not modelled. Threshold-bonus rules (+3 at 100 yards) cannot be applied honestly to an
expected value, so a league with such rules gets the same `bonus_rules_excluded` statement as xFP (`omen-fantasy-metrics-v1.md` 3.4).

## 2. Rights basis

Inputs are nflverse only (CC BY 4.0, already admitted): player weekly stats, the opportunity table derived from play-by-play,
schedules (`nfl_games`, including the betting lines nflverse publishes), team ids. **Excluded:** FTN charting (CC BY-SA
share-alike), snap counts and routes (rights review open: the opportunity table keeps them null and `pgSource.js` never selects
them), contracts, and any provider projection as an *input* (the Sleeper feed is a benchmark and a fallback only, never fed into
Omen's number). Output carries `rights_basis = nflverse_open_data`; every surface that shows it credits nflverse.

## 3. Inputs

For a target (season S, week W) the function receives only facts that exist before W:

| Input | Source | Notes |
|---|---|---|
| Player history | `nfl_player_weekly_stats` (+ `stats` jsonb), games already played | up to 24 most recent games, any season; rows at or after (S, W) are ignored and counted (`ignored_future_rows`) |
| Opportunity detail | `nfl_player_weekly_opportunity` (red-zone carries/targets) | optional per row; absent means no red-zone adjustment and a `no_red_zone_detail` flag |
| Team game context | `nfl_games.spread_line`, `total_line` | implied team points: home = (total + spread) / 2, away = (total - spread) / 2 (nflverse spread is from the home side, positive = home favoured). Closing lines are public before kickoff; the weekly projection is rebuilt as lines move |
| Schedule | `nfl_games` | bye = no game for the team that week |
| Status | Omen's own availability status (injury/designation, from the provider roster or a future Omen source) | not in the warehouse historically, so it cannot be backtested |
| Priors | pooled position rates from **earlier seasons only** | `buildPriors`; judgment defaults only when no training rows exist |

## 4. Method v1 (`omen-proj-v1`)

Deliberately simple, every constant in `constants.js`, none fitted. A change to any constant is a new method version.

1. **History weights.** For the player's games, most recent first, game index `i`: volume weight `0.5^(i/4)`, efficiency weight
   `0.5^(i/12)`, each multiplied by `0.6` per season of distance (this season weighs more than last). Volume reacts fast;
   efficiency is nearly flat because it is mostly noise.
2. **Volume per game played** (QB: pass attempts and carries; RB: carries and targets; WR/TE: targets and carries):
   `(sum w*v + 2 * position_mean) / (n_eff + 2)`, where `n_eff` is the sum of volume weights (two pseudo-games of shrinkage).
   With no history, the position's **debut** volume (mean of players' first games in earlier seasons).
3. **Efficiency per opportunity**, regressed to the position with explicit pseudo-opportunities
   `rate = (sum w*stat + k * prior) / (sum w*opps + k)`:

   | Rate | k |
   |---|---:|
   | rushing yards per carry | 100 |
   | rushing TD per carry | 150 |
   | catch rate (receptions per target) | 60 |
   | receiving yards per target | 80 |
   | receiving TD per target | 200 |
   | completions per attempt | 250 |
   | passing yards per attempt | 300 |
   | passing TD per attempt | 500 |
   | interceptions per attempt | 500 |
   | fumbles lost per touch | 400 |

4. **Red-zone work sets the touchdown prior.** A player's red-zone share of his carries (targets) against the position's,
   itself shrunk (30 carries / 20 targets), clipped to 0.5x-2x, multiplies the position TD prior before it is regressed.
5. **Team-level volume from the game environment (where the data exists).** `r = this game's implied team points / the
   team's own weighted recent implied points` (league mean when the player has none). Volume x `clamp(1 + 0.35 (r - 1), 0.9, 1.1)`;
   touchdown rates x `clamp(1 + 1.0 (r - 1), 0.8, 1.25)`. No lines: no adjustment and a `no_game_context` flag. Game script
   (favourites run more) is not modelled in v1. The backtest reports the model with and without this step (`model_no_context`)
   and the step is removed if it does not help.
6. **Opponent adjustment: not in v1.** The warehouse has the data to build "points allowed over expected" (`MCH-02`), but it is
   not evidence-backed yet. It enters in v1.1 only if the backtest shows a gain.
7. **Bye weeks and availability, by Omen's rules, never invented.** A bye is an empty line (`bye_week`). OUT, IR, PUP, NFI,
   suspended, reserved: empty line (`status_out`). DOUBTFUL scales the line by 0.15, QUESTIONABLE by 0.85 and each lowers the
   band one step. No status on file: the line is not scaled and `inputs.status = "unknown"`. These numbers are judgment and are
   not backtestable (no historical injury data); they are conservative on purpose.
8. **Rookies and thin samples are flagged, not dressed up.** No history: debut prior, flag `rookie` or `no_history`, band `low`.
   Fewer than three games: `thin_sample`. A gap of four or more missed weeks: `returning_from_absence` (band down one). A team
   change: `team_changed` (band down one).

Expected stat line = volume x efficiency x play probability.

## 5. Output contract and provenance

```json
{
  "method_version": "omen-proj-v1",
  "player_id": "omen:player:...", "position": "WR", "season": 2026, "week": 6,
  "supported": true,
  "stat_line": { "targets": 8.1, "receptions": 5.3, "receiving_yards": 66.4, "...": 0 },
  "availability": { "state": "unknown|active|questionable|doubtful|out|bye", "play_probability": 1 },
  "confidence": { "band": "low|medium|high|null", "basis": "sample|rule", "reasons": ["deep_sample"] },
  "flags": ["no_red_zone_detail"],
  "sample": { "games_used": 12, "effective_games": 6.1, "last_game": {"season": 2026, "week": 5}, "weeks_missed_since_last_game": 0 },
  "components": { "volume_per_game_if_active": {}, "rates": {}, "red_zone_ratio": {}, "environment": {} },
  "inputs": { "as_of": "ISO time", "history_rows_used": 12, "history_through": {"season": 2026, "week": 5},
              "ignored_future_rows": 0, "priors_version": "trained:...", "game_context": "applied_vs_team_recent",
              "red_zone_detail": "used", "status": "unknown|known" }
}
```

- **Confidence is a band (`low`, `medium`, `high`), never a percentage.** Bands come from effective games (under 2 = low,
  under 4 = medium, 4 or more = high) then drop for absence, team change or a questionable/doubtful status. Bye and out lines
  carry `band: null, basis: "rule"` (they are rules, not estimates).
- `stat_line` holds only counts. There is no `points` anywhere in the contract.
- `inputs` is the provenance: method version, the data as-of, what history was used, what was missing.

## 6. Serving: who leads in which league

Omen's projection is **computed for every player in every league and shown beside the provider's**. Which one *leads* (is the
number the call uses and the headline shows) depends on the provider:

| League provider | Leads | Beside it | Fallback order for the lead | Labels |
|---|---|---|---|---|
| Sleeper | Sleeper projection (stored, #649, else live) | Omen projection | stored Sleeper -> live Sleeper -> Omen | "Sleeper projection", "Omen projection" |
| ESPN | ESPN's own projection (the roster's `appliedTotal`, already in the league's scoring) | Omen projection | ESPN -> Omen | "ESPN projection", "Omen projection" |
| Yahoo (no per-player projection) | Omen projection | none (the Sleeper feed scored in Yahoo's rules, #645, is the fallback and a benchmark, not shown as a second opinion) | Omen -> Sleeper stat line scored in the league's rules -> "cannot rank" | "Omen projection"; fallback "Projection (Sleeper feed, your league's scoring)" |

Rules:
- **Honest labels.** A number is always labelled with its source. A fallback is labelled as the fallback; Omen never presents a
  provider's number as its own or the reverse.
- **Provider missing for a player** (rookie not yet in the feed, unmatched id, bye gap): Omen leads for that player and says so.
- **Omen unavailable for a player** (`supported: false`, no row): the provider leads alone, no "beside" value.
- **Scoring.** Both numbers are in the league's scoring: the provider's native points for ESPN, stat line x league rules for
  Sleeper (#645 path), Omen stat line x league rules for Omen.
- **Yahoo gate.** Omen leads Yahoo only for positions where the backtest (section 9) says it beats the naive baselines; otherwise
  Yahoo falls back to the Sleeper-feed score and the label says so. The same gate applies to the "beside" display (never show a
  number the backtest says is worse than a naive average without that caveat).
- **Kill switch.** `FOOTBALL_PROJECTIONS_DISABLED=1` stops stored provider reads (rights); a separate `OMEN_PROJECTIONS_DISABLED=1`
  (to be added at wiring) stops Omen's. Neither blocks the other.

### Read path (design, not built)

`servingProjection({ provider, player, scoring })` returns `{ lead: {source, label, points, stat_line?}, beside: {...}|null,
challenger: {...}|null }`. Omen's number is read from `football.omen_player_weekly_projections` (section 8) by `(season, week,
player_id)`; if the stored row is missing or stale for that week, the pure function is run on the fly from warehouse facts
(cheap: one player's history), so a missing batch never blanks the screen. The Sleeper read goes through the existing
`storedProjections.js` gates. Neither path writes.

## 7. The disagreement signal: the `challenger` evidence row

When Omen and the lead provider disagree by more than the model's own error, say so, with real numbers.

**Condition (all must hold):**
1. Both numbers exist in the league's scoring and the provider leads for that player.
2. `|omen - provider| > threshold(position, scoring family)`. The threshold is the model's own **MAE on that position** from the
   backtest on earlier seasons (so "outside the model's error band"), kept in a small versioned table by position and scoring
   family (standard / half-PPR / PPR; a league maps to the nearest family by its reception value). Until a backtest has run there
   is no table and no row is emitted.
3. Omen's band is `medium` or `high`, the player is not a rookie/no-history, not out/bye.
4. At least one real fact explains the gap (below). A gap with no fact is not shown.

**Content** (`omenProjections/challenger.js`, pure, tested): `role: "challenger"`, `provider_label`, `provider_points`,
`omen_label: "Omen projection"`, `omen_points`, `gap_points`, `direction`, `threshold_points`, `confidence` (Omen's band), up to
three `facts`, the backtest `track_record`, `method_version`.

**Facts, from real numbers only:**
- Provider gives a stat line (Sleeper): the stats whose scored difference between the two lines is largest
  (`stat_difference`: "targets/receptions/rushing yards ... Omen 5.3, Sleeper 3.0, +1.6 points").
- Provider gives points only (ESPN): Omen's own inputs against what the player actually did, e.g. `usage` (projected vs his last
  three games' carries or targets), `red_zone` (his red-zone share relative to the position) and `environment` (this week's
  implied team points vs his recent games), each only when it moves by a stated minimum.

**Weight.** `strong` at 2x the threshold or more, `moderate` at 1.5x, else `slight`, **but only when the backtest record supports
it**: weight is capped at `slight` unless the backtest shows (at least 100 over-threshold paired player-weeks for that position)
that Omen was closer more often than not. This is the evidence that makes the row trustworthy (section 9, "who was closer").

**Plug-in to the decision-drivers model (proposed addition to `omen-decision-drivers-v1.md`).** Add role `challenger` to the
role table: *the second opinion: Omen's own projection differs from the league provider's by more than Omen's error band.*
It is not `primary` (the provider's number remains the projection gap that decides, per the serving rule) and not `caveat` (it
is not a limitation). Display: after `primary`/`supporting`, before the single `caveat`; at most one challenger row per decision
(the one with the largest weighted gap among the players in the swap). It never changes which move is recommended on its own:
only a provider-lead change (Omen leads because the provider is missing) does. Copy follows `Direction/facts-of-record.md`
facts 16-21: it describes ("Omen's own projection is 4.1 higher than ESPN's, driven by ..."), never claims Omen predicts or
beats the provider, and confidence stays a band.

## 8. Warehouse table (design only, no migration applied)

Additive, sits beside the #649 tables, separate migration (next number after 0006). Omen's own output on open data, so
`rights_basis` is the nflverse value and the provider tables are untouched.

```sql
create table football.omen_player_weekly_projections (
  season            integer not null check (season between 1999 and 2100),
  week              integer not null check (week between 1 and 23),
  player_id         text not null references football.football_players(player_id) on delete restrict,
  method_version    text not null check (method_version ~ '^omen-proj-v[0-9]+$'),
  team_id           text references football.football_teams(team_id) on delete restrict,
  stat_line         jsonb not null check (jsonb_typeof(stat_line) = 'object'),        -- nflverse keys, counts only
  availability      text not null check (availability in ('unknown','active','questionable','doubtful','out','bye')),
  play_probability  numeric not null check (play_probability between 0 and 1),
  confidence_band   text check (confidence_band in ('low','medium','high')),          -- null for bye/out (rule lines)
  flags             text[] not null default '{}',
  games_used        integer not null check (games_used >= 0),
  effective_games   numeric not null check (effective_games >= 0),
  inputs            jsonb not null check (jsonb_typeof(inputs) = 'object'),           -- the provenance block, section 5
  inputs_as_of      timestamptz not null,                                              -- newest fact used (ingest finish time)
  computed_at       timestamptz not null default clock_timestamp(),
  content_hash      text not null check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  primary key (season, week, player_id, method_version)
);
create index omen_player_weekly_projections_week on football.omen_player_weekly_projections (season, week, method_version);
```

Notes: no `points` column; a new `method_version` is a new row set (old versions stay for the backtest and for comparison); a
writer batch is one transaction per (season, week, method_version), idempotent on `content_hash`, run after the nflverse
facts and derived stages in `currentSeasonCommand.js`, with `inputs_as_of` taken from the ingest events it read (so a stale
fact base is visible). Role grants mirror `omen_warehouse_reader` SELECT only. Rollback is `drop table`. Nothing depends on it:
the read path recomputes on a miss.

## 9. The backtest

`src/services/omenProjections/backtest.js` (pure over a source), `pgSource.js` (read-only SQL), `scripts/omen-projections-backtest.js`.

**Method.** Walk week by week through the test seasons. For each player who then played, project from facts strictly before
that week and compare with the stat line that happened. Leakage is prevented by construction and tested
(`test/omenProjectionsBacktest.test.js`): a player's history is appended only after every projection of the week is made;
priors are rebuilt each season from earlier seasons only; interval widths are learned from earlier weeks' residuals only. The
test changes the data at and after a week (and the whole test season) and asserts nothing projected earlier moves.

**Predictors compared:** `model`, `model_no_context` (ablation of the game-environment step), `last3` (mean points of the last
three games played), `season_avg` (this season's games so far, else last season's), and `sleeper` (stored provider projections
from `football.player_weekly_projections`, only where present, `--sleeper`).

**Metrics** (per position, for standard, half-PPR and PPR points, over two universes: `relevant` = trailing-3-game PPR average
>= 5 before the week, independent of the model; `all` = everyone who played):
MAE, RMSE, bias; mean within-week Spearman rank correlation of projected vs actual points among a position's players (weeks
with at least 8); a paired comparison of absolute error against each other predictor with a **player-clustered** standard
error and a verdict (`a_better`, `b_better`, `no_clear_difference`); MAE by season; MAE by experience bucket (debut / 1-3
prior games / 4+); **calibration of the bands**: MAE and relative MAE per band, whether error rises as confidence falls, and the
share of outcomes inside an 80% interval built from earlier residuals (target about 0.80).

**Who was closer where Omen and the provider disagree most** (requires `--sleeper`; the Sleeper stored feed is the only
provider benchmark in the warehouse): for the paired player-weeks, gap = Omen - provider; groups: over the threshold (the model's
MAE on that set), over the threshold with Omen higher / lower, and deciles of absolute gap (decile 1 = the largest). Each reports
n, mean gap, Omen MAE, provider MAE, the share of decided cases where Omen was closer, and the paired verdict. This table sets the
challenger weight cap (section 7). ESPN's projection is not in the warehouse, so ESPN gets no such evidence until it is stored;
the challenger row on ESPN leagues stays at `slight` until then.

**Ship rule.** Omen leads (Yahoo, or as the fallback) for a position only if, in the `relevant` universe on PPR points, the paired
verdict against both `last3` and `season_avg` is `a_better` in at least two of three test seasons. `no_clear_difference` is not a
pass. A position that fails keeps the Sleeper-feed fallback and the report says so.

### Exact read-only command (founder's agent, on a restored warehouse copy)

Put a postgres URL for the `omen_warehouse_reader` role in a 0600 file (never pass it on the command line or paste it into a
log), then:

```bash
# from the repo root; the URL file is a single line: postgres://omen_warehouse_reader:...@HOST:5432/omen_football
chmod 600 /abs/path/reader.url
node scripts/omen-projections-backtest.js \
  --url-file /abs/path/reader.url \
  --seasons 2023-2025 --warmup 3 --sleeper \
  --out-dir /abs/path/backtest-out
# or, against a local restore reachable by unix socket (user postgres, database omen_football):
node scripts/omen-projections-backtest.js --socket /path/to/pg/socket --seasons 2023-2025 --warmup 3 --sleeper --out-dir /abs/path/backtest-out
```

The pool is started with `-c default_transaction_read_only=on -c statement_timeout=300000` and the script refuses to run unless
`SHOW transaction_read_only` returns `on`. Every statement is a `SELECT` against `football.*` (stats, opportunity, players,
teams, games, and the stored Sleeper projections). Output: `omen-projections-backtest.json` and `.md` in `--out-dir`. Warm-up
seasons supply history and priors only and are not scored; use at least 2 (3 gives priors from three full seasons for 2023).
Expect on the order of 1,000-1,500 relevant player-weeks per position per season, and a few minutes of runtime.
`--sleeper` returns no rows for historical seasons unless projections were stored for them (the stage only fetches the current
week and the next two), so the disagreement table will usually cover only the live season until history is accumulated; the
report says "requested but none available" rather than failing.

## 10. Limits that are not resolved here

1. **Never run on real data.** Everything is proven on synthetic worlds; whether the model beats the naive baselines is the
   open question the backtest answers. The constants are judgment values until then.
2. **No historical injury or inactive data** in the warehouse: the backtest scores only players who played, so every predictor
   is conditional on playing, and the status rule cannot be validated.
3. **Betting lines are closing lines.** They are public before kickoff, but the line moves; the live read must use the line as of
   the projection time. The environment step is an ablation, not an assumption.
4. **Provider benchmark is thin.** Only the stored Sleeper feed (live season, last-confirmed fetch, which for finished weeks may
   be the final pre-game fetch but is not a guaranteed pre-kickoff snapshot); the history table is not readable by the reader
   role. ESPN's and Yahoo's numbers are not stored.
5. **Early-season opportunity detail may be absent** for some seasons (the 2003 reconciliation refusal); those rows carry no
   red-zone adjustment.
6. **No game script, no opponent adjustment, no rookie draft-capital prior** in v1. Rookies get the debut prior and a `low` band.
7. **Challenger threshold table** needs a first backtest to exist; scoring-family mapping (nearest reception value) is a
   simplification for leagues with unusual rules.
8. **Not yet in the stat registry.** `OUT-02` ("Omen's Read") and this spec overlap; the registry entry should point here.

## 11. Files

| File | Purpose |
|---|---|
| `src/services/omenProjections/constants.js` | every constant, method version |
| `src/services/omenProjections/priors.js` | default and trained position priors (pure) |
| `src/services/omenProjections/projectPlayerWeek.js` | the pure projection function |
| `src/services/omenProjections/scoring.js` | score stat lines with any contract; Sleeper key conversion both ways |
| `src/services/omenProjections/challenger.js` | the `challenger` evidence row (pure) |
| `src/services/omenProjections/backtest.js` | walk-forward harness, metrics, calibration, disagreement, markdown report |
| `src/services/omenProjections/pgSource.js` | read-only SQL source |
| `scripts/omen-projections-backtest.js` | the runnable script |
| `test/omenProjections*.test.js` | function, harness (leakage, metrics, synthetic world), challenger and disagreement tests |

Skills: `slops-tdd`, `slops-code-review` before merge. Wiring (writer stage, read path, kill switch, contract fields) is a
separate approved item; `decisionBriefV2.js` and the other protected files are untouched by this one.
