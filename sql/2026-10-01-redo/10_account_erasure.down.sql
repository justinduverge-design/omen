-- REVIEW ONLY. Rollback for step 10: removes the function. Accounts already erased stay erased; the route
-- falls back to its per-table deletion.
-- Refuses while step 09 is applied: its report trigger serializes with account_erase() through the
-- account lock, and the route's fallback takes no such lock, so a report could land between the fallback's
-- delete and its audit row (Codex review, #534). Roll back 09 first (reverse order: 09 is applied after 10).
begin;

do $$
begin
  if to_regclass('public.beta_reports') is not null then
    raise exception 'step 10 rollback: step 09 is applied; roll back 09 first';
  end if;
end $$;

drop function if exists public.account_erase(uuid, text);
commit;
