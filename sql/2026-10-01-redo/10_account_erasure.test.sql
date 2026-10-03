-- SCRATCH ONLY. Assertions for step 10. Rolls back.
begin;

-- User 6 has a Sleeper and a Yahoo connection (two Yahoo secrets), a legacy move and, after step 05,
-- possibly Ledger rows. Give them an ESPN connection too, a call, consent and a beta report if step 09 exists.
do $$
declare res jsonb; lg uuid; others_before int; secrets_before int; hash text;
begin
  perform public.connection_store_espn('00000000-0000-4000-8000-000000000006', '600006', '2', 'six-s2', '{SIX-SWID}');
  perform public.league_follows_replace('00000000-0000-4000-8000-000000000006', 'espn', 2026, '[{"league_id":"600006","team_id":"2"}]');
  select id into lg from public.leagues where provider = 'espn' and provider_league_id = '600006';
  insert into public.decisions (user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                                band, band_drivers, headline, recommendation)
  values ('00000000-0000-4000-8000-000000000006', lg, '2', 2026, 5, 'start_sit', 'omen-decision-brief.v3', 'e', 'leaning', '["x"]', 'h', '{}');
  insert into public.consent_records (user_id, consent_type, granted) values ('00000000-0000-4000-8000-000000000006', 'terms', true);
  if to_regclass('public.beta_reports') is not null then
    execute $q$insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
               values ('00000000-0000-4000-8000-000000000006', 'account', '1', '1', 'x', 'y', 'none', 'bye', true)$q$;
  end if;

  select count(*) into others_before from public.platform_connections where user_id <> '00000000-0000-4000-8000-000000000006';
  select count(*) into secrets_before from vault.secrets;

  res := public.account_erase('00000000-0000-4000-8000-000000000006');
  if not (res->>'erased')::boolean then raise exception 'FAIL 10: erase reported nothing erased: %', res; end if;
  if (res->>'vault_secrets')::int <> 4 then raise exception 'FAIL 10: expected 4 secrets erased (Yahoo 2 + ESPN 2), got %', res; end if;

  if exists (select 1 from public.users where id = '00000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.league_memberships where user_id = '00000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.decisions where user_id = '00000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.moves where user_id = '00000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.consent_records where user_id = '00000000-0000-4000-8000-000000000006') then
    raise exception 'FAIL 10: something owned by the erased user survived';
  end if;
  if to_regclass('public.beta_reports') is not null then
    execute $q$select count(*) from public.beta_reports where user_id = '00000000-0000-4000-8000-000000000006'$q$ into others_before;
    if others_before <> 0 then raise exception 'FAIL 10: a beta report survived the erase'; end if;
    select count(*) into others_before from public.platform_connections where user_id <> '00000000-0000-4000-8000-000000000006';
  end if;
  if (select count(*) from vault.secrets) <> secrets_before - 4 then raise exception 'FAIL 10: secret count is wrong after erase'; end if;
  hash := encode(sha256(convert_to('00000000-0000-4000-8000-000000000006', 'UTF8')), 'hex');
  if not exists (select 1 from public.deletion_audit_log where user_id_hash = hash) then
    raise exception 'FAIL 10: no deletion audit row with the route''s hash';
  end if;
  if (select count(*) from public.platform_connections where user_id <> '00000000-0000-4000-8000-000000000006') <> others_before then
    raise exception 'FAIL 10: another user''s connections were touched';
  end if;
  if public.ledger_erasure_in_progress() then raise exception 'FAIL 10: erasure flag left on'; end if;
  if (public.account_erase('00000000-0000-4000-8000-000000000006')->>'erased')::boolean then
    raise exception 'FAIL 10: a second erase claimed to erase something';
  end if;
end $$;

-- All or nothing: if a secret cannot be deleted, nothing is erased (simulated on scratch only).
do $$
begin
  if not has_table_privilege('vault.secrets', 'TRIGGER') then
    raise notice 'SKIPPED 10: cannot simulate a Vault failure here (no TRIGGER privilege on vault.secrets)';
    return;
  end if;
  execute 'create function pg_temp.block_vault_delete() returns trigger language plpgsql as $f$ begin raise exception ''simulated vault failure''; end $f$';
  execute 'create trigger block_vault_delete before delete on vault.secrets for each row execute function pg_temp.block_vault_delete()';
  begin
    perform public.account_erase('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL 10: erase succeeded although Vault refused';
  exception when others then
    if sqlerrm like 'FAIL 10%' then raise; end if;
  end;
  if not exists (select 1 from public.users where id = '00000000-0000-4000-8000-000000000002')
     or not exists (select 1 from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000002')
     or not exists (select 1 from public.consent_records where user_id = '00000000-0000-4000-8000-000000000002') then
    raise exception 'FAIL 10: a failed erase left a partly erased account';
  end if;
  execute 'drop trigger block_vault_delete on vault.secrets';
end $$;

do $$
begin
  if has_function_privilege('authenticated', 'public.account_erase(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.account_erase(uuid, text)', 'execute') then
    raise exception 'FAIL 10: a client role can erase accounts';
  end if;
end $$;

rollback;
