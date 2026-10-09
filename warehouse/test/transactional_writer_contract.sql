\set ON_ERROR_STOP on

create schema warehouse_test;

-- Test-only reference implementation of the transaction boundary expected from
-- the application writer. A production writer may use prepared statements
-- instead, but must preserve these receipt, hash, and upsert semantics.
create function warehouse_test.write_player_week_fixture(
  p_run_id text,
  p_source_ref text,
  p_season integer,
  p_week integer,
  p_player_id text,
  p_team_id text,
  p_opponent_team_id text,
  p_game_id text,
  p_fantasy_points_ppr numeric,
  p_passing_yards numeric,
  p_stats jsonb
) returns void
language plpgsql
as $$
declare
  receipt_id bigint;
  existing_source_ref text;
begin
  select source_ref
    into existing_source_ref
  from football.warehouse_ingest_events
  where run_id = p_run_id
    and dataset = 'player_weekly_stats'
    and season = p_season
  for update;

  if existing_source_ref is not null and existing_source_ref <> p_source_ref then
    raise exception 'run identity reused with different source hash'
      using errcode = '22000';
  end if;

  insert into football.warehouse_ingest_events (
    run_id, dataset, season, rights_basis, source_url, source_ref,
    source_bytes, source_rows, state, finished_at, metadata
  ) values (
    p_run_id, 'player_weekly_stats', p_season, 'nflverse_open_data',
    'https://github.com/nflverse/fixture', p_source_ref,
    128, 1, 'succeeded', clock_timestamp(), '{"fixture":true}'::jsonb
  )
  on conflict (run_id, dataset, season) do update
    set source_rows = excluded.source_rows,
        finished_at = excluded.finished_at
  returning id into receipt_id;

  insert into football.nfl_player_weekly_stats (
    season, week, season_type, player_id, team_id, opponent_team_id,
    game_id, football_position, fantasy_points_ppr, passing_yards,
    stats, ingest_event_id
  ) values (
    p_season, p_week, 'REG', p_player_id, p_team_id, p_opponent_team_id,
    p_game_id, 'QB', p_fantasy_points_ppr, p_passing_yards,
    p_stats, receipt_id
  )
  on conflict (season, week, season_type, player_id) do update
    set team_id = excluded.team_id,
        opponent_team_id = excluded.opponent_team_id,
        game_id = excluded.game_id,
        football_position = excluded.football_position,
        fantasy_points_ppr = excluded.fantasy_points_ppr,
        passing_yards = excluded.passing_yards,
        stats = excluded.stats,
        ingest_event_id = excluded.ingest_event_id;
end
$$;
