-- READ-ONLY. Post-checks for step 11, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 11' when every check holds.
do $$
begin
  if (select count(*) from public.league_scoring_rules)
     <> (select count(*) from (select distinct l.id, m.season, m.scoring_contract_hash
                                 from public.moves m
                                 join public.leagues l on l.provider = m.platform and l.provider_league_id = m.league_id and l.season = m.season
                                where m.scoring_contract is not null and jsonb_typeof(m.scoring_contract) = 'object'
                                  and coalesce(m.scoring_contract_version, '') <> '' and coalesce(m.scoring_contract_hash, '') <> '') x) then
    raise exception 'step 11: backfilled rule sets do not match the league-scoped moves';
  end if;
  if exists (select 1 from public.league_scoring_rules r join public.data_events e on e.id = r.ingest_event_id
              where e.event <> 'ingest' or e.subject <> 'scoring_rules:' || r.provider) then
    raise exception 'step 11: a rule set cites something other than its scoring-rules ingest';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.league_scoring_rules'::regclass) then raise exception 'post-check: RLS off on league_scoring_rules'; end if;
  if has_table_privilege('anon', 'public.league_scoring_rules', 'select') or has_table_privilege('anon', 'public.league_scoring_rules', 'insert') or has_table_privilege('authenticated', 'public.league_scoring_rules', 'insert') or has_table_privilege('authenticated', 'public.league_scoring_rules', 'update') or has_table_privilege('authenticated', 'public.league_scoring_rules', 'delete') then raise exception 'post-check: a client role can write or anon can read league_scoring_rules'; end if;
  if to_regprocedure('public.scoring_rules_purge(text, text, text)') is null then raise exception 'post-check: public.scoring_rules_purge(text, text, text) missing'; end if;
  if has_function_privilege('anon', 'public.scoring_rules_purge(text, text, text)', 'execute') or has_function_privilege('authenticated', 'public.scoring_rules_purge(text, text, text)', 'execute') then raise exception 'post-check: a client role can execute public.scoring_rules_purge(text, text, text)'; end if;
  if not has_function_privilege('service_role', 'public.scoring_rules_purge(text, text, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.scoring_rules_purge(text, text, text)'; end if;
  raise notice 'VERIFIED 11';
end $$;
