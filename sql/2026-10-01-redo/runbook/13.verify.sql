-- READ-ONLY. Post-checks for step 13, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 13' when every check holds.
do $$
begin
  if exists (select 1 from public.football_intelligence_signals) then
    raise exception 'step 13: football_intelligence_signals should start empty';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'football_intelligence_signals' and policyname = 'football_intelligence_signals_published_select') then
    raise exception 'step 13: the published-only read policy is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.football_intelligence_signals'::regclass) then raise exception 'post-check: RLS off on football_intelligence_signals'; end if;
  if has_table_privilege('anon', 'public.football_intelligence_signals', 'select') or has_table_privilege('anon', 'public.football_intelligence_signals', 'insert') or has_table_privilege('authenticated', 'public.football_intelligence_signals', 'insert') or has_table_privilege('authenticated', 'public.football_intelligence_signals', 'update') or has_table_privilege('authenticated', 'public.football_intelligence_signals', 'delete') then raise exception 'post-check: a client role can write or anon can read football_intelligence_signals'; end if;
  if not has_table_privilege('service_role', 'public.football_intelligence_signals', 'insert') then raise exception 'post-check: service_role cannot write football_intelligence_signals'; end if;
  raise notice 'VERIFIED 13';
end $$;
