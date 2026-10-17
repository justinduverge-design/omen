-- Step 17: invalidate a dead provider credential without disconnecting the league.
--
-- When ESPN refuses a stored cookie pair, or Yahoo refuses a refresh token, the credential is useless and must
-- not stay on Omen's servers. connection_invalidate deletes every Vault secret the connection points at, clears
-- the pointers (and the legacy plaintext espn_swid), and marks the row needs_reauth with the failure code and
-- time. The row itself stays (league, team, selection), so reconnecting restores everything; nothing else is
-- touched. One transaction under the same per-connection lock connection_revoke uses.

begin;

do $$
begin
  if to_regprocedure('public.connection_record_health(uuid, text, boolean, text)') is null then
    raise exception 'step 17 preflight: step 02 must be applied first';
  end if;
  if to_regprocedure('public.connection_invalidate(uuid, text, text)') is not null then
    raise exception 'step 17 preflight: connection_invalidate already exists';
  end if;
end $$;

create function public.connection_invalidate(p_user_id uuid, p_platform text, p_failure_code text)
returns integer
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare
  conn public.platform_connections%rowtype;
  ids uuid[];
  deleted int := 0;
begin
  if p_user_id is null or p_platform not in ('espn', 'yahoo') then
    raise exception 'connection_invalidate: espn or yahoo connection required' using errcode = '22023';
  end if;
  if p_failure_code is null or p_failure_code !~ '^[a-z][a-z0-9_]{0,63}$' then
    raise exception 'connection_invalidate: failure code required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('omen.connection:' || p_user_id::text || ':' || p_platform, 0));

  select * into conn from public.platform_connections
   where user_id = p_user_id and platform = p_platform for update;
  if not found then
    return -1;
  end if;

  ids := array_remove(array[conn.token_secret_id, conn.refresh_secret_id, conn.espn_secret_id, conn.swid_secret_id], null);
  if coalesce(array_length(ids, 1), 0) > 0 then
    delete from vault.secrets where id = any (ids);
    get diagnostics deleted = row_count;
  end if;

  update public.platform_connections
     set token_secret_id = null, refresh_secret_id = null, espn_secret_id = null, swid_secret_id = null,
         espn_swid = null, token_expires_at = null,
         credential_state = 'needs_reauth', last_failure_code = p_failure_code, last_failure_at = now(), updated_at = now()
   where id = conn.id;
  return deleted;
end $$;

revoke all on function public.connection_invalidate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.connection_invalidate(uuid, text, text) to service_role;

comment on function public.connection_invalidate(uuid, text, text) is
  'Delete a refused credential''s Vault secrets, clear the pointers and mark the connection needs_reauth; keeps the league. Returns secrets deleted, or -1 when there is no connection.';

commit;
