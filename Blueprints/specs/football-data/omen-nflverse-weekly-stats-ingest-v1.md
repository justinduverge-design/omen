# Omen nflverse weekly stats ingest v1

**Status:** Job written: `src/omen_nflverse_weekly_stats_cron.js` (tests `test/nflverseWeeklyStats.test.js`). The table is redo step 14 (`sql/2026-10-01-redo/14_nflverse_weekly_stats.up.sql`), not applied to production; until it is, the job exits without writing anything, including no `data_events` row.
**Writes:** `public.nflverse_weekly_stats` and one `data_events` row per run.
**Schedule:** 05:00 ET every day (`Dockerfile.cron`), an hour before Tuesday scoring at 06:00, so Thursday, Saturday, Sunday and Monday games all land the next morning. A run whose source files are byte-identical to the last ingest's (same `source_ref`) writes nothing, not even a `data_events` row, so off-season days cost three downloads. First production run 2026-10-04 (founder-approved): 3,968 player-weeks, weeks 1-4, 10 unmatched skipped.

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

- Stats rows join on gsis id to `players.gsis_id` (unique; ids are `omen:player:gsis.<gsis_id>`). The step-04 crosswalk job stores nflverse's id there; it writes no `player_provider_ids` rows with `provider = 'nflverse'`. Production players hold every position, linemen included.
- Snap rows go PFR id, then gsis id (`players.csv`), then the same crosswalk.
- A row with no match is **skipped and logged** (provider, provider id, name, season, week, reason). It is not matched by name, position or team. This is the step-04 rule: a player the crosswalk cannot resolve stays unresolved until the crosswalk job resolves them.
- The unmatched count goes in the run's `data_events.details`. A run where more than 5% of source rows are unmatched fails closed with no write. Measured 2026-10-04 against the production crosswalk: 1,434 of 1,434 stats players and 697 of 697 offensive-snap players resolve; 2 snap players have no gsis id in nflverse `players.csv`.
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
- Snap rows with zero offensive snaps (defenders, special teams) are not stored: there is nothing offensive in them.
- At the season's first two weeks the run also re-reads the previous season.

## Write path

1. Download the CSVs. Compute `source_ref` = `sha256:` plus the hex SHA-256 of the raw bytes (stats file, then snap file, then both hashed together in that order when two files are read, as `sourceRef(...)` in `playerCrosswalk.js` does).
2. Insert one `data_events` row before any stats row: `event = 'ingest'`, `subject = 'nflverse_weekly_stats'`, `provider = 'nflverse'`, `rights_basis = 'nflverse_open_data'`, `job = '<job name> v1'`, `source_ref`, and `row_count`, with `details` carrying the season, weeks covered, and unmatched count. `data_events` is append-only (step 06's `compartment_append_only` trigger) and `row_count` is `NOT NULL`, so the event is never updated: the job parses the CSV and resolves players in memory first, counts the rows it will write, then inserts the event once with that final count. The table's `ingest_event_id` is `NOT NULL`, so the event exists before its rows.
3. Upsert rows in batches by `(player_id, season, week)`, setting `ingest_event_id` to this run's event, so each row names the batch that last wrote it.
4. Nothing is deleted. A player-week that disappears from nflverse stays as last written.

## Re-runs and missed runs

- Idempotent: the same input writes the same rows; re-running only moves `ingest_event_id` to the newer run.
- nflverse corrects past weeks; each run covers **the whole current season** (all weeks to date), so a corrected earlier week is picked up and a missed run is caught by the next one. At season start, also read the previous season once.
- A failed run leaves the rows it had written, and the next run completes them. A run that fails before the event insert leaves no event. A run that fails partway through the batches leaves an event whose `row_count` is the planned figure, not the rows written; the next run is the record of completion.
- If nflverse is unreachable or a required column is missing, the run fails with no partial write beyond a batch already committed, and logs it.

## Safety

- Public data under MIT/CC terms already accepted for nflverse in this repo; no account, key or paid provider. No secrets in code or logs; the job uses the server's existing service-role client, like the crosswalk job.
- No user data is read or written.
- The job is not wired into any route until the founder approves it. The table is applied to production only as its own founder-approved step (facts-of-record #8: approval, rehearsal, verification, production).

## Done when

- Fixture tests: CSV mapping and NULL handling, snap join through `pfr_id`, an unmatched player skipped and counted (never name-matched), the `data_events` row shape, and re-run idempotency.
- A scratch run against redo step 14 writes rows, a second run changes only `ingest_event_id`.

## Step 15: the full record (2026-10-04)

Founder direction: finish the nflverse ingestion. Step 14 stored 14 of ~190 player-week columns; step 15
(`sql/2026-10-01-redo/15_nflverse_full_lines.up.sql`) stores the rest and three more tables. Builders:
`src/services/nflverseFacts.js`; the same daily job runs every subject.

| Table | Source (nflverse family) | What it holds |
|---|---|---|
| `nflverse_weekly_stats` (+ `team`, `opponent`, `game_id`, `season_type`, `position`, `stats`, `opportunity`) | `stats_player` week file, `pbp` | the full numeric stat line, sparse jsonb (kickers by distance, defense, returns, 2-pt, fumbles, air yards, EPA, target/air-yards share, WOPR); red-zone, inside-10, goal-line, end-zone and deep usage from play-by-play |
| `nflverse_team_weekly_stats` | `stats_team` week file, `schedules` | the team's full stat line plus points for and against (team-defense scoring) |
| `nflverse_games` | `schedules` | every game, played or scheduled: score, spread and total lines, moneylines, roof, surface, weather, rest, division game |
| `nflverse_weekly_rosters` | `rosters` (weekly) | each player on each team each week: roster status, listed position, jersey |

- **Subjects:** each table is its own `data_events` subject with its own unchanged-source skip and unmatched limit (5%; rosters 15%, since practice-squad players the crosswalk lacks are skipped and counted). One table failing does not block the others; the run fails at the end.
- **Storage budget** (free plan, 500 MB database): stat lines, team weeks and games from 2021, the first 17-game season (about 9 MB a season); rosters for the current and previous season only (about 10 MB each). Measured on scratch with real data: 2021-2026 is 71 MB. The player crosswalk window moved from "last two seasons" to 2021 to match (5,962 players).
- **Backfill:** `node src/omen_nflverse_weekly_stats_cron.js --seasons 2021-2025`, one process per season in production (a single season peaks near 650 MB; the cron container has 1 GB).
- **Before step 15 is applied** the job stays in step-14 mode: typed columns only, no new tables touched.
- **Not stored, and not to be added without a new rights decision:** Next Gen Stats (NFL), PFR advanced stats (Sports Reference), ESPN QBR and depth charts (ESPN), contracts (OverTheCap). Open: the NFL injury report and ffopportunity (GPL-3) need founder decisions.
