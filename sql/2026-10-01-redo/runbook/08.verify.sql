-- READ-ONLY. Post-checks for step 08, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 08' when every check holds.
do $$
begin
  if exists (select 1 from public.moves where platform is null or league_id is null) then
    raise exception 'step 08: unscoped moves remain';
  end if;
  if (select count(*) from public.retired_rows where source_table = 'moves') <> 6 then
    raise exception 'step 08: expected exactly 6 held copies';
  end if;
  if not exists (select 1 from public.data_events where event = 'retire' and subject = 'moves') then
    raise exception 'step 08: the retirement was not recorded';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.retired_rows'::regclass) then raise exception 'post-check: RLS off on retired_rows'; end if;
  if has_table_privilege('anon', 'public.retired_rows', 'select') or has_table_privilege('anon', 'public.retired_rows', 'insert') or has_table_privilege('authenticated', 'public.retired_rows', 'insert') or has_table_privilege('authenticated', 'public.retired_rows', 'update') or has_table_privilege('authenticated', 'public.retired_rows', 'delete') then raise exception 'post-check: a client role can write or anon can read retired_rows'; end if;
  if to_regprocedure('public.retired_rows_purge_due()') is null then raise exception 'post-check: public.retired_rows_purge_due() missing'; end if;
  if has_function_privilege('anon', 'public.retired_rows_purge_due()', 'execute') or has_function_privilege('authenticated', 'public.retired_rows_purge_due()', 'execute') then raise exception 'post-check: a client role can execute public.retired_rows_purge_due()'; end if;
  if not has_function_privilege('service_role', 'public.retired_rows_purge_due()', 'execute') then raise exception 'post-check: service_role cannot execute public.retired_rows_purge_due()'; end if;
  raise notice 'VERIFIED 08';
end $$;
