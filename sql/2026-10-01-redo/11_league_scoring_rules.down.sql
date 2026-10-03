-- REVIEW ONLY. Rollback for step 11. Lossless until the server starts writing rule sets: every row the
-- backfill wrote is still on moves.scoring_contract. After the server writes its own, export the table
-- before rolling back and keep the file with the rollback record. moves is not touched.
-- data_events keeps the step's ingest records (append-only); a 'retire' record notes the rollback.
begin;

insert into public.data_events (event, subject, job, row_count, reason, approved_by)
select 'retire', 'scoring_rules', 'sql/2026-10-01-redo/11_league_scoring_rules.down.sql', count(*),
       'step 11 rolled back', 'founder-approved rollback'
  from public.league_scoring_rules;

drop function if exists public.scoring_rules_purge(text, text, text);
drop table if exists public.league_scoring_rules;
drop function if exists public.league_scoring_rules_check_insert();
commit;
