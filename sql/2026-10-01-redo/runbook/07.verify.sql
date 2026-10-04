-- READ-ONLY. Post-checks for step 07, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 07' when every check holds.
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and policyname in
             ('moves_self_all', 'users_self_insert', 'users_self_update', 'consent_self_insert', 'consent_self_update')) then
    raise exception 'step 07: a client write policy remains';
  end if;
  if has_table_privilege('authenticated', 'public.moves', 'insert') or has_table_privilege('authenticated', 'public.moves', 'update')
     or has_table_privilege('authenticated', 'public.users', 'insert') or has_table_privilege('authenticated', 'public.users', 'update')
     or has_table_privilege('authenticated', 'public.consent_records', 'insert') or has_table_privilege('authenticated', 'public.consent_records', 'update') then
    raise exception 'step 07: authenticated can still write moves, users or consent_records';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'users_self_select') then
    raise exception 'step 07: the owner read policy on users was removed';
  end if;
  raise notice 'VERIFIED 07';
end $$;
