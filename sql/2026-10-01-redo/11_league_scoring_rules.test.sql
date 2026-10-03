-- SCRATCH ONLY. Assertions for step 11. Rolls back.
begin;

do $$
declare espn_lg uuid; sleeper_lg uuid; ev_espn bigint; ev_proj bigint; res jsonb; d_count integer; res_n integer;
begin
  select id into espn_lg from public.leagues where provider = 'espn' and provider_league_id = '100001';
  select id into sleeper_lg from public.leagues where provider = 'sleeper' and provider_league_id = '998877665501';

  -- Backfill: the two league-scoped rule sets arrived, each citing its provider's ingest; the unscoped
  -- move's rules and the rule-less Yahoo move produced nothing; moves still holds every body.
  if (select count(*) from public.league_scoring_rules) <> 2 then
    raise exception 'FAIL 11: backfill copied % rule sets, expected 2', (select count(*) from public.league_scoring_rules);
  end if;
  if not exists (select 1 from public.league_scoring_rules r join public.data_events e on e.id = r.ingest_event_id
                  where r.league_id = espn_lg and r.provider = 'espn' and r.contract_hash = 'sha256:' || repeat('e', 64)
                    and e.event = 'ingest' and e.subject = 'scoring_rules:espn' and e.rights_basis = 'espn_user_connection'
                    and r.rules->'rules'->0->>'points' = '1' and r.uses = array['grading', 'advice']) then
    raise exception 'FAIL 11: ESPN rule set not backfilled as recorded';
  end if;
  if exists (select 1 from public.league_scoring_rules where contract_hash = 'sha256:' || repeat('0', 64)) then
    raise exception 'FAIL 11: an unscoped move''s rules were backfilled';
  end if;
  if (select count(*) from public.moves where scoring_contract is not null and league_id in ('100001', '998877665501')) <> 2 then
    raise exception 'FAIL 11: moves.scoring_contract was changed';
  end if;

  -- Calls carry version and hash only: the backfilled ESPN call names a rule set that exists.
  -- (The Ledger exists only once step 05 is applied; production applies 11 before 05.)
  if to_regclass('public.decisions') is not null then
    execute $q$select count(*) from public.decisions d where d.scoring_contract_hash is not null
               and not exists (select 1 from public.league_scoring_rules r
                                where r.league_id = d.league_id and r.season = d.season and r.contract_hash = d.scoring_contract_hash)$q$
      into d_count;
    if d_count > 0 then raise exception 'FAIL 11: a Ledger call names a rule set that was not backfilled'; end if;
  end if;

  -- A row must cite its own provider's scoring-rules ingest, and match its league's provider.
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'scoring_rules:espn', 'espn', 'espn_user_connection', 'rules-ingest v1', 'sha256:' || repeat('a', 64), 1)
  returning id into ev_espn;
  insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
  values ('ingest', 'projections:espn', 'espn', 'espn_user_connection', 'projection-ingest v1', 'sha256:' || repeat('b', 64), 1)
  returning id into ev_proj;
  begin
    insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
    values (ev_proj, 'espn', espn_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{}');
    raise exception 'FAIL 11: rules citing a projections ingest were accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
    values (ev_espn, 'sleeper', sleeper_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{}');
    raise exception 'FAIL 11: Sleeper rules citing an ESPN ingest were accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
    values (ev_espn, 'espn', sleeper_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{}');
    raise exception 'FAIL 11: ESPN rules on a Sleeper league were accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules, uses)
    values (ev_espn, 'espn', espn_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{}', array['marketing']);
    raise exception 'FAIL 11: a use outside grading/advice was accepted';
  exception when check_violation then null;
  end;
  -- A changed rule set is a new row; the same one twice is refused.
  insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
  values (ev_espn, 'espn', espn_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{"rules":[]}');
  begin
    insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
    values (ev_espn, 'espn', espn_lg, 2026, 'omen-scoring-contract-v1', 'sha256:' || repeat('7', 64), '{"rules":[]}');
    raise exception 'FAIL 11: the same rule set was stored twice';
  exception when unique_violation then null;
  end;

  -- Append-only.
  begin
    update public.league_scoring_rules set rules = '{}' where league_id = espn_lg;
    raise exception 'FAIL 11: a stored rule set was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.league_scoring_rules where league_id = espn_lg;
    raise exception 'FAIL 11: a rule set was deleted outside a purge';
  exception when insufficient_privilege then null;
  end;

  -- The purge needs a reason and an approver.
  begin
    perform public.scoring_rules_purge('espn', 'rights review', '');
    raise exception 'FAIL 11: purge without an approver accepted';
  exception when invalid_parameter_value then null;
  end;

  -- Purging ESPN removes only ESPN's rule sets, is recorded, and breaks nothing: the Ledger keeps its
  -- calls with their version and hash.
  d_count := null;
  if to_regclass('public.decisions') is not null then
    execute 'select count(*) from public.decisions where scoring_contract_hash is not null' into d_count;
  end if;
  res := public.scoring_rules_purge('espn', 'founder test of the compartment', 'founder');
  if (res->>'league_scoring_rules')::int <> 2 then raise exception 'FAIL 11: purge removed %', res; end if;
  if exists (select 1 from public.league_scoring_rules where provider = 'espn') then raise exception 'FAIL 11: ESPN rules survived the purge'; end if;
  if (select count(*) from public.league_scoring_rules where provider = 'sleeper') <> 1 then raise exception 'FAIL 11: purge touched Sleeper'; end if;
  if not exists (select 1 from public.data_events where event = 'purge' and subject = 'scoring_rules:espn' and approved_by = 'founder' and row_count = 2) then
    raise exception 'FAIL 11: purge was not recorded';
  end if;
  if not exists (select 1 from public.data_events where id = ev_espn) then raise exception 'FAIL 11: the ingest record was removed by the purge'; end if;
  if d_count is not null then
    execute 'select count(*) from public.decisions where scoring_contract_hash is not null' into res_n;
    if res_n <> d_count then raise exception 'FAIL 11: the purge changed the Ledger'; end if;
  end if;
  if coalesce(current_setting('omen.compartment_purge', true), '') = 'on' then raise exception 'FAIL 11: purge flag left on'; end if;

  if has_table_privilege('authenticated', 'public.league_scoring_rules', 'select')
     or has_table_privilege('anon', 'public.league_scoring_rules', 'insert')
     or has_function_privilege('authenticated', 'public.scoring_rules_purge(text, text, text)', 'execute') then
    raise exception 'FAIL 11: a client role can reach the scoring-rules compartment';
  end if;
end $$;

rollback;
