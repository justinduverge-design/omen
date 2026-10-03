-- READ-ONLY. Post-checks for step 12, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 12' when every check holds.
do $$
begin
  if exists (select 1 from public.saved_trades) then
    raise exception 'step 12: saved_trades should start empty';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_trades' and policyname = 'saved_trades_owner_select') then
    raise exception 'step 12: the owner read policy is missing';
  end if;
  if (select confdeltype from pg_constraint where conrelid = 'public.saved_trades'::regclass and contype = 'f') <> 'c' then
    raise exception 'step 12: saved_trades must cascade from users';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.saved_trades'::regclass) then raise exception 'post-check: RLS off on saved_trades'; end if;
  if has_table_privilege('anon', 'public.saved_trades', 'select') or has_table_privilege('anon', 'public.saved_trades', 'insert') or has_table_privilege('authenticated', 'public.saved_trades', 'insert') or has_table_privilege('authenticated', 'public.saved_trades', 'update') or has_table_privilege('authenticated', 'public.saved_trades', 'delete') then raise exception 'post-check: a client role can write or anon can read saved_trades'; end if;
  raise notice 'VERIFIED 12';
end $$;
