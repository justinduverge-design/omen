\set ON_ERROR_STOP on

do $$
declare
  missing text[];
  partition_count integer;
begin
  select array_agg(expected.name order by expected.name)
    into missing
  from (values
    ('warehouse_schema_migrations'), ('warehouse_ingest_events'), ('football_teams'),
    ('football_players'), ('football_player_ids'), ('nfl_games'), ('nfl_weekly_rosters'),
    ('nfl_player_weekly_stats'), ('nfl_team_weekly_stats'), ('nfl_plays'),
    ('nfl_player_weekly_opportunity'), ('football_metric_runs'),
    ('football_metric_run_inputs'), ('football_metric_values')
  ) as expected(name)
  where to_regclass('football.' || expected.name) is null;

  if missing is not null then
    raise exception 'missing warehouse tables: %', missing;
  end if;

  select count(*) into partition_count
  from pg_inherits
  where inhparent = 'football.nfl_plays'::regclass;

  if partition_count <> 29 then
    raise exception 'expected 29 season partitions, found %', partition_count;
  end if;

  if exists (
    select 1
    from (values ('carries'), ('passing_attempts'), ('target_share'), ('source_row')) expected(name)
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'football'
        and table_name = 'nfl_player_weekly_stats'
        and column_name = expected.name
    )
  ) then
    raise exception 'player weekly facts are missing a typed Start/Sit usage column';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'football'
      and table_name = 'nfl_player_weekly_opportunity'
      and column_name = 'snap_share'
  ) then
    raise exception 'player weekly opportunity is missing snap_share';
  end if;

  if has_schema_privilege('public', 'football', 'usage') then
    raise exception 'PUBLIC unexpectedly has football schema usage';
  end if;
  if not has_table_privilege('omen_warehouse_reader', 'football.nfl_plays', 'select')
     or has_table_privilege('omen_warehouse_reader', 'football.nfl_plays', 'insert') then
    raise exception 'reader grants are not least privilege';
  end if;
  if not has_table_privilege('omen_warehouse_writer', 'football.nfl_plays', 'select,insert,update,delete') then
    raise exception 'writer grants are incomplete';
  end if;
  if has_table_privilege('omen_warehouse_backup', 'football.nfl_plays', 'insert') then
    raise exception 'backup role unexpectedly has write access';
  end if;
end
$$;

insert into football.warehouse_ingest_events (
  run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
  source_rows, state, finished_at
) values (
  'schema-test-2026', 'players', 2026, 'nflverse_open_data',
  'https://github.com/nflverse/schema-test',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  100, 1, 'succeeded', clock_timestamp()
) returning id \gset receipt_

insert into football.football_teams
  (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
values
  ('omen:team:buf', 'BUF', 'Buffalo', 1999, :receipt_id),
  ('omen:team:mia', 'MIA', 'Miami', 1999, :receipt_id);

insert into football.football_players
  (player_id, gsis_id, display_name, ingest_event_id)
values
  ('omen:player:gsis.00-0000001', '00-0000001', 'Schema Test Player', :receipt_id);

insert into football.football_player_ids
  (provider, provider_id, player_id, match_method, ingest_event_id)
values
  ('gsis', '00-0000001', 'omen:player:gsis.00-0000001', 'source_crosswalk', :receipt_id);

insert into football.nfl_games
  (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
values
  (2026, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', :receipt_id);

insert into football.nfl_plays (
  season, game_id, play_id, week, posteam_id, defteam_id, passer_player_id,
  play_type, epa, success, source_row, ingest_event_id
) values (
  2026, '2026_01_BUF_MIA', 1, 1, 'omen:team:buf', 'omen:team:mia',
  'omen:player:gsis.00-0000001', 'pass', 0.75, true, '{"play_id":1}'::jsonb, :receipt_id
);

do $$
declare
  routed_table text;
begin
  select tableoid::regclass::text into routed_table
  from football.nfl_plays
  where season = 2026 and game_id = '2026_01_BUF_MIA' and play_id = 1;

  if routed_table <> 'football.nfl_plays_2026' then
    raise exception 'play routed to %, expected football.nfl_plays_2026', routed_table;
  end if;
end
$$;

insert into football.football_metric_runs (
  metric_name, formula_version, season, week, state, finished_at
) values (
  'omen_quarterback_efficiency', 'v1', 2026, 1, 'succeeded', clock_timestamp()
) returning id \gset metric_

insert into football.football_metric_run_inputs (metric_run_id, ingest_event_id)
values (:metric_id, :receipt_id);

insert into football.football_metric_values (metric_run_id, entity_type, entity_id, value, components)
values (:metric_id, 'player', 'omen:player:gsis.00-0000001', 0.75, '{"epa":0.75}'::jsonb);

select 'VERIFIED football warehouse schema' as result;
