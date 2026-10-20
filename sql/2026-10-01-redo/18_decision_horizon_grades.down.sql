-- Step 18 down: drop the horizon grades. The one-week Ledger outcomes are untouched.
begin;
drop table if exists public.decision_horizon_grades;
commit;
