\set ON_ERROR_STOP on

insert into football.warehouse_ingest_events (
  run_id, dataset, season, rights_basis, source_url, source_ref,
  source_bytes, source_rows, state, finished_at
) values (
  'writer-prerequisites', 'players', 2026, 'nflverse_open_data',
  'https://github.com/nflverse/fixture-prerequisites',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  64, 1, 'succeeded', clock_timestamp()
) returning id \gset prerequisite_

insert into football.football_teams
  (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
values
  ('omen:team:buf', 'BUF', 'Buffalo', 1999, :prerequisite_id),
  ('omen:team:mia', 'MIA', 'Miami', 1999, :prerequisite_id);

insert into football.football_players
  (player_id, gsis_id, display_name, football_position, ingest_event_id)
values
  ('omen:player:fixture-qb', '00-0000001', 'Fixture Quarterback', 'QB', :prerequisite_id);

insert into football.nfl_games
  (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
values
  (2026, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', :prerequisite_id),
  (2026, '2026_02_BUF_MIA', 2, 'REG', 'omen:team:buf', 'omen:team:mia', :prerequisite_id);

-- Successful call: the receipt and fact become visible together.
begin;
select warehouse_test.write_player_week_fixture(
  'player-week-success',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  2026, 1, 'omen:player:fixture-qb', 'omen:team:buf', 'omen:team:mia',
  '2026_01_BUF_MIA', 22.5, 275, '{"passing_yards":275,"passing_tds":2}'::jsonb
);
commit;

do $$
begin
  if (select count(*) from football.warehouse_ingest_events
      where run_id = 'player-week-success') <> 1 then
    raise exception 'committed writer did not create exactly one receipt';
  end if;
  if (select count(*) from football.nfl_player_weekly_stats
      where season = 2026 and week = 1 and player_id = 'omen:player:fixture-qb') <> 1 then
    raise exception 'committed writer did not create exactly one fact';
  end if;
  if not exists (
    select 1
    from football.nfl_player_weekly_stats facts
    join football.warehouse_ingest_events receipts on receipts.id = facts.ingest_event_id
    where facts.season = 2026
      and facts.week = 1
      and facts.player_id = 'omen:player:fixture-qb'
      and receipts.run_id = 'player-week-success'
      and receipts.state = 'succeeded'
  ) then
    raise exception 'committed fact is not linked to its succeeded receipt';
  end if;
end
$$;

-- A rollback after the writer call removes both sides of the unit of work.
begin;
select warehouse_test.write_player_week_fixture(
  'player-week-rollback',
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  2026, 2, 'omen:player:fixture-qb', 'omen:team:buf', 'omen:team:mia',
  '2026_02_BUF_MIA', 18.0, 225, '{"passing_yards":225,"passing_tds":1}'::jsonb
);
rollback;

do $$
begin
  if exists (select 1 from football.warehouse_ingest_events where run_id = 'player-week-rollback') then
    raise exception 'rollback left an ingest receipt behind';
  end if;
  if exists (
    select 1 from football.nfl_player_weekly_stats
    where season = 2026 and week = 2 and player_id = 'omen:player:fixture-qb'
  ) then
    raise exception 'rollback left a player-week fact behind';
  end if;
end
$$;

-- Replaying the same run and source is deterministic: one receipt, one fact,
-- and the same materialized values.
select warehouse_test.write_player_week_fixture(
  'player-week-success',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  2026, 1, 'omen:player:fixture-qb', 'omen:team:buf', 'omen:team:mia',
  '2026_01_BUF_MIA', 22.5, 275, '{"passing_tds":2,"passing_yards":275}'::jsonb
);

do $$
begin
  if (select count(*) from football.warehouse_ingest_events
      where run_id = 'player-week-success') <> 1 then
    raise exception 'rerun duplicated its receipt';
  end if;
  if (select count(*) from football.nfl_player_weekly_stats
      where season = 2026 and week = 1 and player_id = 'omen:player:fixture-qb') <> 1 then
    raise exception 'rerun duplicated its player-week fact';
  end if;
  if not exists (
    select 1 from football.nfl_player_weekly_stats
    where season = 2026
      and week = 1
      and player_id = 'omen:player:fixture-qb'
      and fantasy_points_ppr = 22.5
      and passing_yards = 275
      and stats = '{"passing_yards":275,"passing_tds":2}'::jsonb
  ) then
    raise exception 'rerun changed deterministic fixture values';
  end if;
end
$$;

-- A reused run identity with a different raw hash must fail closed. Catch the
-- expected error so the harness can also prove the original row was untouched.
do $$
begin
  begin
    perform warehouse_test.write_player_week_fixture(
      'player-week-success',
      'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      2026, 1, 'omen:player:fixture-qb', 'omen:team:buf', 'omen:team:mia',
      '2026_01_BUF_MIA', 99.0, 999, '{"passing_yards":999}'::jsonb
    );
    raise exception 'different source hash was unexpectedly accepted';
  exception
    when sqlstate '22000' then
      null;
  end;

  if not exists (
    select 1 from football.warehouse_ingest_events
    where run_id = 'player-week-success'
      and source_ref = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ) then
    raise exception 'hash mismatch attempt changed the original receipt';
  end if;
  if not exists (
    select 1 from football.nfl_player_weekly_stats
    where season = 2026 and week = 1 and player_id = 'omen:player:fixture-qb'
      and fantasy_points_ppr = 22.5 and passing_yards = 275
  ) then
    raise exception 'hash mismatch attempt changed the original fact';
  end if;
end
$$;

select 'VERIFIED transactional warehouse writer contract' as result;
