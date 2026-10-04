-- READ-ONLY. Post-checks for step 01, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 01' when every check holds.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_id_auth_users_fkey' and convalidated) then
    raise exception 'step 01: users -> auth.users foreign key missing or not validated';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users'
                  and column_name = 'updated_at' and is_nullable = 'NO') then
    raise exception 'step 01: users.updated_at missing';
  end if;
  if exists (select 1 from public.users u where not exists (select 1 from auth.users a where a.id = u.id)) then
    raise exception 'step 01: a users row has no sign-in identity';
  end if;
  raise notice 'VERIFIED 01';
end $$;
