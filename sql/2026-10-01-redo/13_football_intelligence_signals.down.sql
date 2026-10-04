-- REVIEW ONLY. Rollback for step 13. Lossless in substance: every row is rebuilt by the nightly job from
-- public nflverse data. Rolling back drops the published history; the Omen call then shows
-- "not published" until the table returns.
begin;
drop table if exists public.football_intelligence_signals;
commit;
