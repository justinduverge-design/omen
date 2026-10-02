-- =================================================================
-- Omen production database hygiene + anon-grant hardening
-- -----------------------------------------------------------------
-- APPLIED to production (project xyudxfhqejbwvjngiwhw) on 2026-09-27.
-- This file is a provenance record of what actually ran, statement by
-- statement, in the order it ran. `sql/omen_rls_security.sql` is the
-- long-lived idempotent source of truth and was updated to match.
--
-- Prompted by a founder request to audit the whole database, not just
-- the football-intelligence table under review that day. Every claim
-- below (row counts, code references, exact grants/policies) was
-- verified directly against production and against a throwaway
-- Supabase project before anything here ran -- see
-- `Direction/decision_log.md` (2026-09-27 entry) for the full trail.
-- =================================================================

-- 1. Missing FK indexes (Supabase performance advisor: unindexed_foreign_keys)
create index if not exists idx_league_office_awards_user_id     on public.league_office_awards     (user_id);
create index if not exists idx_league_office_lines_user_id      on public.league_office_lines      (user_id);
create index if not exists idx_league_office_sync_jobs_user_id  on public.league_office_sync_jobs  (user_id);

-- 2. Consolidate drifted RLS policies to the canonical snake_case set in
--    omen_rls_security.sql (colon-named policies below existed live but
--    were never in that file -- created by some other one-off process and
--    never reconciled, producing the advisor's duplicate-policy and
--    per-row auth.uid() re-evaluation warnings). Also closes the
--    anon/authenticated full-CRUD default grant these four tables still
--    carried, with only RLS's auth.uid() check as the gate.

drop policy if exists "users: insert own" on public.users;
drop policy if exists "users: select own" on public.users;
drop policy if exists "users: update own" on public.users;
drop policy if exists "Users can view own profile" on public.users;
alter policy users_self_select on public.users to authenticated using ((select auth.uid()) = id);
alter policy users_self_insert on public.users to authenticated with check ((select auth.uid()) = id);
alter policy users_self_update on public.users to authenticated using ((select auth.uid()) = id);
revoke all on table public.users from anon, authenticated;
grant select, insert, update on table public.users to authenticated;

drop policy if exists "moves: insert own" on public.moves;
drop policy if exists "moves: select own" on public.moves;
drop policy if exists "moves: update own" on public.moves;
drop policy if exists "Users can view own moves" on public.moves;
alter policy moves_self_all on public.moves to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.moves from anon, authenticated;
grant select, insert, update on table public.moves to authenticated;

drop policy if exists "consent: insert own" on public.consent_records;
drop policy if exists "consent: select own" on public.consent_records;
drop policy if exists "consent: update own" on public.consent_records;
alter policy consent_self_select on public.consent_records to authenticated using ((select auth.uid()) = user_id);
alter policy consent_self_insert on public.consent_records to authenticated with check ((select auth.uid()) = user_id);
alter policy consent_self_update on public.consent_records to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.consent_records from anon, authenticated;
grant select, insert, update on table public.consent_records to authenticated;

-- platform_connections: drop insert/update policies this repo's source file
-- never created and that had no matching table grant (dead, and a deviation
-- from the documented read-only-via-RLS design), plus two redundant selects.
drop policy if exists "platform: insert own" on public.platform_connections;
drop policy if exists "platform: update own" on public.platform_connections;
drop policy if exists "platform: select own" on public.platform_connections;
drop policy if exists "Users can view own connections" on public.platform_connections;
alter policy platforms_self_select on public.platform_connections to authenticated using ((select auth.uid()) = user_id);

-- 3. Duplicate index (Supabase performance advisor: duplicate_index)
drop index if exists public.platform_user_id_idx;

-- 4. Dead tables -- verified 0 rows and 0 code references (grep across
--    src/, frontend/src/, mobile/) before dropping.
drop table if exists public.oauth_credentials cascade;
drop table if exists public.system_context cascade;

-- 5. Same anon/authenticated over-grant pattern, found by sweeping every
--    public table's grants after the above: these three carry zero RLS
--    policies (or an explicit `using (false)`), so access was already
--    denied by RLS -- this closes the grant layer too, so an accidental
--    `disable row level security` doesn't instantly expose them.
revoke all on table public.deletion_audit_log from anon, authenticated;
revoke all on table public.local_snapshots from anon, authenticated;
revoke all on table public.oauth_state from anon, authenticated;

-- =================================================================
-- Verification performed after each step (see decision log for full detail):
--   - get_advisors(security): 27 auth_rls_initplan + 22 multiple_permissive_policies
--     findings gone; only the pre-existing leaked_password_protection WARN and the
--     10 intentionally-policy-less RLS-enabled tables remain.
--   - get_advisors(performance): duplicate_index and unindexed_foreign_keys gone.
--   - information_schema.role_table_grants swept for anon/authenticated across
--     every public table: anon has zero grants anywhere; authenticated has
--     exactly select/insert/update on users, moves, consent_records.
--   - npm test: 1259/1259 (unaffected, as expected -- the backend always uses
--     the service-role key and never relies on RLS for its own authorization).
-- =================================================================
