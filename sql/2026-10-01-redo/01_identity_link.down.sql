-- REVIEW ONLY. Rollback for step 01. Restores the exact pre-step schema; no data was rewritten by
-- the up step, so nothing needs restoring beyond the two objects it added.
begin;
alter table public.users drop constraint if exists users_id_auth_users_fkey;
alter table public.users drop column if exists updated_at;
commit;
