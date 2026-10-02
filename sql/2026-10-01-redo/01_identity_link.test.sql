-- SCRATCH ONLY. Assertions for step 01, run after the up step. Every check raises on failure.
-- Wrapped in a transaction that rolls back, so the test leaves no trace.
begin;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_id_auth_users_fkey' and convalidated) then
    raise exception 'FAIL 01: users -> auth.users foreign key missing or not validated';
  end if;
  if exists (select 1 from public.users where updated_at is null) then
    raise exception 'FAIL 01: users.updated_at has nulls';
  end if;
end $$;

-- An app user without a sign-in identity is now refused.
do $$
begin
  begin
    insert into public.users (id, email) values ('00000000-0000-4000-8000-0000000000aa', 'nobody@example.test');
    raise exception 'FAIL 01: insert without auth identity succeeded';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Deleting a sign-in identity that still owns Omen rows is refused (no silent cascade past Vault).
do $$
begin
  begin
    delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'FAIL 01: auth user with Omen rows was deleted';
  exception when foreign_key_violation then null;
  end;
end $$;

rollback;
