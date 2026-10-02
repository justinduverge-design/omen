-- SCRATCH ONLY. Assertions for step 03. Rolls back.
begin;

do $$
begin
  if (select count(*) from public.league_memberships) <> 10 then raise exception 'FAIL 03: expected 10 backfilled memberships'; end if;
  if (select count(*) from public.league_memberships where is_active_selection) <>
     (select count(*) from public.platform_connections where is_selected) then
    raise exception 'FAIL 03: active selections not carried over';
  end if;
  if exists (select 1 from public.league_memberships m join public.platform_connections pc on pc.id = m.connection_id
              where pc.platform = 'espn' and m.provider_team_id is distinct from pc.espn_team_id) then
    raise exception 'FAIL 03: ESPN team ids not carried over';
  end if;
end $$;

-- Clients have no access at all.
do $$
begin
  if has_table_privilege('authenticated', 'public.leagues', 'select')
     or has_table_privilege('anon', 'public.league_memberships', 'select')
     or has_table_privilege('authenticated', 'public.league_memberships', 'insert') then
    raise exception 'FAIL 03: a client role can reach leagues/memberships';
  end if;
end $$;

-- A multiselect of three ESPN leagues persists, and a second call replaces the set.
do $$
declare n int;
begin
  n := public.league_follows_replace('00000000-0000-4000-8000-000000000001', 'espn', 2026,
    '[{"league_id":"100001","team_id":"3","league_name":"A"},{"league_id":"300001","team_id":"5","league_name":"B"},{"league_id":"300002","team_id":"1","league_name":"C"}]');
  if n <> 3 then raise exception 'FAIL 03: expected 3 follows, got %', n; end if;
  if (select count(*) from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001' and is_followed) <> 3 then
    raise exception 'FAIL 03: three follows did not persist';
  end if;
  perform public.league_select_active('00000000-0000-4000-8000-000000000001', 'espn', '300002', 2026);
  -- Drop the active league from the set: it is unfollowed and the selection is cleared.
  perform public.league_follows_replace('00000000-0000-4000-8000-000000000001', 'espn', 2026, '[{"league_id":"100001","team_id":"3"}]');
  if (select count(*) from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001' and is_followed) <> 1 then
    raise exception 'FAIL 03: replace did not unfollow the others';
  end if;
  if exists (select 1 from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001' and is_active_selection) then
    raise exception 'FAIL 03: an unfollowed league stayed active';
  end if;
  if (select count(*) from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'FAIL 03: unfollowed memberships were deleted instead of kept';
  end if;
end $$;

-- All-or-nothing: one bad entry leaves the previous set untouched.
do $$
declare before_set text; after_set text;
begin
  select string_agg(league_id::text || is_followed::text, ',' order by league_id) into before_set
    from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001';
  begin
    perform public.league_follows_replace('00000000-0000-4000-8000-000000000001', 'espn', 2026,
      '[{"league_id":"400001"},{"league_id":"espn"}]');
    raise exception 'FAIL 03: the placeholder league id was accepted';
  exception when check_violation then null;
  end;
  select string_agg(league_id::text || is_followed::text, ',' order by league_id) into after_set
    from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000001';
  if before_set is distinct from after_set then raise exception 'FAIL 03: a failed replace changed the set'; end if;
end $$;

-- A membership cannot point at another user's connection, or at another provider's league.
do $$
begin
  begin
    insert into public.league_memberships (user_id, league_id, connection_id, source)
    select '00000000-0000-4000-8000-000000000002', l.id, pc.id, 'follow'
      from public.leagues l, public.platform_connections pc
     where l.provider = 'espn' and pc.user_id = '00000000-0000-4000-8000-000000000003' and pc.platform = 'espn' limit 1;
    raise exception 'FAIL 03: cross-user membership accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.league_memberships (user_id, league_id, connection_id, source)
    select '00000000-0000-4000-8000-000000000004', l.id, pc.id, 'follow'
      from public.leagues l, public.platform_connections pc
     where l.provider = 'espn' and l.provider_league_id = '100005' and pc.user_id = '00000000-0000-4000-8000-000000000004' and pc.platform = 'sleeper';
    raise exception 'FAIL 03: cross-provider membership accepted';
  exception when check_violation then null;
  end;
end $$;

-- Disconnecting a provider removes its memberships with it; leagues (shared) stay.
do $$
begin
  delete from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000004' and platform = 'sleeper';
  if exists (select 1 from public.league_memberships m join public.leagues l on l.id = m.league_id
              where m.user_id = '00000000-0000-4000-8000-000000000004' and l.provider = 'sleeper') then
    raise exception 'FAIL 03: memberships survived the disconnect';
  end if;
  if not exists (select 1 from public.leagues where provider = 'sleeper' and provider_league_id = '998877665501') then
    raise exception 'FAIL 03: shared league row was removed';
  end if;
end $$;

rollback;
