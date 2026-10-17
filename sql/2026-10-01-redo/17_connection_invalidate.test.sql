-- SCRATCH ONLY. Assertions for step 17. Rolls back.
begin;

do $$
declare
  uid uuid := gen_random_uuid();
  s1 uuid; s2 uuid;
  n int;
  row public.platform_connections%rowtype;
begin
  insert into public.users (id, email) values (uid, 'step17@example.invalid');
  s1 := vault.create_secret('cookie-a');
  s2 := vault.create_secret('cookie-b');
  insert into public.platform_connections (user_id, platform, league_id, espn_team_id, espn_secret_id, swid_secret_id, espn_swid, credential_state)
  values (uid, 'espn', '123', '7', s1, s2, '{legacy}', 'valid');

  n := public.connection_invalidate(uid, 'espn', 'espn_unauthorized');
  if n <> 2 then raise exception 'FAIL 17: expected 2 secrets deleted, got %', n; end if;
  if exists (select 1 from vault.secrets where id in (s1, s2)) then raise exception 'FAIL 17: secrets still in Vault'; end if;

  select * into row from public.platform_connections where user_id = uid and platform = 'espn';
  if row.id is null then raise exception 'FAIL 17: the connection row must stay'; end if;
  if row.espn_secret_id is not null or row.swid_secret_id is not null or row.espn_swid is not null then
    raise exception 'FAIL 17: credential pointers must be cleared';
  end if;
  if row.credential_state <> 'needs_reauth' or row.last_failure_code <> 'espn_unauthorized' or row.last_failure_at is null then
    raise exception 'FAIL 17: state must be needs_reauth with the failure code and time';
  end if;
  if row.league_id <> '123' or row.espn_team_id <> '7' then raise exception 'FAIL 17: league and team must be kept'; end if;

  -- Idempotent: a second call deletes nothing and keeps the state.
  if public.connection_invalidate(uid, 'espn', 'espn_unauthorized') <> 0 then raise exception 'FAIL 17: second call should delete nothing'; end if;
  if public.connection_invalidate(uid, 'yahoo', 'yahoo_refresh_refused') <> -1 then raise exception 'FAIL 17: no yahoo row should return -1'; end if;

  begin
    perform public.connection_invalidate(uid, 'espn', 'Bad Code');
    raise exception 'FAIL 17: an invalid failure code must be refused';
  exception when sqlstate '22023' then null;
  end;
  if has_function_privilege('authenticated', 'public.connection_invalidate(uuid, text, text)', 'execute') then
    raise exception 'FAIL 17: clients must not be able to call connection_invalidate';
  end if;
  raise notice 'PASS 17';
end $$;

rollback;
