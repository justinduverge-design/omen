-- REVIEW ONLY. Rollback for step 03. platform_connections was never modified, so the pre-step state
-- is restored by dropping what the step added. Lossless before the server writes follows; after that,
-- the followed sets and active selections stored here are lost on rollback (export them first:
-- `copy (select * from public.league_memberships) to stdout`).
begin;
drop function if exists public.league_select_active(uuid, text, text, integer);
drop function if exists public.league_follows_replace(uuid, text, integer, jsonb);
drop table if exists public.league_memberships;
drop function if exists public.league_memberships_check_connection();
drop table if exists public.leagues;
commit;
