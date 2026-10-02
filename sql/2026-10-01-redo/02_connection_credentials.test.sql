-- SCRATCH ONLY. Assertions for step 02. Rolls back.
begin;

-- Clients cannot call any credential function.
do $$
declare f text;
begin
  foreach f in array array['connection_store_espn','connection_store_yahoo','connection_rotate_yahoo','connection_record_health','connection_revoke']
  loop
    if has_function_privilege('anon', (select oid from pg_proc where proname = f), 'execute')
       or has_function_privilege('authenticated', (select oid from pg_proc where proname = f), 'execute') then
      raise exception 'FAIL 02: % is executable by a client role', f;
    end if;
    if not has_function_privilege('service_role', (select oid from pg_proc where proname = f), 'execute') then
      raise exception 'FAIL 02: % is not executable by service_role', f;
    end if;
  end loop;
end $$;

-- Existing rows are 'unknown', never assumed valid.
do $$
begin
  if exists (select 1 from public.platform_connections where credential_state <> 'unknown') then
    raise exception 'FAIL 02: existing connections were not left as unknown';
  end if;
end $$;

-- ESPN reconnect for a user whose old named secrets were stranded (the lock-out case) now succeeds.
do $$
declare cid uuid; before_count int; after_count int;
begin
  -- Simulate a stranded secret: drop the pointer row only.
  perform vault.create_secret('stranded', 'espn_s2_00000000-0000-4000-8000-000000000008', 'stranded');
  insert into public.users (id, email) values ('00000000-0000-4000-8000-000000000008', 'scratch8@example.test');
  cid := public.connection_store_espn('00000000-0000-4000-8000-000000000008', '200008', '1', 'new-s2', '{NEW-SWID}');
  if cid is null then raise exception 'FAIL 02: connection_store_espn returned null'; end if;
  if (select credential_state from public.platform_connections where id = cid) <> 'valid' then
    raise exception 'FAIL 02: stored ESPN connection not marked valid';
  end if;
  -- Updating again reuses the same two secrets.
  select count(*) into before_count from vault.secrets;
  perform public.connection_store_espn('00000000-0000-4000-8000-000000000008', '200009', '2', 'newer-s2', '{NEWER-SWID}');
  select count(*) into after_count from vault.secrets;
  if after_count <> before_count then raise exception 'FAIL 02: reconnect created new secrets instead of updating'; end if;
  if (select decrypted_secret from vault.decrypted_secrets where id =
       (select espn_secret_id from public.platform_connections where id = cid)) <> 'newer-s2' then
    raise exception 'FAIL 02: cookie was not updated';
  end if;
end $$;

-- Revoke removes secrets and pointer together.
do $$
declare ids uuid[];
begin
  select array[espn_secret_id, swid_secret_id] into ids from public.platform_connections
   where user_id = '00000000-0000-4000-8000-000000000001' and platform = 'espn';
  if not public.connection_revoke('00000000-0000-4000-8000-000000000001', 'espn') then
    raise exception 'FAIL 02: revoke reported nothing to remove';
  end if;
  if exists (select 1 from vault.secrets where id = any (ids)) then raise exception 'FAIL 02: secrets survived revoke'; end if;
  if exists (select 1 from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000001' and platform = 'espn') then
    raise exception 'FAIL 02: pointer survived revoke';
  end if;
  if public.connection_revoke('00000000-0000-4000-8000-000000000001', 'espn') then
    raise exception 'FAIL 02: second revoke claimed to remove something';
  end if;
end $$;

-- If a secret cannot be deleted, revoke fails and leaves BOTH the row and the secrets in place.
create function pg_temp.block_vault_delete() returns trigger language plpgsql as $$
begin raise exception 'simulated vault failure'; end $$;
create trigger block_vault_delete before delete on vault.secrets for each row execute function pg_temp.block_vault_delete();
do $$
begin
  begin
    perform public.connection_revoke('00000000-0000-4000-8000-000000000002', 'espn');
    raise exception 'FAIL 02: revoke succeeded although Vault refused';
  exception when others then
    if sqlerrm like 'FAIL 02%' then raise; end if;
  end;
  if not exists (select 1 from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000002' and platform = 'espn') then
    raise exception 'FAIL 02: pointer was dropped although its secret could not be deleted';
  end if;
end $$;
drop trigger block_vault_delete on vault.secrets;

-- Yahoo refresh: only the caller that read the current expiry wins.
do $$
declare seen timestamptz;
begin
  select token_expires_at into seen from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000006' and platform = 'yahoo';
  if not public.connection_rotate_yahoo('00000000-0000-4000-8000-000000000006', seen, 'acc-2', 'ref-2', now() + interval '1 hour') then
    raise exception 'FAIL 02: first refresh lost';
  end if;
  if public.connection_rotate_yahoo('00000000-0000-4000-8000-000000000006', seen, 'acc-3', 'ref-3', now() + interval '2 hours') then
    raise exception 'FAIL 02: stale refresh overwrote a newer token';
  end if;
end $$;

-- Health is recorded and cleared.
do $$
begin
  perform public.connection_record_health('00000000-0000-4000-8000-000000000003', 'espn', false, 'espn_cookies_invalid');
  if (select credential_state || ':' || last_failure_code from public.platform_connections
       where user_id = '00000000-0000-4000-8000-000000000003' and platform = 'espn') <> 'needs_reauth:espn_cookies_invalid' then
    raise exception 'FAIL 02: failure not recorded';
  end if;
  begin
    perform public.connection_record_health('00000000-0000-4000-8000-000000000003', 'espn', false, 'Has Spaces');
    raise exception 'FAIL 02: free-text failure code accepted';
  exception when check_violation then null;
  end;
end $$;

rollback;
