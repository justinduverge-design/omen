begin;

-- The warehouse map, inside the warehouse. Generated from warehouse/map/catalog.json
-- (`node scripts/warehouse-map.js sql`); the repo files in warehouse/map are the same map for people and agents.
-- Every table gets a comment naming its layer and purpose, and football.warehouse_map answers
-- "what is this table, where does it come from, how fresh is it, what is it missing" from SQL.
--
-- Additive only. Map rows change by migration, never by a job: the writer and reader roles can only read it.

create table football.warehouse_map (
  name      text primary key check (name ~ '^[a-z][a-z0-9_]*$'),
  layer     text not null check (layer in ('ledger', 'identity', 'facts', 'provider', 'sight')),
  grain     text not null check (grain <> ''),
  source    text not null check (source <> ''),
  refresh   text not null check (refresh <> ''),
  purpose   text not null check (purpose <> ''),
  gaps      text[] not null default array[]::text[]
);
comment on table football.warehouse_map is
  '[ledger] The warehouse map: what each table is, its layer, grain, source, refresh and known gaps. Source: warehouse/map/catalog.json.';

-- Tables in the football schema the map does not describe (per-season nfl_plays partitions excluded),
-- and map rows whose table does not exist yet (for example a written but unapplied migration).
create view football.warehouse_map_drift as
  select c.relname::text as name, 'table_not_in_map'::text as problem
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'football' and c.relkind in ('r', 'p', 'v') and c.relispartition = false
     and c.relname not in (select name from football.warehouse_map) and c.relname <> 'warehouse_map_drift'
  union all
  select m.name, 'map_row_without_table'
    from football.warehouse_map m
   where to_regclass('football.' || m.name) is null;
comment on view football.warehouse_map_drift is
  '[ledger] Disagreements between the map and the live schema. Empty when the map is current.';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('warehouse_schema_migrations', 'ledger', 'one row per applied migration', 'the migration apply scripts in warehouse/migrations', 'on migration', 'The warehouse''s schema version. The app refuses a warehouse whose version it does not accept.', array[]::text[]),
  ('warehouse_ingest_events', 'ledger', 'one row per dataset load (run, dataset, season)', 'the daily ingest and backfills', 'daily 07:15 ET', 'Receipt for every load: source url and hash, row counts, state. Every fact row cites one.', array[]::text[]),
  ('football_teams', 'identity', 'one row per franchise', 'nflverse teams', 'daily 07:15 ET', 'NFL teams with their nflverse abbreviation and active seasons.', array[]::text[]),
  ('football_players', 'identity', 'one row per NFL player ever (GSIS)', 'nflverse players', 'daily 07:15 ET', 'Every NFL player with position and birth date. Rookies arrive here when nflverse lists them; retired players stay.', array['No per-season status (rookie, active, practice squad, IR, retired): derived from nfl_weekly_rosters today, not stored.']::text[]),
  ('football_player_ids', 'identity', 'one row per (provider, provider id)', 'nflverse players (GSIS only today)', 'daily 07:15 ET', 'Maps provider ids to the warehouse player. Grading and usage resolve through it.', array['Holds GSIS ids only. Sleeper, ESPN and Yahoo ids live in the Supabase crosswalk (player_provider_ids), so readers map through Supabase first.']::text[]),
  ('nfl_games', 'facts', 'one row per game', 'nflverse schedules', 'daily 07:15 ET', 'Schedule and results: kickoff, score, stadium, roof, surface, temperature, wind, rest days, lines, coaches.', array['Weather here is the recorded game-day value, not a forecast.']::text[]),
  ('nfl_weekly_rosters', 'facts', 'one row per (season, week, team, player)', 'nflverse weekly rosters', 'daily 07:15 ET', 'Who was on which team each week, with depth position and roster status. The source of player lifecycle.', array[]::text[]),
  ('nfl_player_weekly_stats', 'facts', 'one row per (season, week, season type, player)', 'nflverse stats_player', 'daily 07:15 ET', 'Box-score lines and PPR points per player-week. Grading and projections read it.', array['A player who did not record a stat has no row: absence means did-not-play, not unknown.']::text[]),
  ('nfl_team_weekly_stats', 'facts', 'one row per (season, week, season type, team)', 'nflverse team stats', 'daily 07:15 ET', 'Team totals per game, the base for matchup and pace reads.', array[]::text[]),
  ('nfl_plays', 'facts', 'one row per play (partitioned by season, 1999 onward)', 'nflverse play-by-play', 'daily 07:15 ET', 'Every play with EPA, WPA, CPOE and the players involved. The raw material for Sight.', array[]::text[]),
  ('nfl_player_weekly_opportunity', 'facts', 'one row per (season, week, season type, player)', 'derived from nfl_plays by the ingest', 'daily 07:15 ET, after plays', 'Usage: snaps, routes, carries, targets, red-zone and goal-line work, deep targets.', array['Snap counts carry an open rights review; readers select opportunity counts only.']::text[]),
  ('football_metric_runs', 'sight', 'one row per metric computation (metric, version, season, week)', 'Omen metric jobs (first: RAT-QB)', 'daily 07:15 ET, after facts', 'Receipt for each Sight computation: which metric, which formula version, when, and whether it succeeded.', array[]::text[]),
  ('football_metric_run_inputs', 'sight', 'one row per (metric run, ingest event)', 'Omen metric jobs', 'with each metric run', 'Exactly which fact loads a Sight value was computed from.', array[]::text[]),
  ('football_metric_values', 'sight', 'one row per (metric run, entity)', 'Omen metric jobs', 'with each metric run', 'Sight''s numbers: one value per player or team per run, with its components.', array['Only RAT-QB exists. No Sight value feeds a recommendation yet.']::text[]),
  ('projection_fetch_runs', 'provider', 'one row per projection fetch (source, season, week)', 'Sleeper public projections (upstream: Rotowire)', 'weekly, once migration 0005 is applied', 'Receipt for each third-party projection fetch.', array['Migration 0005 is written but not applied to production.']::text[]),
  ('player_weekly_projections', 'provider', 'one row per (source, season, week, player): the current projection', 'Sleeper public projections', 'weekly, once migration 0005 is applied', 'The provider''s current weekly projection per player, kept apart from Sight.', array['Migration 0005 is written but not applied to production. Commercial permission from the provider is pending.']::text[]),
  ('player_weekly_projection_versions', 'provider', 'one row per change to a projection', 'Sleeper public projections', 'weekly, once migration 0005 is applied', 'Append-only history of every projection change, so a call can be judged on the number it actually saw.', array['Migration 0005 is written but not applied to production.']::text[]),
  ('warehouse_map', 'ledger', 'one row per warehouse table', 'warehouse/map/catalog.json via migration 0007', 'on migration', 'This map, inside the warehouse: what each table is, its layer, grain, source, refresh and known gaps. Query it before writing SQL.', array[]::text[]);

do $$
begin
  if to_regclass('football.warehouse_schema_migrations') is not null then
    execute format('comment on table football.%I is %L', 'warehouse_schema_migrations', '[ledger] The warehouse''s schema version. The app refuses a warehouse whose version it does not accept.');
  end if;
  if to_regclass('football.warehouse_ingest_events') is not null then
    execute format('comment on table football.%I is %L', 'warehouse_ingest_events', '[ledger] Receipt for every load: source url and hash, row counts, state. Every fact row cites one.');
  end if;
  if to_regclass('football.football_teams') is not null then
    execute format('comment on table football.%I is %L', 'football_teams', '[identity] NFL teams with their nflverse abbreviation and active seasons.');
  end if;
  if to_regclass('football.football_players') is not null then
    execute format('comment on table football.%I is %L', 'football_players', '[identity] Every NFL player with position and birth date. Rookies arrive here when nflverse lists them; retired players stay.');
  end if;
  if to_regclass('football.football_player_ids') is not null then
    execute format('comment on table football.%I is %L', 'football_player_ids', '[identity] Maps provider ids to the warehouse player. Grading and usage resolve through it.');
  end if;
  if to_regclass('football.nfl_games') is not null then
    execute format('comment on table football.%I is %L', 'nfl_games', '[facts] Schedule and results: kickoff, score, stadium, roof, surface, temperature, wind, rest days, lines, coaches.');
  end if;
  if to_regclass('football.nfl_weekly_rosters') is not null then
    execute format('comment on table football.%I is %L', 'nfl_weekly_rosters', '[facts] Who was on which team each week, with depth position and roster status. The source of player lifecycle.');
  end if;
  if to_regclass('football.nfl_player_weekly_stats') is not null then
    execute format('comment on table football.%I is %L', 'nfl_player_weekly_stats', '[facts] Box-score lines and PPR points per player-week. Grading and projections read it.');
  end if;
  if to_regclass('football.nfl_team_weekly_stats') is not null then
    execute format('comment on table football.%I is %L', 'nfl_team_weekly_stats', '[facts] Team totals per game, the base for matchup and pace reads.');
  end if;
  if to_regclass('football.nfl_plays') is not null then
    execute format('comment on table football.%I is %L', 'nfl_plays', '[facts] Every play with EPA, WPA, CPOE and the players involved. The raw material for Sight.');
  end if;
  if to_regclass('football.nfl_player_weekly_opportunity') is not null then
    execute format('comment on table football.%I is %L', 'nfl_player_weekly_opportunity', '[facts] Usage: snaps, routes, carries, targets, red-zone and goal-line work, deep targets.');
  end if;
  if to_regclass('football.football_metric_runs') is not null then
    execute format('comment on table football.%I is %L', 'football_metric_runs', '[sight] Receipt for each Sight computation: which metric, which formula version, when, and whether it succeeded.');
  end if;
  if to_regclass('football.football_metric_run_inputs') is not null then
    execute format('comment on table football.%I is %L', 'football_metric_run_inputs', '[sight] Exactly which fact loads a Sight value was computed from.');
  end if;
  if to_regclass('football.football_metric_values') is not null then
    execute format('comment on table football.%I is %L', 'football_metric_values', '[sight] Sight''s numbers: one value per player or team per run, with its components.');
  end if;
  if to_regclass('football.projection_fetch_runs') is not null then
    execute format('comment on table football.%I is %L', 'projection_fetch_runs', '[provider] Receipt for each third-party projection fetch.');
  end if;
  if to_regclass('football.player_weekly_projections') is not null then
    execute format('comment on table football.%I is %L', 'player_weekly_projections', '[provider] The provider''s current weekly projection per player, kept apart from Sight.');
  end if;
  if to_regclass('football.player_weekly_projection_versions') is not null then
    execute format('comment on table football.%I is %L', 'player_weekly_projection_versions', '[provider] Append-only history of every projection change, so a call can be judged on the number it actually saw.');
  end if;
  if to_regclass('football.warehouse_map') is not null then
    execute format('comment on table football.%I is %L', 'warehouse_map', '[ledger] This map, inside the warehouse: what each table is, its layer, grain, source, refresh and known gaps. Query it before writing SQL.');
  end if;
end $$;

revoke all on football.warehouse_map, football.warehouse_map_drift from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.warehouse_map, football.warehouse_map_drift to omen_warehouse_reader, omen_warehouse_backup;
grant select on football.warehouse_map, football.warehouse_map_drift to omen_warehouse_writer;

commit;
