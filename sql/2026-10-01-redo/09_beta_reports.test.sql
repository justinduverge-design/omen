-- SCRATCH ONLY. Assertions for step 09. Rolls back.
begin;

do $$
declare n int;
begin
  insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, recent_error_codes, message, disclosure_accepted)
  values ('00000000-0000-4000-8000-000000000001', 'ledger', '1.7.0', '12', 'iOS 26.0', 'iPhone17,1', 'espn:connected', '{league_scope_unavailable}', 'Ledger is empty', true);

  begin
    insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
    values ('00000000-0000-4000-8000-000000000001', 'ledger', '1', '1', 'x', 'y', 'none', 'hi', false);
    raise exception 'FAIL 09: report without the disclosure accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
    values ('00000000-0000-4000-8000-000000000001', 'roster_dump', '1', '1', 'x', 'y', 'none', 'hi', true);
    raise exception 'FAIL 09: unknown screen accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted, expires_at)
    values ('00000000-0000-4000-8000-000000000001', 'omen', '1', '1', 'x', 'y', 'none', 'hi', true, now() + interval '1 year');
    raise exception 'FAIL 09: retention longer than 30 days accepted';
  exception when check_violation then null;
  end;

  if public.beta_reports_purge_expired() <> 0 then raise exception 'FAIL 09: a fresh report was purged'; end if;
  -- Age the report past 30 days (created_at moves with it so the expiry check still holds).
  update public.beta_reports set created_at = now() - interval '31 days', expires_at = now() - interval '1 day';
  n := public.beta_reports_purge_expired();
  if n <> 1 then raise exception 'FAIL 09: expected 1 expired report purged, got %', n; end if;
  if not exists (select 1 from public.data_events where event = 'purge' and subject = 'beta_reports' and row_count = 1) then
    raise exception 'FAIL 09: purge not recorded';
  end if;

  if has_table_privilege('authenticated', 'public.beta_reports', 'select') or has_table_privilege('anon', 'public.beta_reports', 'insert')
     or has_function_privilege('authenticated', 'public.beta_reports_purge_expired()', 'execute') then
    raise exception 'FAIL 09: a client role can reach beta reports';
  end if;
end $$;

-- A sign-in without an app row can file a report (Codex review, #523: the route no longer creates one).
do $$
begin
  if exists (select 1 from public.users where id = '00000000-0000-4000-8000-000000000008') then
    raise exception 'FAIL 09: seed changed; user 8 should be a sign-in without an app row';
  end if;
  insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
  values ('00000000-0000-4000-8000-000000000008', 'connect_failed', '1', '1', 'x', 'y', 'espn:reconnect_required', 'connect keeps failing', true);
end $$;

-- Reports are deleted with the account: by account_erase() when it exists, and by deleting the sign-in.
do $$
declare res jsonb;
begin
  insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
  values ('00000000-0000-4000-8000-000000000007', 'account', '1', '1', 'x', 'y', 'none', 'bye', true);
  if to_regprocedure('public.account_erase(uuid, text)') is not null then
    -- The ESPN-less, Yahoo user 7: its secrets exist on scratch, so the erase goes through.
    execute 'select public.account_erase($1)' into res using '00000000-0000-4000-8000-000000000007'::uuid;
    if exists (select 1 from public.beta_reports where user_id = '00000000-0000-4000-8000-000000000007') then
      raise exception 'FAIL 09: report survived account_erase()';
    end if;
  end if;
  -- A report filed after the erase but before the sign-in is deleted goes with the sign-in.
  insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
  values ('00000000-0000-4000-8000-000000000008', 'account', '1', '1', 'x', 'y', 'none', 'late', true);
  delete from auth.users where id = '00000000-0000-4000-8000-000000000008';
  if exists (select 1 from public.beta_reports where user_id = '00000000-0000-4000-8000-000000000008') then
    raise exception 'FAIL 09: report survived the sign-in''s deletion';
  end if;
end $$;

rollback;
