-- READ-ONLY. Post-checks for step 10, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 10' when every check holds.
do $$
begin
  if to_regprocedure('public.account_erase(uuid, text)') is null then raise exception 'post-check: public.account_erase(uuid, text) missing'; end if;
  if has_function_privilege('anon', 'public.account_erase(uuid, text)', 'execute') or has_function_privilege('authenticated', 'public.account_erase(uuid, text)', 'execute') then raise exception 'post-check: a client role can execute public.account_erase(uuid, text)'; end if;
  if not has_function_privilege('service_role', 'public.account_erase(uuid, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.account_erase(uuid, text)'; end if;
  raise notice 'VERIFIED 10';
end $$;
