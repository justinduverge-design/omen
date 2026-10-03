-- SCRATCH ONLY. Assertions for step 12. Rolls back.
begin;

do $$
declare
  owner uuid := '00000000-0000-4000-8000-000000000008';  -- an auth user with no app row in the seed
  other uuid := '00000000-0000-4000-8000-000000000001';
  t jsonb := '{"give":[{"provider_player_id":"4984"}],"receive":[{"provider_player_id":"6794"}],"opponent_team_id":"3"}';
  r jsonb := '{"fills_need_for":"WR","user_receives":{"position":"WR","need":{"status":"hole","have":2,"required":3}}}';
  saved_id uuid; seen integer; res jsonb;
begin
  insert into public.users (id, email) values (owner, 'scratch8@example.test');

  insert into public.saved_trades (user_id, provider, provider_league_id, season, week, provider_team_id, candidate_id, trade, reasoning)
  values (owner, 'sleeper', '998877665501', 2026, 5, 'sleeper-user-1', 'b1.find_3_4984_6794', t, r)
  returning id into saved_id;
  insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
  values (other, 'espn', '100001', 2026, 5, 'b2.find_3_1_2', t, r);

  -- One row per saved candidate in its full scope; the same id in another league or week is its own row.
  begin
    insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
    values (owner, 'sleeper', '998877665501', 2026, 5, 'b1.find_3_4984_6794', t, r);
    raise exception 'FAIL 12: the same candidate was saved twice in one scope';
  exception when unique_violation then null;
  end;
  insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
  values (owner, 'sleeper', '998877665502', 2026, 5, 'b1.find_3_4984_6794', t, r);
  insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
  values (owner, 'sleeper', '998877665501', 2026, 6, 'b1.find_3_4984_6794', t, r);

  -- Never a save without its trade.
  begin
    insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
    values (owner, 'sleeper', '998877665501', 2026, 5, 'b3.x', '{"give":[]}', r);
    raise exception 'FAIL 12: a saved trade without both sides was accepted';
  exception when check_violation then null;
  end;

  -- Outcome only after sent, self-reported, with its time.
  begin
    update public.saved_trades set outcome = 'accepted', outcome_provenance = 'self_reported', outcome_at = now() where id = saved_id;
    raise exception 'FAIL 12: an outcome on a trade never sent was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.saved_trades set state = 'sent' where id = saved_id;
    raise exception 'FAIL 12: a trade marked sent without its sent time was accepted';
  exception when check_violation then null;
  end;
  update public.saved_trades set state = 'sent', sent_at = now() where id = saved_id;
  begin
    update public.saved_trades set outcome = 'accepted', outcome_at = now() where id = saved_id;
    raise exception 'FAIL 12: an outcome without self-reported provenance was accepted';
  exception when check_violation then null;
  end;
  update public.saved_trades set outcome = 'countered', outcome_provenance = 'self_reported', outcome_at = now() where id = saved_id;
  update public.saved_trades set outcome = 'accepted', outcome_at = now() where id = saved_id;  -- a correction

  -- What was saved never changes; a sent trade stays sent.
  begin
    update public.saved_trades set reasoning = '{"edited":true}' where id = saved_id;
    raise exception 'FAIL 12: the saved reasoning was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.saved_trades set trade = '{"give":[],"receive":[]}' where id = saved_id;
    raise exception 'FAIL 12: the saved trade was rewritten';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.saved_trades set state = 'saved', sent_at = null, outcome = null, outcome_provenance = null, outcome_at = null where id = saved_id;
    raise exception 'FAIL 12: a sent trade went back to saved';
  exception when insufficient_privilege then null;
  end;

  -- The owner reads only their own rows and cannot write; anon reaches nothing.
  perform set_config('request.jwt.claim.sub', owner::text, true);
  set local role authenticated;
  select count(*) into seen from public.saved_trades;
  if seen <> 3 then raise exception 'FAIL 12: the owner sees % rows, expected their 3', seen; end if;
  begin
    insert into public.saved_trades (user_id, provider, provider_league_id, season, week, candidate_id, trade, reasoning)
    values (owner, 'sleeper', '998877665501', 2026, 7, 'b4.x', t, r);
    raise exception 'FAIL 12: a client wrote a saved trade';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if has_table_privilege('anon', 'public.saved_trades', 'select') or has_table_privilege('authenticated', 'public.saved_trades', 'update')
     or has_table_privilege('authenticated', 'public.saved_trades', 'delete') then
    raise exception 'FAIL 12: a client role has more than owner read';
  end if;

  -- Erased with the account: through account_erase() once step 10 is applied, else by deleting the user.
  if to_regprocedure('public.account_erase(uuid, text)') is not null then
    execute 'select public.account_erase($1)' into res using owner;
    if (res->>'erased')::boolean is not true then raise exception 'FAIL 12: account_erase refused: %', res; end if;
  else
    delete from public.users where id = owner;
  end if;
  if exists (select 1 from public.saved_trades where user_id = owner) then
    raise exception 'FAIL 12: saved trades outlived the account';
  end if;
  if not exists (select 1 from public.saved_trades where user_id = other) then
    raise exception 'FAIL 12: erasing one account removed another''s saved trades';
  end if;
end $$;

rollback;
