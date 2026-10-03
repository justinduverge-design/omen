-- READ-ONLY. Post-checks for step 05, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 05' when every check holds.
do $$
begin
  if (select count(*) from public.decisions where legacy_move_id is not null)
     <> (select count(*) from public.moves where platform is not null and league_id is not null and user_id is not null and week_num between 1 and 22) then
    raise exception 'step 05: Ledger backfill does not match the league-scoped moves';
  end if;
  if (select count(*) from public.ledger_current_calls) <> (select count(*) from public.decisions where supersedes_id is null)
     and not exists (select 1 from public.decisions where supersedes_id is not null) then
    raise exception 'step 05: current calls view disagrees with the Ledger';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.decisions'::regclass) then raise exception 'post-check: RLS off on decisions'; end if;
  if has_table_privilege('anon', 'public.decisions', 'select') or has_table_privilege('anon', 'public.decisions', 'insert') or has_table_privilege('authenticated', 'public.decisions', 'insert') or has_table_privilege('authenticated', 'public.decisions', 'update') or has_table_privilege('authenticated', 'public.decisions', 'delete') then raise exception 'post-check: a client role can write or anon can read decisions'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.decision_factors'::regclass) then raise exception 'post-check: RLS off on decision_factors'; end if;
  if has_table_privilege('anon', 'public.decision_factors', 'select') or has_table_privilege('anon', 'public.decision_factors', 'insert') or has_table_privilege('authenticated', 'public.decision_factors', 'insert') or has_table_privilege('authenticated', 'public.decision_factors', 'update') or has_table_privilege('authenticated', 'public.decision_factors', 'delete') then raise exception 'post-check: a client role can write or anon can read decision_factors'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.decision_actions'::regclass) then raise exception 'post-check: RLS off on decision_actions'; end if;
  if has_table_privilege('anon', 'public.decision_actions', 'select') or has_table_privilege('anon', 'public.decision_actions', 'insert') or has_table_privilege('authenticated', 'public.decision_actions', 'insert') or has_table_privilege('authenticated', 'public.decision_actions', 'update') or has_table_privilege('authenticated', 'public.decision_actions', 'delete') then raise exception 'post-check: a client role can write or anon can read decision_actions'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.decision_outcomes'::regclass) then raise exception 'post-check: RLS off on decision_outcomes'; end if;
  if has_table_privilege('anon', 'public.decision_outcomes', 'select') or has_table_privilege('anon', 'public.decision_outcomes', 'insert') or has_table_privilege('authenticated', 'public.decision_outcomes', 'insert') or has_table_privilege('authenticated', 'public.decision_outcomes', 'update') or has_table_privilege('authenticated', 'public.decision_outcomes', 'delete') then raise exception 'post-check: a client role can write or anon can read decision_outcomes'; end if;
  if to_regprocedure('public.ledger_erase_user(uuid)') is null then raise exception 'post-check: public.ledger_erase_user(uuid) missing'; end if;
  if has_function_privilege('anon', 'public.ledger_erase_user(uuid)', 'execute') or has_function_privilege('authenticated', 'public.ledger_erase_user(uuid)', 'execute') then raise exception 'post-check: a client role can execute public.ledger_erase_user(uuid)'; end if;
  if not has_function_privilege('service_role', 'public.ledger_erase_user(uuid)', 'execute') then raise exception 'post-check: service_role cannot execute public.ledger_erase_user(uuid)'; end if;
  raise notice 'VERIFIED 05';
end $$;
