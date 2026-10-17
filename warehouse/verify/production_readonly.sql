\set ON_ERROR_STOP on

begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

select (
  current_database() = 'omen_football'
  and current_setting('transaction_read_only') = 'on'
  and (
    -- Versions 1 and 2 are required; 3 (weekly projections) and 4 (warehouse map) are optional until applied,
    -- and the ledger stays contiguous (count equals the highest version).
    select count(*) between 2 and 12
      and count(*) = max(version)
      and count(*) filter (where version in (1, 2)) = 2
      and bool_and((version, name, checksum) in (
        (1, '0001_football_warehouse', '27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c'),
        (2, '0003_warehouse_access_policy', '0b0577edd8995fad967409a37012390d77447cf55595fd4a310270b56f7a169d'),
        (3, '0005_weekly_projections', 'e689d5878bbe51f3bbe6aa0188b725e33bde7f9da8497bd8b002a2307505917d'),
        (12, '0023_player_injury_reports', '10c0fd47337e1d952be505509f2ea676730a3a41c13e15c9e3b7adcf10ccb629'),
        (11, '0021_player_index_dynastyprocess', 'd07ee0b003219b7cee9134c95b001245b374c83a499a20be2ff43d89b2fc9b24'),
        (10, '0019_player_index_bio_match', 'ce1a58df41049503fe91d44502248f6fd55cc84d57ad779a477a1fb3900ce9fd'),
        (9, '0017_game_weather_observed', '4db903c4f9d86267d0e08edcab4d42562e45ca1f480c2d54fd719ada7b4ae4c8'),
        (8, '0015_game_weather_forecasts', '7fc07093fcdba2759c3df5aa827913eabc52f718108b39c591df399f475bb75e'),
        (7, '0013_coach_graph', '5545aaa3a30ffb7b35ffe20fc5ab06f8c0d0f37252a096c45e261c5debbeb539'),
        (6, '0011_team_index', '4eba21134b978a806190e8c3ac74218547a0f870d107487d49345b92099a5359'),
        (5, '0009_player_index', '114d2619650b3b5795b84a507107e2a77c7bbacfa680c0261193fb12f6548cc6'),
        (4, '0007_warehouse_map', 'c078344a7fb3f6f884f584617915b0b3c3c053cf5b8463d668859013e7d4a5cb')
      ))
    from football.warehouse_schema_migrations
  )
  and not exists (
    select 1
    from (values
      ('warehouse_schema_migrations'), ('warehouse_ingest_events'), ('football_teams'),
      ('football_players'), ('football_player_ids'), ('nfl_games'), ('nfl_weekly_rosters'),
      ('nfl_player_weekly_stats'), ('nfl_team_weekly_stats'), ('nfl_plays'),
      ('nfl_player_weekly_opportunity'), ('football_metric_runs'),
      ('football_metric_run_inputs'), ('football_metric_values')
    ) as expected(name)
    where to_regclass('football.' || expected.name) is null
  )
  and (select count(*) = 29 from pg_inherits where inhparent = 'football.nfl_plays'::regclass)
  and not exists (
    select 1
    from (values
      ('nfl_player_weekly_stats', 'carries'),
      ('nfl_player_weekly_stats', 'passing_attempts'),
      ('nfl_player_weekly_stats', 'target_share'),
      ('nfl_player_weekly_stats', 'source_row'),
      ('nfl_player_weekly_opportunity', 'snap_share')
    ) expected(table_name, column_name)
    where not exists (
      select 1
      from information_schema.columns actual
      where actual.table_schema = 'football'
        and actual.table_name = expected.table_name
        and actual.column_name = expected.column_name
    )
  )
  and not has_schema_privilege('public', 'football', 'usage')
  and has_table_privilege('omen_warehouse_reader', 'football.nfl_plays', 'select')
  and not has_table_privilege('omen_warehouse_reader', 'football.nfl_plays', 'insert')
  and has_table_privilege('omen_warehouse_writer', 'football.nfl_plays', 'select,insert,update,delete')
  and not has_table_privilege('omen_warehouse_backup', 'football.nfl_plays', 'insert')
  -- Weekly projections (ledger version 3), checked only once applied: tables, append-only history (grants and
  -- triggers), least-privilege reader, and the rights_basis marker on the receipts. CASE keeps each privilege
  -- check from running against a table that does not exist.
  and case when not exists (select 1 from football.warehouse_schema_migrations where version = 3) then true
    else (
      to_regclass('football.projection_fetch_runs') is not null
      and to_regclass('football.player_weekly_projections') is not null
      and to_regclass('football.player_weekly_projection_versions') is not null
      and exists (select 1 from pg_trigger where tgrelid = to_regclass('football.player_weekly_projection_versions')
                  and tgname = 'player_weekly_projection_versions_append_only' and not tgisinternal)
      and exists (select 1 from pg_trigger where tgrelid = to_regclass('football.player_weekly_projection_versions')
                  and tgname = 'player_weekly_projection_versions_no_truncate' and not tgisinternal)
      and exists (select 1 from pg_constraint where conrelid = to_regclass('football.projection_fetch_runs') and contype = 'c'
                  and pg_get_constraintdef(oid) like '%provider_projection_permission_pending%')
      and has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'select')
      and has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'insert')
      and not has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'update')
      and not has_table_privilege('omen_warehouse_writer', 'football.player_weekly_projection_versions', 'delete')
      and has_table_privilege('omen_warehouse_reader', 'football.player_weekly_projections', 'select')
      and not has_table_privilege('omen_warehouse_reader', 'football.player_weekly_projection_versions', 'select')
      and not has_table_privilege('omen_warehouse_reader', 'football.player_weekly_projections', 'insert')
      and has_table_privilege('omen_warehouse_backup', 'football.player_weekly_projection_versions', 'select')
    ) end
  -- Warehouse map (ledger version 4), checked only once applied: readable by every role, written by none, and current.
  and case when not exists (select 1 from football.warehouse_schema_migrations where version = 4) then true
    else (
      to_regclass('football.warehouse_map') is not null
      and has_table_privilege('omen_warehouse_reader', 'football.warehouse_map', 'select')
      and not has_table_privilege('omen_warehouse_writer', 'football.warehouse_map', 'insert')
      and not has_table_privilege('omen_warehouse_writer', 'football.warehouse_map', 'update')
      and not exists (select 1 from football.warehouse_map_drift)
    ) end
) as warehouse_verified
\gset

\if :warehouse_verified
  select 'VERIFIED production football warehouse read-only' as result;
\else
  \echo 'production football warehouse verification failed'
  \quit 1
\endif

commit;
