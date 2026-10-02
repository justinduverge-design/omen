-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8: founder approval -> staging (restored clone) ->
-- verification -> production. Authoring this file authorizes nothing.
--
-- Step 01 — tie every app user to its sign-in identity. Replaces the merged-but-unapplied WO-06
-- migration (`migrations/1790735188136_identity-unification.js`), which deletes rows.
-- This step deletes nothing and rewrites no row.
--
-- What it does:
--   1. Aborts unless every public.users.id already exists in auth.users (measured 2026-10-01: 7 of 7).
--      If this ever fails, the step is wrong for that day's data; do not "fix" it by deleting users.
--   2. Adds users.id -> auth.users(id) as NOT VALID, then VALIDATE (no long lock, checks every row).
--      ON DELETE NO ACTION on purpose: removing a sign-in account in the Supabase dashboard must fail
--      while Omen still holds that user's rows, because only the app's deletion route also deletes the
--      user's Vault secrets. A cascade here would strand ESPN cookies and Yahoo tokens in Vault.
--   3. Adds users.updated_at (NOT NULL, default now()). `GET /api/user/export` selects it today and
--      production lacks it (review finding 3).
--
-- Not done here (later, separately approved): dropping users.platform / league_id / team_name (empty
-- in all rows on 2026-10-01), dropping users.email (the server still requires it).

begin;

do $$
declare orphans int;
begin
  select count(*) into orphans from public.users u where not exists (select 1 from auth.users a where a.id = u.id);
  if orphans <> 0 then
    raise exception 'step 01 preflight: % public.users row(s) have no auth.users identity; stop and review, never delete', orphans;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'updated_at') then
    raise exception 'step 01 preflight: users.updated_at already exists; step 01 was applied or production drifted';
  end if;
end $$;

alter table public.users
  add constraint users_id_auth_users_fkey foreign key (id) references auth.users(id) on delete no action not valid;
alter table public.users validate constraint users_id_auth_users_fkey;

alter table public.users add column updated_at timestamptz not null default now();

commit;
