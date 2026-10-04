# Omen nflverse weekly stats ingest v1

**Status:** Spec for review. No job code is written; the table is redo step 14 (`sql/2026-10-01-redo/14_nflverse_weekly_stats.up.sql`, not applied).
**Writes:** `public.nflverse_weekly_stats` and one `data_events` row per run.
**Schedule:** weekly, Tuesday or Wednesday, after the week's games are final.

## What it does

Pulls nflverse's weekly player stats and snap counts, resolves every row to a canonical `players.id`, and upserts one row per player-week. Server-only (service_role); no client reads it.

## Sources (public, no key)

| Source | Gives | Key |
|---|---|---|
| nflverse weekly player stats CSV (`nflverse-data` release `player_stats`, one file per season; same source as `omen-nflverse-tuesday-scoring-ingest-v1.md`) | passing, rushing and receiving lines, `fantasy_points_ppr` | nflverse `player_id` (the NFL game-stats id, gsis) |
| nflverse snap counts CSV (one file per season) | offensive snaps and share | PFR player id |
| nflverse `players.csv` (already read by the step-04 crosswalk job and by `playerUsage.js`) | PFR id to gsis id | `pfr_id` |

Confirm the current release asset names and column headers at build time; nflverse has renamed stat columns before. The job reads columns by name, and a missing required column fails the run before any write.

## Identity: the step-04 crosswalk, never a guess

- Stats rows join on gsis id through `player_provider_ids` (`provider = 'nflverse'`, `provider_player_id` = gsis id) to `players.id` (`omen:player:gsis.<gsis_id>`).
- Snap rows go PFR id, then gsis id (`players.csv`), then the same crosswalk.
- A row with no match is **skipped and logged** (provider, provider id, name, season, week, reason). It is not matched by name, position or team. This is the step-04 rule: a player the crosswalk cannot resolve stays unresolved until the crosswalk job resolves them.
- The unmatched count goes in the run's `data_events.details`. A run where unmatched rows exceed a set share of rows fails closed with no write (threshold set at build time from the first real run).
- The job never creates `players` rows. A late-arriving rookie appears in the next run once the daily crosswalk job has added them.

## Mapping to `nflverse_weekly_stats`

| Column | Source column (verify at build) |
|---|---|
| `pass_yards`, `pass_tds`, `interceptions` | `passing_yards`, `passing_tds`, `passing_interceptions` |
| `rush_yards`, `rush_tds`, `carries` | `rushing_yards`, `rushing_tds`, `carries` |
| `targets`, `receptions`, `rec_yards`, `rec_tds` | `targets`, `receptions`, `receiving_yards`, `receiving_tds` |
| `snaps`, `snap_share` | snap counts `offense_snaps`, `offense_pct` (a fraction, 0 to 1) |
| `fantasy_points_ppr` | `fantasy_points_ppr` |

- Regular season and postseason weeks are both stored as published (`week` is the nflverse week number).
- Empty or non-numeric source values become NULL, never 0.
- A player with a stats row but no snap row (or the reverse) gets the columns that exist; the others stay NULL.

## Write path

1. Download the CSVs. Compute `source_ref` = `sha256:` plus the hex SHA-256 of the raw bytes (stats file, then snap file, then both hashed together in that order when two files are read, as `sourceRef(...)` in `playerCrosswalk.js` does).
2. Insert one `data_events` row first: `event = 'ingest'`, `subject = 'nflverse_weekly_stats'`, `provider = 'nflverse'`, `rights_basis = 'nflverse_open_data'`, `job = '<job name> v1'`, `source_ref`, `row_count` set after the write (or written once the count is known), `details` with the season, weeks covered, and unmatched count. The table's `ingest_event_id` is `NOT NULL`, so the batch is recorded before its rows.
3. Upsert rows in batches by `(player_id, season, week)`, setting `ingest_event_id` to this run's event, so each row names the batch that last wrote it.
4. Nothing is deleted. A player-week that disappears from nflverse stays as last written.

## Re-runs and missed runs

- Idempotent: the same input writes the same rows; re-running only moves `ingest_event_id` to the newer run.
- nflverse corrects past weeks; each run covers **the whole current season** (all weeks to date), so a corrected earlier week is picked up and a missed run is caught by the next one. At season start, also read the previous season once.
- A failed run leaves the rows it had written, and the next run completes them. Because the event row is written first, a failed run's event can show a `row_count` below its intent; the next run is the record of completion.
- If nflverse is unreachable or a required column is missing, the run fails with no partial write beyond a batch already committed, and logs it.

## Safety

- Public data under MIT/CC terms already accepted for nflverse in this repo; no account, key or paid provider. No secrets in code or logs; the job uses the server's existing service-role client, like the crosswalk job.
- No user data is read or written.
- The job is not wired into any route until the founder approves it. The table is applied to production only as its own founder-approved step (facts-of-record #8: approval, rehearsal, verification, production).

## Done when

- Fixture tests: CSV mapping and NULL handling, snap join through `pfr_id`, an unmatched player skipped and counted (never name-matched), the `data_events` row shape, and re-run idempotency.
- A scratch run against redo step 14 writes rows, a second run changes only `ingest_event_id`.
