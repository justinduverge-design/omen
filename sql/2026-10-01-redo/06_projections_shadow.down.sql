-- REVIEW ONLY. Rollback for step 06. Lossless until the server starts writing. After that, the shadow
-- log's history cannot be re-created (its value is that it was written before the games) and the
-- data_events record is lost with it: export all three tables before rolling back, and keep the files
-- with the rollback record. Fails if step 08 is still applied (it writes to data_events): roll back 08 first.
begin;
drop function if exists public.projections_purge(text, text, text);
drop table if exists public.projection_shadow_log;
drop table if exists public.projection_snapshots;
drop function if exists public.projection_snapshots_check_ingest();
drop function if exists public.projection_shadow_log_check();
drop table if exists public.data_events;
drop function if exists public.compartment_append_only();
commit;
