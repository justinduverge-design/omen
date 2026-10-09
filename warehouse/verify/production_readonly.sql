\set ON_ERROR_STOP on

begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

select (
  current_database() = 'omen_football'
  and current_setting('transaction_read_only') = 'on'
  and (
    select count(*) = 2
      and bool_and((version, name, checksum) in (
        (1, '0001_football_warehouse', '27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c'),
        (2, '0003_warehouse_access_policy', '0b0577edd8995fad967409a37012390d77447cf55595fd4a310270b56f7a169d')
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
) as warehouse_verified
\gset

\if :warehouse_verified
  select 'VERIFIED production football warehouse read-only' as result;
\else
  \echo 'production football warehouse verification failed'
  \quit 1
\endif

commit;
