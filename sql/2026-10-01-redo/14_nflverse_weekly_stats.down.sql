-- REVIEW ONLY. Rollback for step 14. Lossless in substance: every row is rebuilt by the weekly job from
-- nflverse's public weekly files (re-run it for each season and week wanted). The data_events ingest
-- records stay, since that table is append-only and belongs to step 06.
begin;
drop table if exists public.nflverse_weekly_stats;
commit;
