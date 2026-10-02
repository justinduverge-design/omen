-- REVIEW ONLY. Rollback for step 05. `moves` was never modified, so before the server writes new calls
-- here this rollback is lossless. AFTER the server writes to `decisions`, rolling back destroys every call
-- issued since: export first (`copy (select * from public.decisions) to stdout` for each of the four
-- tables) and keep the files with the rollback record.
begin;
drop view if exists public.ledger_current_calls;
drop table if exists public.decision_outcomes;
drop table if exists public.decision_actions;
drop table if exists public.decision_factors;
drop table if exists public.decisions;
drop function if exists public.ledger_erase_user(uuid);
drop function if exists public.decision_outcomes_check_update();
drop function if exists public.ledger_check_owner();
drop function if exists public.decisions_check_insert();
drop function if exists public.ledger_refuse_change();
drop function if exists public.ledger_erasure_in_progress();
commit;
