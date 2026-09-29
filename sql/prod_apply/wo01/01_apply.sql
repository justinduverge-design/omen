-- =================================================================
-- WO-01 — RLS policy repair (Omen rebuild, Gate 1, Wave 0)
-- -----------------------------------------------------------------
-- Idempotent script to apply missing RLS policies to 9 tables.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. WAITLIST SIGNUPS
-- Allow PUBLIC ANONYMOUS INSERT. No public SELECT/UPDATE/DELETE.
-- -----------------------------------------------------------------
grant insert on table public.waitlist_signups to anon, authenticated;

drop policy if exists waitlist_anon_insert on public.waitlist_signups;
create policy waitlist_anon_insert on public.waitlist_signups for insert to anon, authenticated with check (true);


-- -----------------------------------------------------------------
-- 2. PLATFORM CONNECTIONS
-- Add owner-scoped INSERT/UPDATE/DELETE. (SELECT is already covered)
-- -----------------------------------------------------------------
grant insert, update, delete on table public.platform_connections to authenticated;

drop policy if exists platforms_self_insert on public.platform_connections;
create policy platforms_self_insert on public.platform_connections for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists platforms_self_update on public.platform_connections;
create policy platforms_self_update on public.platform_connections for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists platforms_self_delete on public.platform_connections;
create policy platforms_self_delete on public.platform_connections for delete to authenticated using ((select auth.uid()) = user_id);


-- -----------------------------------------------------------------
-- 3. OAUTH STATE
-- Owner-scoped policies (SELECT/INSERT/UPDATE/DELETE).
-- -----------------------------------------------------------------
grant select, insert, update, delete on table public.oauth_state to authenticated;

drop policy if exists oauth_state_self_select on public.oauth_state;
create policy oauth_state_self_select on public.oauth_state for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists oauth_state_self_insert on public.oauth_state;
create policy oauth_state_self_insert on public.oauth_state for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists oauth_state_self_update on public.oauth_state;
create policy oauth_state_self_update on public.oauth_state for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists oauth_state_self_delete on public.oauth_state;
create policy oauth_state_self_delete on public.oauth_state for delete to authenticated using ((select auth.uid()) = user_id);


-- -----------------------------------------------------------------
-- 4. LEAGUE OFFICE TABLES
-- Owner-scoped policies (SELECT/INSERT/UPDATE/DELETE).
-- -----------------------------------------------------------------

-- league_office_sync_jobs
grant select, insert, update, delete on table public.league_office_sync_jobs to authenticated;

drop policy if exists league_office_sync_jobs_self_select on public.league_office_sync_jobs;
create policy league_office_sync_jobs_self_select on public.league_office_sync_jobs for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_sync_jobs_self_insert on public.league_office_sync_jobs;
create policy league_office_sync_jobs_self_insert on public.league_office_sync_jobs for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_sync_jobs_self_update on public.league_office_sync_jobs;
create policy league_office_sync_jobs_self_update on public.league_office_sync_jobs for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_sync_jobs_self_delete on public.league_office_sync_jobs;
create policy league_office_sync_jobs_self_delete on public.league_office_sync_jobs for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_matchups
grant select, insert, update, delete on table public.league_office_matchups to authenticated;

drop policy if exists league_office_matchups_self_select on public.league_office_matchups;
create policy league_office_matchups_self_select on public.league_office_matchups for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_matchups_self_insert on public.league_office_matchups;
create policy league_office_matchups_self_insert on public.league_office_matchups for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_matchups_self_update on public.league_office_matchups;
create policy league_office_matchups_self_update on public.league_office_matchups for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_matchups_self_delete on public.league_office_matchups;
create policy league_office_matchups_self_delete on public.league_office_matchups for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_executives
grant select, insert, update, delete on table public.league_office_executives to authenticated;

drop policy if exists league_office_executives_self_select on public.league_office_executives;
create policy league_office_executives_self_select on public.league_office_executives for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_executives_self_insert on public.league_office_executives;
create policy league_office_executives_self_insert on public.league_office_executives for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_executives_self_update on public.league_office_executives;
create policy league_office_executives_self_update on public.league_office_executives for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_executives_self_delete on public.league_office_executives;
create policy league_office_executives_self_delete on public.league_office_executives for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_rivalries
grant select, insert, update, delete on table public.league_office_rivalries to authenticated;

drop policy if exists league_office_rivalries_self_select on public.league_office_rivalries;
create policy league_office_rivalries_self_select on public.league_office_rivalries for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_rivalries_self_insert on public.league_office_rivalries;
create policy league_office_rivalries_self_insert on public.league_office_rivalries for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_rivalries_self_update on public.league_office_rivalries;
create policy league_office_rivalries_self_update on public.league_office_rivalries for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_rivalries_self_delete on public.league_office_rivalries;
create policy league_office_rivalries_self_delete on public.league_office_rivalries for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_lines
grant select, insert, update, delete on table public.league_office_lines to authenticated;

drop policy if exists league_office_lines_self_select on public.league_office_lines;
create policy league_office_lines_self_select on public.league_office_lines for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_lines_self_insert on public.league_office_lines;
create policy league_office_lines_self_insert on public.league_office_lines for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_lines_self_update on public.league_office_lines;
create policy league_office_lines_self_update on public.league_office_lines for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_lines_self_delete on public.league_office_lines;
create policy league_office_lines_self_delete on public.league_office_lines for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_awards
grant select, insert, update, delete on table public.league_office_awards to authenticated;

drop policy if exists league_office_awards_self_select on public.league_office_awards;
create policy league_office_awards_self_select on public.league_office_awards for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_awards_self_insert on public.league_office_awards;
create policy league_office_awards_self_insert on public.league_office_awards for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_awards_self_update on public.league_office_awards;
create policy league_office_awards_self_update on public.league_office_awards for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_awards_self_delete on public.league_office_awards;
create policy league_office_awards_self_delete on public.league_office_awards for delete to authenticated using ((select auth.uid()) = user_id);


-- league_office_accolades
grant select, insert, update, delete on table public.league_office_accolades to authenticated;

drop policy if exists league_office_accolades_self_select on public.league_office_accolades;
create policy league_office_accolades_self_select on public.league_office_accolades for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_accolades_self_insert on public.league_office_accolades;
create policy league_office_accolades_self_insert on public.league_office_accolades for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists league_office_accolades_self_update on public.league_office_accolades;
create policy league_office_accolades_self_update on public.league_office_accolades for update to authenticated using ((select auth.uid()) = user_id);

drop policy if exists league_office_accolades_self_delete on public.league_office_accolades;
create policy league_office_accolades_self_delete on public.league_office_accolades for delete to authenticated using ((select auth.uid()) = user_id);
