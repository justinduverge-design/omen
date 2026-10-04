-- READ-ONLY. Post-checks for step 06, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 06' when every check holds.
do $$
begin
  if exists (select 1 from public.projection_snapshots) or exists (select 1 from public.projection_shadow_log) then
    raise exception 'step 06: projection tables should start empty';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'projection_snapshots_check_ingest') then
    raise exception 'step 06: the ingest check trigger is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.data_events'::regclass) then raise exception 'post-check: RLS off on data_events'; end if;
  if has_table_privilege('anon', 'public.data_events', 'select') or has_table_privilege('anon', 'public.data_events', 'insert') or has_table_privilege('authenticated', 'public.data_events', 'insert') or has_table_privilege('authenticated', 'public.data_events', 'update') or has_table_privilege('authenticated', 'public.data_events', 'delete') then raise exception 'post-check: a client role can write or anon can read data_events'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.projection_snapshots'::regclass) then raise exception 'post-check: RLS off on projection_snapshots'; end if;
  if has_table_privilege('anon', 'public.projection_snapshots', 'select') or has_table_privilege('anon', 'public.projection_snapshots', 'insert') or has_table_privilege('authenticated', 'public.projection_snapshots', 'insert') or has_table_privilege('authenticated', 'public.projection_snapshots', 'update') or has_table_privilege('authenticated', 'public.projection_snapshots', 'delete') then raise exception 'post-check: a client role can write or anon can read projection_snapshots'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.projection_shadow_log'::regclass) then raise exception 'post-check: RLS off on projection_shadow_log'; end if;
  if has_table_privilege('anon', 'public.projection_shadow_log', 'select') or has_table_privilege('anon', 'public.projection_shadow_log', 'insert') or has_table_privilege('authenticated', 'public.projection_shadow_log', 'insert') or has_table_privilege('authenticated', 'public.projection_shadow_log', 'update') or has_table_privilege('authenticated', 'public.projection_shadow_log', 'delete') then raise exception 'post-check: a client role can write or anon can read projection_shadow_log'; end if;
  if to_regprocedure('public.projections_purge(text, text, text)') is null then raise exception 'post-check: public.projections_purge(text, text, text) missing'; end if;
  if has_function_privilege('anon', 'public.projections_purge(text, text, text)', 'execute') or has_function_privilege('authenticated', 'public.projections_purge(text, text, text)', 'execute') then raise exception 'post-check: a client role can execute public.projections_purge(text, text, text)'; end if;
  if not has_function_privilege('service_role', 'public.projections_purge(text, text, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.projections_purge(text, text, text)'; end if;
  raise notice 'VERIFIED 06';
end $$;
