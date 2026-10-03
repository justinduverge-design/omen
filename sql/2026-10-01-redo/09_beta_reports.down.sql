-- REVIEW ONLY. Rollback for step 09. Lossless until the first report is saved; after that, reports
-- stored since are lost on rollback (they expire in 30 days anyway). Purge records in data_events stay.
begin;
drop function if exists public.beta_reports_purge_expired();
drop table if exists public.beta_reports;
drop function if exists public.beta_reports_check_insert();
commit;
