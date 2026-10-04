-- READ-ONLY. Post-checks for step 15, run right after its up on production (and in the dry run).
do $$
declare t text;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'nflverse_weekly_stats' and column_name = 'stats') then
    raise exception 'post-check: nflverse_weekly_stats.stats missing';
  end if;
  if exists (select 1 from public.nflverse_team_weekly_stats) or exists (select 1 from public.nflverse_weekly_rosters)
     or exists (select 1 from public.nflverse_games) then
    raise exception 'step 15: the new tables should start empty (the daily job fills them)';
  end if;
  foreach t in array array['nflverse_team_weekly_stats', 'nflverse_weekly_rosters', 'nflverse_games', 'nflverse_weekly_stats'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception 'post-check: RLS off on %', t; end if;
    if exists (select 1 from pg_policies where tablename = t) then raise exception 'post-check: % must have no policies', t; end if;
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('authenticated', 'public.' || t, 'select')
       or has_table_privilege('authenticated', 'public.' || t, 'insert') or has_table_privilege('authenticated', 'public.' || t, 'update')
       or has_table_privilege('authenticated', 'public.' || t, 'delete') then
      raise exception 'post-check: a client role can read or write %', t;
    end if;
    if not has_table_privilege('service_role', 'public.' || t, 'insert') or not has_table_privilege('service_role', 'public.' || t, 'update') then
      raise exception 'post-check: service_role cannot write %', t;
    end if;
  end loop;
  raise notice 'VERIFIED 15';
end $$;
