-- REVIEW ONLY. Rollback for step 06. Lossless until the server starts logging. After that the shadow
-- log's history cannot be re-created (its value is that it was written before the games), so export
-- both tables before rolling back.
begin;
drop table if exists public.projection_shadow_log;
drop table if exists public.projection_snapshots;
drop function if exists public.projections_append_only();
commit;
