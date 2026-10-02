-- SCRATCH ONLY. Assertions for step 06. Rolls back.
begin;

do $$
declare snap bigint;
begin
  insert into public.projection_snapshots (provider, provider_player_id, season, week, scope, provider_points, stat_line, opponent, fetched_at, source_ref)
  values ('sleeper', '4984', 2026, 4, 'public', '{"ppr":23.12}',
          '{"pass_att":30.4,"pass_cmp":19.2,"pass_yd":227.4,"pass_td":1.2,"pass_int":0.46,"rush_att":8.3,"rush_yd":40.2,"rush_td":0.96}',
          'NE', now(), 'sha256:' || repeat('a', 64))
  returning id into snap;

  insert into public.projection_shadow_log (provider, provider_player_id, season, week, projection_snapshot_id, provider_projection, points_basis, engine_version)
  values ('sleeper', '4984', 2026, 4, snap, 23.12, 'ppr', 'provider-only');

  begin
    update public.projection_snapshots set provider_points = '{"ppr":30}' where id = snap;
    raise exception 'FAIL 06: a stored projection was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.projection_shadow_log (provider, provider_player_id, season, week, projection_snapshot_id, provider_projection, points_basis, engine_version)
    values ('sleeper', '4984', 2026, 4, snap, 25.0, 'ppr', 'provider-only');
    raise exception 'FAIL 06: a second shadow entry for the same player-week and engine accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.projection_snapshots (provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
    values ('espn', '3918298', 2026, 4, 'league', '{"league":20}', '{}', now(), 'sha256:' || repeat('b', 64));
    raise exception 'FAIL 06: a league-scoped projection without a league accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.projection_snapshots (provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
    values ('sleeper', '1', 2026, 4, 'public', '{}', '{}', now(), 'not-a-hash');
    raise exception 'FAIL 06: a projection without a content hash accepted';
  exception when check_violation then null;
  end;
  if has_table_privilege('authenticated', 'public.projection_snapshots', 'select') or has_table_privilege('anon', 'public.projection_shadow_log', 'insert') then
    raise exception 'FAIL 06: a client role can reach projections';
  end if;
end $$;

rollback;
