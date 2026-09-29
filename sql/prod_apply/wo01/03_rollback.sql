-- 03_rollback.sql
-- Rolls back the changes made by 01_apply.sql

-- 1. WAITLIST SIGNUPS
drop policy if exists waitlist_anon_insert on public.waitlist_signups;
revoke insert on table public.waitlist_signups from anon, authenticated;

-- 2. PLATFORM CONNECTIONS
drop policy if exists platforms_self_insert on public.platform_connections;
drop policy if exists platforms_self_update on public.platform_connections;
drop policy if exists platforms_self_delete on public.platform_connections;
-- Before WO-01, platform_connections only had SELECT-only coverage. Revoke INSERT, UPDATE, DELETE grants.
revoke insert, update, delete on table public.platform_connections from authenticated;

-- 3. OAUTH STATE
drop policy if exists oauth_state_self_select on public.oauth_state;
drop policy if exists oauth_state_self_insert on public.oauth_state;
drop policy if exists oauth_state_self_update on public.oauth_state;
drop policy if exists oauth_state_self_delete on public.oauth_state;
revoke select, insert, update, delete on table public.oauth_state from authenticated;

-- 4. LEAGUE OFFICE TABLES
-- league_office_sync_jobs
drop policy if exists league_office_sync_jobs_self_select on public.league_office_sync_jobs;
drop policy if exists league_office_sync_jobs_self_insert on public.league_office_sync_jobs;
drop policy if exists league_office_sync_jobs_self_update on public.league_office_sync_jobs;
drop policy if exists league_office_sync_jobs_self_delete on public.league_office_sync_jobs;
revoke select, insert, update, delete on table public.league_office_sync_jobs from authenticated;

-- league_office_matchups
drop policy if exists league_office_matchups_self_select on public.league_office_matchups;
drop policy if exists league_office_matchups_self_insert on public.league_office_matchups;
drop policy if exists league_office_matchups_self_update on public.league_office_matchups;
drop policy if exists league_office_matchups_self_delete on public.league_office_matchups;
revoke select, insert, update, delete on table public.league_office_matchups from authenticated;

-- league_office_executives
drop policy if exists league_office_executives_self_select on public.league_office_executives;
drop policy if exists league_office_executives_self_insert on public.league_office_executives;
drop policy if exists league_office_executives_self_update on public.league_office_executives;
drop policy if exists league_office_executives_self_delete on public.league_office_executives;
revoke select, insert, update, delete on table public.league_office_executives from authenticated;

-- league_office_rivalries
drop policy if exists league_office_rivalries_self_select on public.league_office_rivalries;
drop policy if exists league_office_rivalries_self_insert on public.league_office_rivalries;
drop policy if exists league_office_rivalries_self_update on public.league_office_rivalries;
drop policy if exists league_office_rivalries_self_delete on public.league_office_rivalries;
revoke select, insert, update, delete on table public.league_office_rivalries from authenticated;

-- league_office_lines
drop policy if exists league_office_lines_self_select on public.league_office_lines;
drop policy if exists league_office_lines_self_insert on public.league_office_lines;
drop policy if exists league_office_lines_self_update on public.league_office_lines;
drop policy if exists league_office_lines_self_delete on public.league_office_lines;
revoke select, insert, update, delete on table public.league_office_lines from authenticated;

-- league_office_awards
drop policy if exists league_office_awards_self_select on public.league_office_awards;
drop policy if exists league_office_awards_self_insert on public.league_office_awards;
drop policy if exists league_office_awards_self_update on public.league_office_awards;
drop policy if exists league_office_awards_self_delete on public.league_office_awards;
revoke select, insert, update, delete on table public.league_office_awards from authenticated;

-- league_office_accolades
drop policy if exists league_office_accolades_self_select on public.league_office_accolades;
drop policy if exists league_office_accolades_self_insert on public.league_office_accolades;
drop policy if exists league_office_accolades_self_update on public.league_office_accolades;
drop policy if exists league_office_accolades_self_delete on public.league_office_accolades;
revoke select, insert, update, delete on table public.league_office_accolades from authenticated;
