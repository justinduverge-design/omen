-- Rollback for step 16. Lossless: indexes hold no data of their own.
begin;
drop index if exists public.projection_snapshots_league;
drop index if exists public.projection_shadow_log_league;
drop index if exists public.projection_shadow_log_player_week;
commit;
