-- READ-ONLY. Post-checks for step 14, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 14' when every check holds.
do $$
begin
  if exists (select 1 from public.nflverse_weekly_stats) then
    raise exception 'step 14: nflverse_weekly_stats should start empty (the weekly job fills it)';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.nflverse_weekly_stats'::regclass) then raise exception 'post-check: RLS off on nflverse_weekly_stats'; end if;
  if exists (select 1 from pg_policies where tablename = 'nflverse_weekly_stats') then raise exception 'step 14: nflverse_weekly_stats must have no policies'; end if;
  if has_table_privilege('anon', 'public.nflverse_weekly_stats', 'select') or has_table_privilege('anon', 'public.nflverse_weekly_stats', 'insert') or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'select') or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'insert') or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'update') or has_table_privilege('authenticated', 'public.nflverse_weekly_stats', 'delete') then raise exception 'post-check: a client role can read or write nflverse_weekly_stats'; end if;
  if not has_table_privilege('service_role', 'public.nflverse_weekly_stats', 'insert') or not has_table_privilege('service_role', 'public.nflverse_weekly_stats', 'update') then raise exception 'post-check: service_role cannot write nflverse_weekly_stats'; end if;
  raise notice 'VERIFIED 14';
end $$;
