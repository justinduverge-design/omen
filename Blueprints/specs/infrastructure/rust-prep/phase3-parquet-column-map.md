# Phase 3 prep: nflverse Parquet column map

## Verified 2026-10-18 (on the founder's Mac, Polars 1.x)

- **Schemas read** for `pbp/play_by_play_2025.parquet` (372 columns) and `schedules/games.parquet` (46). The Parquet
  column order is identical to the CSV header, so `schema_fingerprint` can match. `play_id`, `success`,
  `two_point_attempt`, `yardline_100` and `air_yards` are Float64. `season`, `week` and scores are Int32.
- **Text parity is not achievable byte for byte, and doesn't need to be.** The CSV writer prints floats with its own
  15-significant-digit routine. Neither `%.15g` nor half-up decimal rounding reproduces it for every cell: 30,119 of
  18.1 M cells still differ in the 15th digit.
- **Value parity holds.** Across the 2025 season (48,771 plays), every float cell equals the CSV value within the CSV's
  own printed precision. The 203 boundary cases are values just above 1, off by a half unit in the 15th digit. Every
  column the SQL reads as text (`two_point_attempt`, `yardline_100`, `air_yards`, `season_type`, `play_id`, `success`)
  matches **exactly** when whole floats print without `.0` and -0 prints as `0`. Script: `scripts/research/parquet-parity/`.
- **Parity rule for the Polars path:** integer and text columns must be exactly equal. Float columns must be equal within
  15 significant digits. `source_row` floats may differ from the CSV in the last printed digit; no SQL reads those as text.
- **`kickoff_at` is filled** for every season from 2000 on (checked live). The 259 null rows are 1999 games, whose
  source rows have no game time. The TIMERS.md open item is closed.


Status: PREP. No code changed. Written 2026-10-17 from a read of `src/services/footballWarehouse/*`,
`src/services/nflverseFacts.js`, `infra/warehouse/docker-compose.yml` and `warehouse/test/*`.

## Summary

- The ingest pulls six nflverse CSV assets. All six have a Parquet twin in the same release. Verified 2026-10-17 by
  HEAD request (HTTP 200) for the 2024 season assets and the two global assets.
- The other sources (Sleeper players/injuries, Sleeper projections, DynastyProcess ids, Wikipedia coaching, Open-Meteo
  weather) are JSON or wiki text. They have no Parquet form and are out of scope for Phase 3.
- Every adapter stores the full raw CSV row as `source_row` (jsonb), with every value a string. That is the biggest
  parity risk. A Polars reader must stringify every cell the way the CSV prints it, or parity fails on every row.
- Every receipt hashes the raw bytes (`sourceRef`) and the header list (`schema_fingerprint`). Parquet bytes differ, so
  `sourceRef` will differ by design. Header order must match to keep `schema_fingerprint`.
- Play-by-play is the only large source. It is the reason for `NODE_OPTIONS=--max-old-space-size=3072`
  (`infra/warehouse/docker-compose.yml:56`).
- `kickoff_at`: the adapter now computes it (`kickoffInstantUtc` in `scheduleSource.js`) and the writer writes it.
  `infra/schedule/TIMERS.md:96` still calls it a gap. The likely remaining work is a backfill and a stale doc, not new code.
  Unverified against the live warehouse.

Parquet types in the tables below are **unverified expectations**. No Parquet reader (pyarrow, polars) was available
in this session to read the file schemas. Only the existence and size of each asset was checked. Read each schema
before building the reader.

## Shared behavior (all nflverse adapters)

- Parser: `parseStrictCsv` (RFC 4180, in `playerWeeklySource.js`). UTF-8 fatal decode. A leading BOM is stripped.
- Headers are trimmed. Empty or duplicate headers fail. Each adapter has a `REQUIRED_COLUMNS` list.
- Every row must have the header's field count. Fully empty rows fail (except in pbp, team weekly and rosters).
- Null rule: trimmed `""` or `NA` (any case) becomes null.
- Numbers: `Number(text)` and `Number.isFinite`. Integers also check `Number.isInteger` and a range.
- URL allowlist: the `sourceUrl` must equal the exact asset URL, HTTPS, no credentials.
- Acquisition: `seasonCsvAcquisition.js` checks Content-Type against `ALLOWED_CONTENT_TYPES`
  (`playerWeeklyAcquisition.js`), Content-Length, and a byte cap. A Parquet path needs a new allowed type
  (`application/octet-stream` is what GitHub serves) and a new URL allowlist.
- Teams map through `teamIdFor` (`footballIntelligence/nflTeams`). Players map gsis to `player_id` via `playerIdByGsis`.

## Source 1: play-by-play

- URL: `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`
  (`playByPlayAcquisition.js:11`). Format: gzip CSV. Cap: 256 MB compressed, 1 GB decompressed.
- Parquet: `pbp/play_by_play_${season}.parquet`. Verified. 2024 is 20.6 MB (csv.gz is 19.4 MB).
- Adapter: `adaptPlayByPlayCsvGzip` (`playByPlaySource.js`). Writer: `playByPlayWriter.js`.
- Validation: season must equal the request. `(game_id, play_id)` must be unique. Rows whose participant gsis id is
  not in the crosswalk go to `unmatched`, not `rows`.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| season | integer 1999-2100, must match | text | int32 | low |
| week | integer 1-23 | text | int32 | low |
| game_id | text, max 64 | text | string | low |
| play_id | integer >= 0, key | text ("1.0" never seen) | float64 in nflverse | medium: must cast to int, keep source_row text as "1" not "1.0" |
| posteam, defteam | teamIdFor, null ok | text | string | low |
| passer/rusher/receiver_player_id | gsis lookup | text | string | low |
| play_type | text | text | string | low |
| desc | text (`descText`) | text, quoted | string | low; check embedded newlines/quotes survive |
| epa, wpa, cpoe, air_epa, yac_epa | finite float | text, full printed precision | float64 | high: CSV text may be rounded by the R writer; Parquet holds full float64. Values differ in low digits |
| success | boolean from "1"/"0"/"true"/"false" | text | float64 (0/1) | medium: 1.0 must map to true |
| yardline_100, air_yards | read from `source_row` in SQL (`playerWeeklyOpportunityWriter.js:27-28`) | text | float64 | medium: regex on text; "20.0" vs "20" still parses, but source_row text changes |
| season_type | read from `source_row` in SQL, must be REG/POST | text | string | low |
| two_point_attempt | `source_row->>'two_point_attempt' IS DISTINCT FROM '1'` (`playerWeeklyOpportunityWriter.js:31`) | text "1"/"0" | float64 | high: if stringified as "1.0", two-point tries leak into opportunity counts silently |
| all other ~370 columns | kept only in `source_row` | text | mixed typed | high: see Parity risks |

## Source 2: schedules (games)

- URL: `https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv`
  (`scheduleSource.js:13`, `scheduleAcquisition.js:10`). Global file, all seasons.
- Parquet: `schedules/games.parquet`. Verified, 0.5 MB.
- Adapter: `adaptSchedulesCsv`. Writers: `scheduleWriter.js`, `teamWriter.js`.
- Validation: game_type in PRE/REG/WC/DIV/CON/SB, PRE excluded. game_id matches
  `^{season}_{WW}_{AWAY}_{HOME}$` and agrees with teams and week. Alias `SDG -> LAC`. Selected season needs 240+
  games and 28+ teams. All 32 teams must appear across the file. Partial scores fail.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| game_id | key, regex | text | string | low |
| season | integer, team first/last season | text | int32 | low |
| game_type | upper-cased, allowlist | text | string | low |
| week | integer 1-23 | text | int32 | low |
| gameday | ISO date check, kickoff | text YYYY-MM-DD | string (nflverse keeps it as text) | medium: if a Date type, must format back to YYYY-MM-DD |
| gametime | HH:MM check, kickoff | text | string | low |
| away_team, home_team | canonicalTeam | text | string | low |
| away_score, home_score | int 0-255 or null | text | int32 / float64 with nulls | medium: float "24.0" |
| overtime, div_game | boolean (1/0/true/false/t/f/yes/no) | text | int32 or float64 | medium |
| stadium, location, roof, surface | text | text | string | low |
| temp | int -99..150 | text | int32/float64 | medium |
| wind | int 0..255 | text | int32/float64 | medium |
| away_rest, home_rest | int 0..255 | text | int32 | low |
| spread_line, total_line | finite (numeric column) | text | float64 | medium: precision of halves is exact, low risk in practice |
| away_moneyline, home_moneyline | int | text | int32/float64 | medium |
| away_coach, home_coach | text | text | string | low |
| derived: kickoffAt | `kickoffInstantUtc(gameday, gametime)` America/New_York to UTC | - | - | low if inputs are identical text |

## Source 3: players (identity)

- URL: `https://github.com/nflverse/nflverse-data/releases/download/players/players.csv` (`playerIdentitySource.js:8`).
- Parquet: `players/players.parquet`. Verified, 3.4 MB.
- Adapter: `adaptPlayersCsv`. Writer: `playerIdentityWriter.js`. `playerIndexStage.js` later reads
  `football_players.source_row->>'espn_id'` and requires `^[0-9]{1,12}$`.
- Validation: gsis_id required, `^[A-Za-z0-9._-]{1,128}$`, unique. display_name and position required.
  `playerIdFor(gsis)` must not collide.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| gsis_id | key, regex | text | string | low |
| display_name | required text | text | string | low |
| position | required text | text | string | low |
| first_name, last_name | text | text | string | low |
| birth_date | ISO date or null | text | string or date | medium |
| espn_id | `source_row->>'espn_id'` regex digits | text | possibly int or float64 | high: "12345.0" fails the regex and drops the ESPN crosswalk |
| other columns | `source_row` only | text | mixed | high (same as all) |

## Source 4: player weekly stats

- URL: `.../stats_player/stats_player_week_${season}.csv` (`playerWeeklySource.js:9`). Cap 64 MB.
- Parquet: `stats_player/stats_player_week_${season}.parquet`. Verified, 0.85 MB for 2024.
- Adapter: `adaptPlayerWeeklyCsv`. Writer: `playerWeeklyWriter.js`.
- Validation: season match, week 1-23, season_type REG/POST, unique (player_id, week, season_type). A row with no team
  and no opponent is `team_missing`. target_share in [0, 1]. game_id and position required.
- Derived: `stats` = `sparseStats(row)` (`nflverseFacts.js:26`). It keeps every numeric non-zero column outside
  `NON_STAT_COLUMNS`, rounded to 4 decimals.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| player_id | gsis lookup | text | string | low |
| season, week | integer | text | int32 | low |
| season_type | REG/POST | text | string | low |
| team, opponent_team | teamId | text | string | low |
| position | required | text | string | low |
| game_id | required | text | string | low |
| fantasy_points_ppr | finite | text | float64 | medium: precision |
| attempts, passing_yards, carries, rushing_yards, targets, receptions, receiving_yards | finite | text | int32 / float64 | low |
| target_share | finite in [0,1] | text | float64 | medium: precision |
| every other numeric column | `sparseStats` | text | int/float | medium: rounding to 4 dp hides most float drift; booleans stored as "TRUE" would be skipped in CSV but a typed 1 would be kept |
| fg_*_list | excluded | text | string | low |

## Source 5: team weekly stats

- URL: `.../stats_team/stats_team_week_${season}.csv` (`teamWeeklySource.js:10`). Cap 32 MB.
- Parquet: `stats_team/stats_team_week_${season}.parquet`. Verified, 0.13 MB for 2024.
- Adapter: `adaptTeamWeeklyCsv`. Writer: `teamWeeklyWriter.js`. Needs `scoresByGameId` from schedules.
- Validation: season match, week 1-23, REG/POST, unique (week, season_type, team), game must exist in schedules and
  teams must match home/away.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| team, opponent_team | teamIdFor | text | string | low |
| season, week | integer (`Number(String(v))`) | text | int32 | low |
| season_type | REG/POST | text | string | low |
| game_id | score join | text | string | low |
| other numeric columns | `sparseStats` | text | int/float | medium (as above) |
| derived pointsFor/Against | from schedules scores | - | - | low |

## Source 6: weekly rosters

- URL: `.../weekly_rosters/roster_weekly_${season}.csv` (`weeklyRosterSource.js:7`). Cap 64 MB.
- Parquet: `weekly_rosters/roster_weekly_${season}.parquet`. Verified, 0.83 MB for 2024.
- Adapter: `adaptWeeklyRosterCsv`. Writer: `weeklyRosterWriter.js`.
- Validation: season match, week 1-23, team valid. Duplicate (week, team, player) keeps the LAST row in source order;
  earlier ones become `superseded_duplicate`. Jersey outside 0-99 becomes null and is counted.

| column | used by | CSV type | Parquet type | parity risk |
|---|---|---|---|---|
| season, week | `Number()` | text | int32 | low |
| team | teamIdFor | text | string | low |
| gsis_id | gsis lookup | text | string | low |
| game_type | text | text | string | low |
| position, depth_chart_position | text | text | string | low |
| jersey_number | int 0-99 | text | int32/float64 | medium |
| status, status_description_abbr | text | text | string | low |
| (row order) | last-row-wins dedupe | file order | file order | high: Parquet row order must equal CSV row order or the kept row changes |

## Not nflverse, no Parquet (out of scope)

| source | URL | format | notes |
|---|---|---|---|
| Sleeper players and injuries | `https://api.sleeper.app/v1/players/nfl` (`playerIndexStage.js:29`) | JSON | gsis_id, espn_id, yahoo_id, full_name, injury_status (allowlist), injury_body_part (80 chars), injury_notes (200 chars) |
| DynastyProcess ids | `raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv` (`playerIndexStage.js:130`) | CSV | small; not nflverse |
| Sleeper projections | `https://api.sleeper.app/projections/nfl` (`sleeperProjectionSource.js:12`) | JSON | |
| Coaching | `https://en.wikipedia.org/w/api.php` (`coachingSource.js:9`) | wikitext | role regexes, CC BY-SA attribution |
| Weather observed/forecast | `archive-api.open-meteo.com` (`weatherObservedStage.js:10`) | JSON | |

No nflverse injuries asset is fetched. Injuries come from Sleeper.

## Parity risks

1. `source_row` text. Every adapter stores the raw CSV strings. A Parquet reader returns typed values. To match, each
   cell must print exactly as nflverse's CSV writer printed it: integers without ".0", NA as "NA", empty as "",
   floats with the same digits. Simplest safe rule: compare `source_row` as a separate, looser check, and match typed
   columns exactly.
2. Float precision. The CSV is written by R and may round. Parquet holds full float64. epa, wpa, cpoe, target_share
   and fantasy points can differ in the last digits. Decide a tolerance (for example 1e-9) or round on both sides.
3. Integer columns stored as float64 in Parquet when they hold NA. `play_id`, scores, temp, wind, moneylines, jersey.
4. NA handling. CSV has literal "NA" and "". Parquet has real nulls. The adapters treat both as null for typed
   fields, so typed fields are safe. `source_row` is not.
5. Booleans. CSV "1"/"0" or "TRUE"/"FALSE". Parquet may hold bool, int or float. Two string compares depend on the text:
   `two_point_attempt IS DISTINCT FROM '1'` and `buildOpportunity`'s `r.two_point_attempt === "1"`
   (`nflverseFacts.js`).
6. `espn_id` digits regex in `playerIndexStage.js`. A float would break the ESPN crosswalk.
7. Dates. gameday and birth_date must stay `YYYY-MM-DD` text.
8. Row order. Weekly rosters dedupe by last row. Errors cite "CSV row N".
9. Receipts. `sourceRef` (byte hash) and `sourceBytes` will differ by design. `schema_fingerprint` matches only if the
   header list and order match. Parity checks must exclude receipt hashes or compare them per format.
10. Schema drift. Parquet may carry columns the CSV lacks, or the reverse, in a given release. Compare header lists
    first.
11. UTF-8 / BOM / quoting checks do not apply to Parquet. Keep the REQUIRED_COLUMNS and row-shape checks.

## Memory notes

- Play-by-play is the only large source. About 50k rows and ~370 columns per season. The Node path holds the gzip
  buffer, the decompressed buffer (up to 1 GB cap), the decoded string, the parsed records array and one object per
  row with `source_row`. That is the ~2 GB heap. Polars with a column projection on the ~20 needed columns, plus a
  streamed `source_row`, should cut most of it.
- players.csv is mid size (3.4 MB Parquet). Schedules, player weekly, team weekly and rosters are each under 1 MB as
  Parquet and are not a memory concern.

## kickoff_at fix location

- Derivation already exists: `kickoffInstantUtc(gameday, gametime)` in
  `src/services/footballWarehouse/scheduleSource.js`. It treats both as America/New_York and returns UTC ISO. It matches
  `(gameday || ' ' || gametime)::timestamp AT TIME ZONE 'America/New_York'` in Postgres.
- The adapter sets `kickoffAt` on each selected row. `scheduleWriter.js:42` validates it. Lines 78, 104 and 115-119
  stage and upsert `kickoff_at`.
- `infra/schedule/TIMERS.md:96` and `Blueprints/specs/infrastructure/omen-rust-infrastructure-plan-v1.md:56` still say
  the adapter does not fill it. That doc is stale relative to the code.
- If live rows are still empty, the fix is a re-run of the schedule ingest per season, or a one-time SQL backfill from
  `source_row->>'gameday'` and `source_row->>'gametime'` using the Postgres formula above. Unverified against the live
  warehouse.
- For the Parquet path, the same function must get the same text inputs. If Polars reads gameday as a Date, format it
  back first.

## Parity harness

The `warehouse/test/*` scripts already run adapter then writer against a real Postgres (socket path, `pg` Pool), with
fixtures in `warehouse/test/fixtures`. They are the natural base:

- `one-season-source-to-writer-integration.js` (player weekly), `player-identity-source-to-writer-integration.js`,
  `remaining-fact-writers-integration.js` (team weekly, rosters, pbp), `schedule-structural-diff-integration.js`,
  `schedule-to-player-week-integration.js`, `player-weekly-opportunity-integration.js`. Each has a `run-*.sh` wrapper.
- Plan: run each CSV adapter and writer into schema `football`, and the Polars path into a shadow schema (for example
  `football_shadow`) built from the same migrations. Then diff each table with `EXCEPT ALL` both ways on the typed
  columns, plus a count check.
- Compare `source_row` separately, key by key, so a format-only difference shows as a named column, not a whole-row miss.
- Exclude or separately check receipt fields (`source_ref`, `source_bytes`, `ingest_event_id`, timestamps).
- `schedule-structural-diff-integration.js` already does a structural diff and is the closest template.
- Check `unmatched` counts and reasons match too, not just written rows.
- Run at least one old season (1999: stray team-missing rows, roster duplicates) and one current season.
