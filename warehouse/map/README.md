<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# Warehouse map

The warehouse's routing table. One entry per table. Edit this file, then run `node scripts/warehouse-map.js write` to regenerate the per-table files; `check` fails CI when this file, the generated files, the migrations and the code disagree. The SQL copy lives in football.warehouse_map (migration 0007).

## Layers

- **ledger**: How data got here: ingest receipts and schema versions.
- **identity**: Who and what: teams and players, and every provider id that points at them.
- **facts**: What happened on the field, from public nflverse data. Never edited by Omen.
- **provider**: Third-party numbers Omen stores but does not own (projections). Kept separate and labelled.
- **sight**: Omen's own numbers, computed from facts. Versioned, and graded against what happened.

## Tables

| Table | Layer | Grain |
|---|---|---|
| [warehouse_schema_migrations](warehouse_schema_migrations.md) | ledger | one row per applied migration |
| [warehouse_ingest_events](warehouse_ingest_events.md) | ledger | one row per dataset load (run, dataset, season) |
| [football_teams](football_teams.md) | identity | one row per franchise |
| [football_players](football_players.md) | identity | one row per NFL player ever (GSIS) |
| [football_player_ids](football_player_ids.md) | identity | one row per (provider, provider id) |
| [nfl_games](nfl_games.md) | facts | one row per game |
| [nfl_weekly_rosters](nfl_weekly_rosters.md) | facts | one row per (season, week, team, player) |
| [nfl_player_weekly_stats](nfl_player_weekly_stats.md) | facts | one row per (season, week, season type, player) |
| [nfl_team_weekly_stats](nfl_team_weekly_stats.md) | facts | one row per (season, week, season type, team) |
| [nfl_plays](nfl_plays.md) | facts | one row per play (partitioned by season, 1999 onward) |
| [nfl_player_weekly_opportunity](nfl_player_weekly_opportunity.md) | facts | one row per (season, week, season type, player) |
| [football_metric_runs](football_metric_runs.md) | sight | one row per metric computation (metric, version, season, week) |
| [football_metric_run_inputs](football_metric_run_inputs.md) | sight | one row per (metric run, ingest event) |
| [football_metric_values](football_metric_values.md) | sight | one row per (metric run, entity) |
| [projection_fetch_runs](projection_fetch_runs.md) | provider | one row per projection fetch (source, season, week) |
| [player_weekly_projections](player_weekly_projections.md) | provider | one row per (source, season, week, player): the current projection |
| [player_weekly_projection_versions](player_weekly_projection_versions.md) | provider | one row per change to a projection |
| [warehouse_map](warehouse_map.md) | ledger | one row per warehouse table |
| [player_index_runs](player_index_runs.md) | ledger | one row per player-index load from a non-nflverse source |
