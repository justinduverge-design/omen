-- REVIEW ONLY. Rollback for step 10: removes the function. Accounts already erased stay erased; the route
-- falls back to its per-table deletion.
begin;
drop function if exists public.account_erase(uuid, text);
commit;
