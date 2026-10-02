-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 02 — provider credentials change atomically, and their health is recorded.
--
-- Fixes review findings 6, 7 and 8:
--   * Disconnect and account deletion log-and-ignore a Vault delete failure, then delete the pointer,
--     stranding the cookie/token. Vault's name index is UNIQUE, and Omen names secrets per user, so a
--     stranded secret also blocks that user's next connect forever.
--   * ESPN connect creates two secrets with Promise.all; one can succeed while the other fails.
--   * Nothing records when a credential last worked or why it last failed.
--   * Yahoo refresh has no single-flight guard.
--
-- Design:
--   * Four columns on platform_connections: credential_state, last_verified_at, last_failure_code,
--     last_failure_at. Existing rows get 'unknown' (true: nothing has been verified under this rule).
--   * Five functions, each ONE transaction, SECURITY DEFINER with a pinned search_path, EXECUTE granted
--     to service_role only. Their job is atomicity (a secret and its pointer change together), not access
--     control: verified 2026-10-01 on production and on a real Supabase project, service_role can read
--     vault.decrypted_secrets directly, as Supabase grants by default. Clients (anon, authenticated)
--     cannot reach Vault at all. The protection for stored cookies is that only the server holds the
--     service key. Supabase's default privileges grant EXECUTE on new public
--     functions to anon and authenticated; this file revokes that explicitly for each one.
--   * Every function that creates, replaces or deletes a secret first takes a transaction-scoped advisory
--     lock per (user, provider). Without it, two first-time connects at once both find no row to lock
--     with SELECT ... FOR UPDATE, both create secrets, and the loser's pair is orphaned (Codex review, #505).
--   * New secrets are created with name = NULL, so the unique name index can never block a reconnect.
--     The description carries the label. Existing named secrets are left as they are.
--   * Secret values arrive as function arguments, exactly as with the existing vault_create_secret
--     wrapper; this adds no new exposure. Verified 2026-10-01 on production's settings: pgaudit.log is
--     'none', log_statement is 'ddl', and bound parameters are not logged even on error.
--
-- The server code does not call these yet. Wiring them in is a separate code change (design doc §8).

begin;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public'
             and table_name = 'platform_connections' and column_name = 'credential_state') then
    raise exception 'step 02 preflight: credential_state already exists';
  end if;
end $$;

alter table public.platform_connections
  add column credential_state  text not null default 'unknown'
    constraint platform_connections_credential_state_check
    check (credential_state in ('unknown', 'valid', 'needs_reauth')),
  add column last_verified_at  timestamptz,
  add column last_failure_code text
    constraint platform_connections_failure_code_check
    check (last_failure_code is null or last_failure_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  add column last_failure_at   timestamptz;

-- ESPN: store or replace both cookies and the bound league in one transaction.
create function public.connection_store_espn(
  p_user_id uuid, p_league_id text, p_team_id text, p_espn_s2 text, p_swid text
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare
  conn public.platform_connections%rowtype;
  s2_id uuid;
  swid_id uuid;
begin
  if p_user_id is null or coalesce(p_league_id, '') = '' or coalesce(p_espn_s2, '') = '' or coalesce(p_swid, '') = '' then
    raise exception 'connection_store_espn: user, league and both cookies are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('omen.connection:' || p_user_id::text || ':espn', 0));

  select * into conn from public.platform_connections
   where user_id = p_user_id and platform = 'espn' for update;

  if found and conn.espn_secret_id is not null and conn.swid_secret_id is not null then
    perform vault.update_secret(conn.espn_secret_id, p_espn_s2);
    perform vault.update_secret(conn.swid_secret_id, p_swid);
    s2_id := conn.espn_secret_id;
    swid_id := conn.swid_secret_id;
  else
    -- A half-populated row (one pointer missing) is repaired: drop whichever secret exists, recreate both.
    if found then
      delete from vault.secrets where id in (conn.espn_secret_id, conn.swid_secret_id);
    end if;
    s2_id := vault.create_secret(p_espn_s2, null, 'ESPN espn_s2 cookie');
    swid_id := vault.create_secret(p_swid, null, 'ESPN SWID cookie');
  end if;

  insert into public.platform_connections as pc
    (user_id, platform, league_id, espn_team_id, espn_secret_id, swid_secret_id, is_active,
     credential_state, last_verified_at, last_failure_code, last_failure_at, updated_at)
  values (p_user_id, 'espn', p_league_id, p_team_id, s2_id, swid_id, true, 'valid', now(), null, null, now())
  on conflict (user_id, platform) do update set
    league_id = excluded.league_id, espn_team_id = excluded.espn_team_id,
    espn_secret_id = excluded.espn_secret_id, swid_secret_id = excluded.swid_secret_id,
    is_active = true, credential_state = 'valid', last_verified_at = now(),
    last_failure_code = null, last_failure_at = null, updated_at = now()
  returning pc.id into conn.id;

  return conn.id;
end $$;

-- Yahoo: store tokens after the OAuth exchange (first connect or re-auth).
create function public.connection_store_yahoo(
  p_user_id uuid, p_access_token text, p_refresh_token text, p_expires_at timestamptz,
  p_yahoo_guid text, p_league_id text default null
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare
  conn public.platform_connections%rowtype;
  acc_id uuid;
  ref_id uuid;
begin
  if p_user_id is null or coalesce(p_access_token, '') = '' or coalesce(p_refresh_token, '') = '' or p_expires_at is null then
    raise exception 'connection_store_yahoo: user, both tokens and expiry are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('omen.connection:' || p_user_id::text || ':yahoo', 0));

  select * into conn from public.platform_connections
   where user_id = p_user_id and platform = 'yahoo' for update;

  if found and conn.token_secret_id is not null and conn.refresh_secret_id is not null then
    perform vault.update_secret(conn.token_secret_id, p_access_token);
    perform vault.update_secret(conn.refresh_secret_id, p_refresh_token);
    acc_id := conn.token_secret_id;
    ref_id := conn.refresh_secret_id;
  else
    if found then
      delete from vault.secrets where id in (conn.token_secret_id, conn.refresh_secret_id);
    end if;
    acc_id := vault.create_secret(p_access_token, null, 'Yahoo OAuth access token');
    ref_id := vault.create_secret(p_refresh_token, null, 'Yahoo OAuth refresh token');
  end if;

  insert into public.platform_connections as pc
    (user_id, platform, league_id, platform_user_id, token_secret_id, refresh_secret_id, token_expires_at,
     is_active, credential_state, last_verified_at, last_failure_code, last_failure_at, updated_at)
  values (p_user_id, 'yahoo', coalesce(p_league_id, conn.league_id, 'yahoo'), p_yahoo_guid, acc_id, ref_id, p_expires_at,
          true, 'valid', now(), null, null, now())
  on conflict (user_id, platform) do update set
    league_id = coalesce(p_league_id, pc.league_id), platform_user_id = coalesce(excluded.platform_user_id, pc.platform_user_id),
    token_secret_id = excluded.token_secret_id, refresh_secret_id = excluded.refresh_secret_id,
    token_expires_at = excluded.token_expires_at, is_active = true, credential_state = 'valid',
    last_verified_at = now(), last_failure_code = null, last_failure_at = null, updated_at = now()
  returning pc.id into conn.id;

  return conn.id;
end $$;

-- Yahoo refresh, single-flight by compare-and-swap: the write happens only if nobody refreshed since
-- the caller read the row. Returns false when another request won; the caller then re-reads.
create function public.connection_rotate_yahoo(
  p_user_id uuid, p_expected_expires_at timestamptz, p_access_token text, p_refresh_token text, p_expires_at timestamptz
) returns boolean
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare conn public.platform_connections%rowtype;
begin
  if coalesce(p_access_token, '') = '' or p_expires_at is null then
    raise exception 'connection_rotate_yahoo: access token and expiry are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('omen.connection:' || p_user_id::text || ':yahoo', 0));

  select * into conn from public.platform_connections
   where user_id = p_user_id and platform = 'yahoo' for update;
  if not found or conn.token_secret_id is null then
    raise exception 'connection_rotate_yahoo: no Yahoo credential for this user' using errcode = 'P0002';
  end if;
  if conn.token_expires_at is distinct from p_expected_expires_at then
    return false;
  end if;

  perform vault.update_secret(conn.token_secret_id, p_access_token);
  if coalesce(p_refresh_token, '') <> '' then
    perform vault.update_secret(conn.refresh_secret_id, p_refresh_token);
  end if;
  update public.platform_connections
     set token_expires_at = p_expires_at, credential_state = 'valid', last_verified_at = now(),
         last_failure_code = null, last_failure_at = null, updated_at = now()
   where id = conn.id;
  return true;
end $$;

-- Record a provider's verdict on a credential (a read succeeded, or the provider refused it).
create function public.connection_record_health(
  p_user_id uuid, p_platform text, p_ok boolean, p_failure_code text default null
) returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_ok then
    update public.platform_connections
       set credential_state = 'valid', last_verified_at = now(), updated_at = now()
     where user_id = p_user_id and platform = p_platform;
  else
    update public.platform_connections
       set credential_state = 'needs_reauth', last_failure_code = coalesce(p_failure_code, 'provider_refused'),
           last_failure_at = now(), updated_at = now()
     where user_id = p_user_id and platform = p_platform;
  end if;
end $$;

-- Disconnect: delete every secret the row points at, then the row, in one transaction. If any part
-- fails the whole call fails and nothing changes, so the route can report failure honestly.
-- Returns false when there was no connection to remove.
create function public.connection_revoke(p_user_id uuid, p_platform text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare
  conn public.platform_connections%rowtype;
  ids uuid[];
  deleted int;
begin
  perform pg_advisory_xact_lock(hashtextextended('omen.connection:' || p_user_id::text || ':' || p_platform, 0));

  select * into conn from public.platform_connections
   where user_id = p_user_id and platform = p_platform for update;
  if not found then
    return false;
  end if;

  ids := array_remove(array[conn.token_secret_id, conn.refresh_secret_id, conn.espn_secret_id, conn.swid_secret_id], null);
  delete from vault.secrets where id = any (ids);
  get diagnostics deleted = row_count;
  if deleted <> coalesce(array_length(ids, 1), 0) then
    raise exception 'connection_revoke: % of % secrets found; refusing to drop the pointers', deleted, coalesce(array_length(ids, 1), 0);
  end if;

  delete from public.platform_connections where id = conn.id;
  return true;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.connection_store_espn(uuid, text, text, text, text)',
    'public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)',
    'public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)',
    'public.connection_record_health(uuid, text, boolean, text)',
    'public.connection_revoke(uuid, text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
