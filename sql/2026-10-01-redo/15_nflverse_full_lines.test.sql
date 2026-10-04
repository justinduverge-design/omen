-- SCRATCH ONLY. Assertions for step 15. Rolls back.
begin;

insert into public.players (id, full_name, position, nfl_team, birth_date, gsis_id) values
  ('omen:player:gsis.00-0034857', 'Josh Allen', 'QB', 'BUF', '1996-05-21', '00-0034857');

do $$
declare
  ev bigint;
  t text;
begin
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'nflverse_weekly_stats', 'nflverse', 'nflverse_open_data', 'test v1', 'sha256:' || repeat('a', 64), 1)
  returning id into ev;

  foreach t in array array['nflverse_team_weekly_stats', 'nflverse_weekly_rosters', 'nflverse_games'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception 'FAIL 15: RLS off on %', t; end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t) then raise exception 'FAIL 15: a policy on %', t; end if;
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('authenticated', 'public.' || t, 'select')
       or has_table_privilege('authenticated', 'public.' || t, 'insert') or has_table_privilege('authenticated', 'public.' || t, 'update')
       or has_table_privilege('authenticated', 'public.' || t, 'delete') then
      raise exception 'FAIL 15: a client role has privileges on %', t;
    end if;
  end loop;

  set local role service_role;

  -- The widened player-week row: full line and opportunity as sparse jsonb.
  insert into public.nflverse_weekly_stats (player_id, season, week, pass_yards, team, opponent, game_id, season_type, position,
                                            stats, opportunity, ingest_event_id)
  values ('omen:player:gsis.00-0034857', 2026, 4, 227, 'omen:team:buf', 'omen:team:mia', '2026_04_MIA_BUF', 'REG', 'QB',
          '{"passing_yards": 227, "passing_epa": 6.4, "passing_2pt_conversions": 1}', '{"rz_carries": 2, "gl_carries": 1}', ev);
  if (select (stats->>'passing_epa')::numeric from public.nflverse_weekly_stats where player_id = 'omen:player:gsis.00-0034857') <> 6.4 then
    raise exception 'FAIL 15: stats jsonb did not round-trip';
  end if;
  begin
    update public.nflverse_weekly_stats set stats = '[1]' where player_id = 'omen:player:gsis.00-0034857';
    raise exception 'FAIL 15: a non-object stats value was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.nflverse_weekly_stats set team = 'BUF' where player_id = 'omen:player:gsis.00-0034857';
    raise exception 'FAIL 15: a team outside omen:team:<abbr> was accepted';
  exception when check_violation then null;
  end;

  -- Team-week: upsert by (team, season, week) replaces the row.
  insert into public.nflverse_team_weekly_stats (team_id, season, week, season_type, game_id, opponent_team_id, points_for, points_against, stats, ingest_event_id)
  values ('omen:team:buf', 2026, 4, 'REG', '2026_04_MIA_BUF', 'omen:team:mia', 31, 17, '{"def_sacks": 4}', ev);
  insert into public.nflverse_team_weekly_stats (team_id, season, week, season_type, game_id, opponent_team_id, points_for, points_against, stats, ingest_event_id)
  values ('omen:team:buf', 2026, 4, 'REG', '2026_04_MIA_BUF', 'omen:team:mia', 31, 20, '{"def_sacks": 5}', ev)
  on conflict (team_id, season, week) do update set points_against = excluded.points_against, stats = excluded.stats;
  if (select points_against from public.nflverse_team_weekly_stats where team_id = 'omen:team:buf') <> 20 then
    raise exception 'FAIL 15: team-week upsert did not replace the row';
  end if;
  begin
    insert into public.nflverse_team_weekly_stats (team_id, season, week, season_type, ingest_event_id) values ('omen:team:buf', 2026, 5, 'PRE', ev);
    raise exception 'FAIL 15: a preseason team-week was accepted';
  exception when check_violation then null;
  end;

  -- Games: a scheduled game has no score yet; a played one is upserted with it.
  insert into public.nflverse_games (game_id, season, week, game_type, gameday, away_team_id, home_team_id, spread_line, total_line, roof, ingest_event_id)
  values ('2026_05_BUF_NE', 2026, 5, 'REG', '2026-10-11', 'omen:team:buf', 'omen:team:ne', -3.5, 44.5, 'outdoors', ev);
  insert into public.nflverse_games (game_id, season, week, game_type, away_team_id, home_team_id, away_score, home_score, spread_line, total_line, ingest_event_id)
  values ('2026_05_BUF_NE', 2026, 5, 'REG', 'omen:team:buf', 'omen:team:ne', 27, 20, -3.5, 44.5, ev)
  on conflict (game_id) do update set away_score = excluded.away_score, home_score = excluded.home_score;
  if (select away_score from public.nflverse_games where game_id = '2026_05_BUF_NE') <> 27 then
    raise exception 'FAIL 15: game upsert did not record the score';
  end if;
  begin
    insert into public.nflverse_games (game_id, season, week, game_type, away_team_id, home_team_id, ingest_event_id)
    values ('x', 2026, 1, 'PRE', 'omen:team:buf', 'omen:team:ne', ev);
    raise exception 'FAIL 15: a preseason game was accepted';
  exception when check_violation then null;
  end;

  -- Weekly roster: a player traded mid-week can appear for two teams in one week.
  insert into public.nflverse_weekly_rosters (player_id, season, week, team_id, position, status, ingest_event_id)
  values ('omen:player:gsis.00-0034857', 2026, 4, 'omen:team:buf', 'QB', 'ACT', ev),
         ('omen:player:gsis.00-0034857', 2026, 4, 'omen:team:mia', 'QB', 'ACT', ev);
  begin
    insert into public.nflverse_weekly_rosters (player_id, season, week, team_id, ingest_event_id)
    values ('omen:player:gsis.00-9999999', 2026, 4, 'omen:team:buf', ev);
    raise exception 'FAIL 15: a roster row for an unknown player was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

rollback;
