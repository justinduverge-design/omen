-- SCRATCH ONLY. Assertions for step 14. Rolls back.
begin;

insert into public.players (id, full_name, position, nfl_team, birth_date, gsis_id) values
  ('omen:player:gsis.00-0034857', 'Josh Allen', 'QB', 'BUF', '1996-05-21', '00-0034857');

do $$
declare
  ev bigint;
  ev2 bigint;
  n integer;
  pts numeric;
begin
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'nflverse_weekly_stats', 'nflverse', 'nflverse_open_data', 'nflverse-weekly-stats v1', 'sha256:' || repeat('a', 64), 1)
  returning id into ev;
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'nflverse_weekly_stats', 'nflverse', 'nflverse_open_data', 'nflverse-weekly-stats v1', 'sha256:' || repeat('b', 64), 1)
  returning id into ev2;

  -- Server-only: RLS on and no policies at all.
  if not (select relrowsecurity from pg_class where oid = 'public.nflverse_weekly_stats'::regclass) then
    raise exception 'FAIL 14: RLS is off';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'nflverse_weekly_stats') then
    raise exception 'FAIL 14: a policy exists on a server-only table';
  end if;
  if has_table_privilege('anon', 'public.nflverse_weekly_stats', 'select')
     or has_table_privilege('anon', 'public.nflverse_weekly_stats', 'insert')
     or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'select')
     or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'insert')
     or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'update')
     or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'delete') then
    raise exception 'FAIL 14: a client role has privileges on nflverse_weekly_stats';
  end if;

  -- service_role writes: insert, then upsert by primary key replaces the row.
  set local role service_role;
  insert into public.nflverse_weekly_stats (player_id, season, week, pass_yards, pass_tds, snaps, snap_share, fantasy_points_ppr, ingest_event_id)
  values ('omen:player:gsis.00-0034857', 2026, 4, 227, 1, 60, 0.97, 18.3, ev);
  insert into public.nflverse_weekly_stats (player_id, season, week, pass_yards, pass_tds, snaps, snap_share, fantasy_points_ppr, ingest_event_id)
  values ('omen:player:gsis.00-0034857', 2026, 4, 231, 2, 61, 0.98, 20.2, ev2)
  on conflict (player_id, season, week) do update set
    pass_yards = excluded.pass_yards, pass_tds = excluded.pass_tds, snaps = excluded.snaps,
    snap_share = excluded.snap_share, fantasy_points_ppr = excluded.fantasy_points_ppr,
    ingest_event_id = excluded.ingest_event_id;
  select count(*), max(fantasy_points_ppr) into n, pts from public.nflverse_weekly_stats;
  if n <> 1 or pts <> 20.2 then raise exception 'FAIL 14: upsert by primary key gave % rows, ppr %', n, pts; end if;
  if (select ingest_event_id from public.nflverse_weekly_stats) <> ev2 then
    raise exception 'FAIL 14: the upserted row does not name the latest ingest';
  end if;
  reset role;

  -- Client roles are refused outright (no privilege, so not even an empty result).
  set local role anon;
  begin
    perform 1 from public.nflverse_weekly_stats;
    raise exception 'FAIL 14: anon read nflverse_weekly_stats';
  exception when insufficient_privilege then null;
  end;
  reset role;
  set local role authenticated;
  begin
    perform 1 from public.nflverse_weekly_stats;
    raise exception 'FAIL 14: authenticated read nflverse_weekly_stats';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week, ingest_event_id)
    values ('omen:player:gsis.00-0034857', 2026, 5, ev);
    raise exception 'FAIL 14: authenticated wrote nflverse_weekly_stats';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- One row per player-week: a plain second insert is refused.
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week, ingest_event_id)
    values ('omen:player:gsis.00-0034857', 2026, 4, ev);
    raise exception 'FAIL 14: a duplicate (player, season, week) was accepted';
  exception when unique_violation then null;
  end;

  -- The key and the batch are required.
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week, ingest_event_id)
    values ('omen:player:gsis.00-0034857', 2026, null, ev);
    raise exception 'FAIL 14: a null week was accepted';
  exception when not_null_violation then null;
  end;
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week) values ('omen:player:gsis.00-0034857', 2026, 6);
    raise exception 'FAIL 14: a row with no ingest event was accepted';
  exception when not_null_violation then null;
  end;

  -- Unknown player or batch: refused (the job never guesses a player; it skips and logs).
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week, ingest_event_id)
    values ('omen:player:gsis.00-9999999', 2026, 4, ev);
    raise exception 'FAIL 14: a row for an unknown player was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.nflverse_weekly_stats (player_id, season, week, ingest_event_id)
    values ('omen:player:gsis.00-0034857', 2026, 7, -1);
    raise exception 'FAIL 14: a row citing a missing ingest event was accepted';
  exception when foreign_key_violation then null;
  end;

  -- Restrict on players: a player with stats cannot be deleted out from under them.
  begin
    delete from public.players where id = 'omen:player:gsis.00-0034857';
    raise exception 'FAIL 14: a player with weekly stats was deleted';
  exception when foreign_key_violation then null;
  end;

  -- Restrict on data_events: the record is append-only (step 06), so a plain delete is refused by that
  -- guard; even with the purge flag lifting the guard, the foreign key still refuses.
  begin
    delete from public.data_events where id = ev2;
    raise exception 'FAIL 14: an ingest event was deleted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('omen.compartment_purge', 'on', true);
  begin
    delete from public.data_events where id = ev2;
    raise exception 'FAIL 14: an ingest event with weekly stats was deleted past the foreign key';
  exception when foreign_key_violation then null;
  end;
  perform set_config('omen.compartment_purge', '', true);
end $$;

rollback;
