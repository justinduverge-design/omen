-- REVIEW ONLY. Rollback for step 15. Lossless in substance: every row and column it adds is rebuilt by the
-- daily nflverse job from public nflverse files. Step 14's typed columns and rows stay. The data_events
-- ingest records stay (append-only, step 06).
begin;
drop table if exists public.nflverse_games;
drop table if exists public.nflverse_weekly_rosters;
drop table if exists public.nflverse_team_weekly_stats;
drop index if exists public.nflverse_weekly_stats_team_week;
alter table public.nflverse_weekly_stats
  drop column if exists opportunity,
  drop column if exists stats,
  drop column if exists position,
  drop column if exists season_type,
  drop column if exists game_id,
  drop column if exists opponent,
  drop column if exists team;
commit;
