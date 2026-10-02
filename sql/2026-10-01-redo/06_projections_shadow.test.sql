-- SCRATCH ONLY. Assertions for step 06. Rolls back.
begin;

do $$
declare ev_sleeper bigint; ev_espn bigint; snap bigint; espn_snap bigint; lg uuid; res jsonb;
begin
  select id into lg from public.leagues where provider = 'espn' limit 1;

  -- Every batch is recorded before its rows are written; rows name their batch.
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'projections:sleeper', 'sleeper', 'sleeper_public_api', 'projection-ingest v1', 'sha256:' || repeat('a', 64), 1)
  returning id into ev_sleeper;
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'projections:espn', 'espn', 'espn_user_connection', 'projection-ingest v1', 'sha256:' || repeat('c', 64), 1)
  returning id into ev_espn;

  insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, provider_points, stat_line, opponent, fetched_at, source_ref)
  values (ev_sleeper, 'sleeper', '4984', 2026, 4, 'public', '{"ppr":23.12}',
          '{"pass_att":30.4,"pass_cmp":19.2,"pass_yd":227.4,"pass_td":1.2,"pass_int":0.46,"rush_att":8.3,"rush_yd":40.2,"rush_td":0.96}',
          'NE', now(), 'sha256:' || repeat('a', 64))
  returning id into snap;
  insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, league_id, provider_points, stat_line, fetched_at, source_ref)
  values (ev_espn, 'espn', '3918298', 2026, 4, 'league', lg, '{"league":22.8}', '{"passingYards":231}', now(), 'sha256:' || repeat('c', 64))
  returning id into espn_snap;

  insert into public.projection_shadow_log (provider, provider_player_id, season, week, projection_snapshot_id, provider_projection, points_basis, engine_version)
  values ('sleeper', '4984', 2026, 4, snap, 23.12, 'ppr', 'provider-only');
  insert into public.projection_shadow_log (provider, provider_player_id, season, week, projection_snapshot_id, provider_projection, points_basis, engine_version)
  values ('espn', '3918298', 2026, 4, espn_snap, 22.8, 'league', 'provider-only');

  -- Append-only.
  begin
    update public.projection_snapshots set provider_points = '{"ppr":30}' where id = snap;
    raise exception 'FAIL 06: a stored projection was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    -- A snapshot nothing references, so only the append-only rule can stop the delete.
    insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
    values (ev_sleeper, 'sleeper', '7777', 2026, 4, 'public', '{"ppr":1}', '{}', now(), 'sha256:' || repeat('f', 64));
    delete from public.projection_snapshots where provider_player_id = '7777';
    raise exception 'FAIL 06: a projection was deleted outside a purge';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.data_events where id = ev_sleeper;
    raise exception 'FAIL 06: a data record was deleted';
  exception when insufficient_privilege then null;
  end;

  -- An ingest must say under what terms and from what source; a deletion must say why and who approved.
  begin
    insert into public.data_events (event, subject, provider, job, row_count) values ('ingest', 'projections:espn', 'espn', 'x', 1);
    raise exception 'FAIL 06: ingest without rights basis or source accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.projections_purge('espn', 'rights review', '');
    raise exception 'FAIL 06: purge without an approver accepted';
  exception when invalid_parameter_value then null;
  end;

  -- A row cannot exist without its batch; a shadow row cannot cite another player's snapshot.
  begin
    insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
    values (999999, 'sleeper', '1', 2026, 4, 'public', '{}', '{}', now(), 'sha256:' || repeat('d', 64));
    raise exception 'FAIL 06: projection without a recorded batch accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.projection_shadow_log (provider, provider_player_id, season, week, projection_snapshot_id, provider_projection, points_basis, engine_version)
    values ('sleeper', '9999', 2026, 4, snap, 10, 'ppr', 'provider-only');
    raise exception 'FAIL 06: shadow row citing another player''s snapshot accepted';
  exception when check_violation then null;
  end;
  -- The provider's number must be the snapshot's number; it cannot be typed in independently.
  begin
    insert into public.projection_shadow_log (projection_snapshot_id, provider_projection, points_basis, engine_version)
    values (snap, 30.0, 'ppr', 'engine-x');
    raise exception 'FAIL 06: a provider projection that disagrees with its snapshot was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.projection_shadow_log (projection_snapshot_id, points_basis, engine_version)
    values (snap, 'half_ppr', 'engine-x');
    raise exception 'FAIL 06: a points basis the snapshot does not have was accepted';
  exception when check_violation then null;
  end;
  -- A writer can give only the snapshot; identity and the provider's number are filled from it.
  declare got public.projection_shadow_log%rowtype;
  begin
    insert into public.projection_shadow_log (projection_snapshot_id, points_basis, engine_version)
    values (snap, 'ppr', 'engine-x') returning * into got;
    if got.provider <> 'sleeper' or got.provider_player_id <> '4984' or got.week <> 4 or got.provider_projection <> 23.12 then
      raise exception 'FAIL 06: shadow row was not filled from its snapshot';
    end if;
  end;
  -- The same player in two leagues the same week: both league-scoped rows are logged.
  declare lg2 uuid; s1 bigint; s2 bigint;
  begin
    select id into lg2 from public.leagues where provider = 'espn' and id <> lg limit 1;
    insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, league_id, provider_points, stat_line, fetched_at, source_ref)
    values (ev_espn, 'espn', '4040', 2026, 4, 'league', lg, '{"league":18.0}', '{}', now(), 'sha256:' || repeat('1', 64)) returning id into s1;
    insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, league_id, provider_points, stat_line, fetched_at, source_ref)
    values (ev_espn, 'espn', '4040', 2026, 4, 'league', lg2, '{"league":16.5}', '{}', now(), 'sha256:' || repeat('2', 64)) returning id into s2;
    insert into public.projection_shadow_log (projection_snapshot_id, points_basis, engine_version) values (s1, 'league', 'provider-only');
    insert into public.projection_shadow_log (projection_snapshot_id, points_basis, engine_version) values (s2, 'league', 'provider-only');
    if (select count(*) from public.projection_shadow_log where provider_player_id = '4040') <> 2 then
      raise exception 'FAIL 06: one player in two leagues could not be logged twice';
    end if;
  end;
  begin
    insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
    values (ev_espn, 'espn', '1', 2026, 4, 'league', '{}', '{}', now(), 'sha256:' || repeat('e', 64));
    raise exception 'FAIL 06: league-scoped projection without a league accepted';
  exception when check_violation then null;
  end;

  -- The ESPN compartment is removed in one call; Sleeper is untouched; the purge is recorded.
  res := public.projections_purge('espn', 'founder test of the compartment', 'founder');
  if (res->>'projection_snapshots')::int <> 3 or (res->>'projection_shadow_log')::int <> 3 then
    raise exception 'FAIL 06: purge removed %', res;
  end if;
  if exists (select 1 from public.projection_snapshots where provider = 'espn') then raise exception 'FAIL 06: ESPN rows survived the purge'; end if;
  if (select count(*) from public.projection_snapshots where provider = 'sleeper') <> 1 then raise exception 'FAIL 06: purge touched Sleeper'; end if;
  if not exists (select 1 from public.data_events where event = 'purge' and subject = 'projections:espn' and approved_by = 'founder' and row_count = 6) then
    raise exception 'FAIL 06: purge was not recorded';
  end if;
  if not exists (select 1 from public.data_events where id = ev_espn) then raise exception 'FAIL 06: the ingest record was removed by the purge'; end if;
  if coalesce(current_setting('omen.compartment_purge', true), '') = 'on' then raise exception 'FAIL 06: purge flag left on'; end if;

  if has_table_privilege('authenticated', 'public.projection_snapshots', 'select') or has_table_privilege('anon', 'public.projection_shadow_log', 'insert')
     or has_table_privilege('authenticated', 'public.data_events', 'select')
     or has_function_privilege('authenticated', 'public.projections_purge(text, text, text)', 'execute') then
    raise exception 'FAIL 06: a client role can reach the projection compartment';
  end if;
end $$;

rollback;
