-- READ-ONLY. Post-checks for step 09, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 09' when every check holds.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.beta_reports'::regclass) then raise exception 'post-check: RLS off on beta_reports'; end if;
  if has_table_privilege('anon', 'public.beta_reports', 'select') or has_table_privilege('anon', 'public.beta_reports', 'insert') or has_table_privilege('authenticated', 'public.beta_reports', 'insert') or has_table_privilege('authenticated', 'public.beta_reports', 'update') or has_table_privilege('authenticated', 'public.beta_reports', 'delete') then raise exception 'post-check: a client role can write or anon can read beta_reports'; end if;
  if to_regprocedure('public.beta_reports_purge_expired()') is null then raise exception 'post-check: public.beta_reports_purge_expired() missing'; end if;
  if has_function_privilege('anon', 'public.beta_reports_purge_expired()', 'execute') or has_function_privilege('authenticated', 'public.beta_reports_purge_expired()', 'execute') then raise exception 'post-check: a client role can execute public.beta_reports_purge_expired()'; end if;
  if not has_function_privilege('service_role', 'public.beta_reports_purge_expired()', 'execute') then raise exception 'post-check: service_role cannot execute public.beta_reports_purge_expired()'; end if;
  raise notice 'VERIFIED 09';
end $$;
