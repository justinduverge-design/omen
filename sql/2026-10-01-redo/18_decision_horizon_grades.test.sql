-- SCRATCH ONLY. Assertions for step 18. Rolls back.
begin;

do $$
declare
  uid uuid := gen_random_uuid();
  lg uuid;
  d uuid;
begin
  insert into auth.users (id, email) values (uid, 'step18@example.invalid');
  insert into public.users (id, email) values (uid, 'step18@example.invalid');
  insert into public.leagues (provider, provider_league_id, season) values ('sleeper', 'step18', 2026) returning id into lg;
  insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                band, band_drivers, headline, recommendation)
  values (uid, lg, '1', 2026, 4, 'trade_suggestion', 'omen-decision-brief.v3', 'e', 'leaning', '["x"]', 'h', '{}') returning id into d;

  insert into public.decision_horizon_grades (decision_id, user_id, horizon, from_week, through_week, weeks_counted,
    received_points, given_points, margin, result, complete, provenance)
  values (d, uid, 'week', 4, 4, 1, 18.4, 11.0, 7.4, 'win', true, 'legacy_estimate'),
         (d, uid, 'next_4', 4, 6, 3, 40.1, 44.0, -3.9, 'loss', false, 'legacy_estimate');

  -- Updatable until complete: the next Tuesday extends the window.
  update public.decision_horizon_grades set through_week = 7, weeks_counted = 4, complete = true where decision_id = d and horizon = 'next_4';

  begin
    insert into public.decision_horizon_grades (decision_id, user_id, horizon, from_week, through_week, weeks_counted,
      received_points, given_points, margin, result, complete, provenance)
    values (d, uid, 'decade', 4, 4, 1, 1, 1, 0, 'win', false, 'legacy_estimate');
    raise exception 'FAIL 18: an unknown horizon must be refused';
  exception when check_violation then null;
  end;
  begin
    insert into public.decision_horizon_grades (decision_id, user_id, horizon, from_week, through_week, weeks_counted,
      received_points, given_points, margin, result, complete, provenance)
    values (d, uid, 'season', 4, 6, 3, 1, 1, 0, 'win', false, 'verified');
    raise exception 'FAIL 18: horizon grades are estimates, never verified';
  exception when check_violation then null;
  end;

  if not exists (select 1 from pg_class where relname = 'decision_horizon_grades' and relrowsecurity) then
    raise exception 'FAIL 18: row level security must be on';
  end if;
  if has_table_privilege('anon', 'public.decision_horizon_grades', 'select')
     or has_table_privilege('authenticated', 'public.decision_horizon_grades', 'insert') then
    raise exception 'FAIL 18: anon reads or client writes must be refused';
  end if;

  -- The rows go with their decision.
  perform set_config('omen.ledger_erasure', 'on', true);
  delete from public.decisions where id = d;
  if exists (select 1 from public.decision_horizon_grades where decision_id = d) then
    raise exception 'FAIL 18: horizon grades must be deleted with their decision';
  end if;
  raise notice 'PASS 18';
end $$;

rollback;
