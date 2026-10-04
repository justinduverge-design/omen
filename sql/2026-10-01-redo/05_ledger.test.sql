-- SCRATCH ONLY. Assertions for step 05. Rolls back.
begin;

-- Backfill: the 3 league-scoped moves were copied with their feedback and outcomes; moves untouched.
do $$
begin
  if (select count(*) from public.decisions) <> 3 then raise exception 'FAIL 05: expected 3 backfilled calls'; end if;
  if exists (select 1 from public.decisions d where d.legacy_move_id is not null
              and not exists (select 1 from public.moves m where m.id = d.legacy_move_id)) then
    raise exception 'FAIL 05: a copied move is missing from moves (moves must stay untouched)';
  end if;
  if (select count(*) from public.decision_outcomes where provenance = 'verified') <> 1 then
    raise exception 'FAIL 05: the exact-reconciled win should be the only verified outcome';
  end if;
  if exists (select 1 from public.decisions where band is not null) then
    raise exception 'FAIL 05: a legacy call was given a band it never had';
  end if;
end $$;

-- Two leagues, same person, same week: two calls (the old table kept one).
do $$
declare espn_league uuid; espn_l2 uuid; first_call uuid; second_call uuid; n int;
begin
  perform public.league_follows_replace('00000000-0000-4000-8000-000000000001', 'espn', 2026,
    '[{"league_id":"100001","team_id":"3"},{"league_id":"300001","team_id":"5"}]');
  select id into espn_league from public.leagues where provider = 'espn' and provider_league_id = '100001';
  select id into espn_l2 from public.leagues where provider = 'espn' and provider_league_id = '300001';

  insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                band, band_drivers, headline, recommendation)
  values ('00000000-0000-4000-8000-000000000001', espn_league, '3', 2026, 5, 'start_sit', 'omen-decision-brief.v3', 'optimizer-1',
          'leaning', '["projection gap 2.1 pts"]', 'Start A over B', '{"type":"start_sit"}')
  returning id into first_call;
  insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                band, band_drivers, headline, recommendation)
  values ('00000000-0000-4000-8000-000000000001', espn_l2, '5', 2026, 5, 'start_sit', 'omen-decision-brief.v3', 'optimizer-1',
          'confident', '["three factors agree"]', 'Start C over D', '{"type":"start_sit"}');

  -- Asking again in league 1 supersedes; the first call is kept.
  insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                band, band_drivers, headline, recommendation, supersedes_id)
  values ('00000000-0000-4000-8000-000000000001', espn_league, '3', 2026, 5, 'start_sit', 'omen-decision-brief.v3', 'optimizer-1',
          'coin_flip', '["injury news"]', 'Start B over A', '{"type":"start_sit"}', first_call)
  returning id into second_call;

  select count(*) into n from public.ledger_current_calls where user_id = '00000000-0000-4000-8000-000000000001' and week = 5;
  if n <> 2 then raise exception 'FAIL 05: expected 2 current calls in week 5, got %', n; end if;
  if (select count(*) from public.decisions where user_id = '00000000-0000-4000-8000-000000000001' and week = 5) <> 3 then
    raise exception 'FAIL 05: the superseded call was not kept';
  end if;

  -- One call per team per week: a second FIRST call for the same team-week is refused (it must supersede).
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  band, band_drivers, headline, recommendation)
    values ('00000000-0000-4000-8000-000000000001', espn_league, '3', 2026, 5, 'start_sit', 'v3', 'e', 'leaning', '["x"]', 'h', '{}');
    raise exception 'FAIL 05: a second current call for the same team and week accepted';
  exception when unique_violation then null;
  end;

  -- A call can be superseded once, and only by the same team and week.
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  band, band_drivers, headline, recommendation, supersedes_id)
    values ('00000000-0000-4000-8000-000000000001', espn_league, '3', 2026, 5, 'start_sit', 'v3', 'e', 'leaning', '["x"]', 'h', '{}', first_call);
    raise exception 'FAIL 05: a call was superseded twice';
  exception when unique_violation then null;
  end;
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  band, band_drivers, headline, recommendation, supersedes_id)
    values ('00000000-0000-4000-8000-000000000001', espn_l2, '5', 2026, 6, 'start_sit', 'v3', 'e', 'leaning', '["x"]', 'h', '{}', second_call);
    raise exception 'FAIL 05: a call superseded another team''s call';
  exception when check_violation then null;
  end;

  -- Band rules: a band needs drivers; no band needs a reason; old numeric-only rows are not allowed.
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  band, headline, recommendation)
    values ('00000000-0000-4000-8000-000000000001', espn_l2, '5', 2026, 7, 'start_sit', 'v3', 'e', 'confident', 'h', '{}');
    raise exception 'FAIL 05: band without drivers accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  internal_score, headline, recommendation)
    values ('00000000-0000-4000-8000-000000000001', espn_l2, '5', 2026, 7, 'start_sit', 'v3', 'e', 82, 'h', '{}');
    raise exception 'FAIL 05: a call with neither band nor reason accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                  band, band_drivers, headline, recommendation)
    values ('00000000-0000-4000-8000-000000000001', espn_l2, '5', 2026, 7, 'start_sit', 'v3', 'e', 'no_call', '["x"]', 'h', '{}');
    raise exception 'FAIL 05: a fourth band name accepted';
  exception when check_violation then null;
  end;

  -- Issued calls cannot be rewritten or deleted, even by service_role-equivalent access.
  begin
    update public.decisions set headline = 'rewritten' where id = first_call;
    raise exception 'FAIL 05: a call was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.decisions where id = first_call;
    raise exception 'FAIL 05: a call was deleted';
  exception when insufficient_privilege then null;
  end;

  -- Factors: insert-only, owner must match, contributions only from used factors, unread says why.
  insert into public.decision_factors (decision_id, user_id, position, factor_key, line_label, evidence_kind, used, statement,
                                       contribution_points, source)
  values (second_call, '00000000-0000-4000-8000-000000000001', 0, 'provider_projection', 'projected', 'projection', true,
          'ESPN projects A at 14.2', 14.2, 'espn');
  begin
    insert into public.decision_factors (decision_id, user_id, position, factor_key, evidence_kind, used, statement, contribution_points, source)
    values (second_call, '00000000-0000-4000-8000-000000000001', 1, 'weather', 'inference', false, 'Wind', 0.4, 'open-meteo');
    raise exception 'FAIL 05: an unused factor claimed a contribution';
  exception when check_violation then null;
  end;
  begin
    insert into public.decision_factors (decision_id, user_id, position, factor_key, evidence_kind, used, statement, source)
    values (second_call, '00000000-0000-4000-8000-000000000001', 2, 'weather', 'limitation', false, 'Not read', 'open-meteo');
    raise exception 'FAIL 05: an unread factor without a reason accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.decision_factors (decision_id, user_id, position, factor_key, evidence_kind, used, statement, source)
    values (second_call, '00000000-0000-4000-8000-000000000002', 3, 'x', 'verified', true, 's', 'x');
    raise exception 'FAIL 05: a factor owned by someone else accepted';
  exception when check_violation then null;
  end;
  begin
    update public.decision_factors set statement = 'changed' where decision_id = second_call;
    raise exception 'FAIL 05: a factor was rewritten';
  exception when insufficient_privilege then null;
  end;

  -- Actions are the person's own and may change; provenance is explicit.
  insert into public.decision_actions (decision_id, user_id, followed) values (second_call, '00000000-0000-4000-8000-000000000001', true);
  update public.decision_actions set followed = false, stars = 2 where decision_id = second_call;

  -- Outcomes: data_incomplete can be completed; resolved is final; verified must be exact.
  insert into public.decision_outcomes (decision_id, user_id, state, provenance) values (second_call, '00000000-0000-4000-8000-000000000001', 'data_incomplete', 'legacy_estimate');
  update public.decision_outcomes set state = 'resolved', result = 'win', provenance = 'verified', reconciliation_state = 'exact' where decision_id = second_call;
  begin
    update public.decision_outcomes set result = 'loss' where decision_id = second_call;
    raise exception 'FAIL 05: a resolved outcome was changed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.decision_outcomes (decision_id, user_id, state, result, provenance, reconciliation_state)
    values (first_call, '00000000-0000-4000-8000-000000000001', 'resolved', 'win', 'verified', 'ambiguous');
    raise exception 'FAIL 05: verified outcome without exact reconciliation accepted';
  exception when check_violation then null;
  end;
end $$;

-- Only account erasure removes Ledger rows; a plain user delete is refused rather than cascading.
do $$
declare n int;
begin
  begin
    delete from public.users where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'FAIL 05: deleting a user silently erased their Ledger';
  exception when insufficient_privilege then null;
  end;
  n := public.ledger_erase_user('00000000-0000-4000-8000-000000000001');
  if n < 4 then raise exception 'FAIL 05: erasure removed only % calls', n; end if;
  if exists (select 1 from public.decision_factors where user_id = '00000000-0000-4000-8000-000000000001')
     or exists (select 1 from public.decision_outcomes where user_id = '00000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL 05: erasure left child rows';
  end if;
  if public.ledger_erasure_in_progress() then raise exception 'FAIL 05: erasure flag left on'; end if;
end $$;

-- Clients have no access to any Ledger table or the erase function.
do $$
begin
  if has_table_privilege('authenticated', 'public.decisions', 'select') or has_table_privilege('anon', 'public.decision_outcomes', 'select')
     or has_table_privilege('authenticated', 'public.decision_actions', 'update')
     or has_function_privilege('authenticated', 'public.ledger_erase_user(uuid)', 'execute') then
    raise exception 'FAIL 05: a client role can reach the Ledger';
  end if;
end $$;

rollback;
