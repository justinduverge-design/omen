-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 10 — erase a whole account in ONE transaction (Codex review, #505).
--
-- Without this, account deletion needs connection_revoke() once per provider plus ledger_erase_user()
-- plus several table deletes, each its own Supabase RPC that commits on its own. A failure halfway leaves
-- the account partly erased: say, the ESPN cookie deleted but the Yahoo token still in Vault. This function
-- does all of it or none of it:
--   1. locks the user row;
--   2. deletes every Vault secret the person's connections point at, and refuses to continue if any is
--      missing (the same rule as connection_revoke);
--   3. erases the Ledger through the append-only guard's erasure flag;
--   4. deletes connections (memberships cascade), moves, consent, OAuth state, beta reports and held
--      retired rows (both cascade from users), profiles and League Office rows (cascade from users);
--   5. writes the deletion_audit_log row: sha256 of the user id, the same hash the route writes today;
--   6. deletes the users row.
-- The Auth account is deleted afterwards by the route through the Auth API (step 01's foreign key requires
-- the users row to be gone first). If that last call fails, the person can sign in again into an empty
-- account; no Omen data survives either way.
--
-- Requires steps 01, 02 and 05. Server-only: EXECUTE for service_role alone.

begin;

do $$
begin
  if to_regclass('public.decisions') is null
     or not exists (select 1 from pg_proc where proname = 'ledger_erase_user' and pronamespace = 'public'::regnamespace) then
    raise exception 'step 10 preflight: step 05 must be applied first';
  end if;
  if exists (select 1 from pg_proc where proname = 'account_erase' and pronamespace = 'public'::regnamespace) then
    raise exception 'step 10 preflight: account_erase already exists';
  end if;
end $$;

create function public.account_erase(p_user_id uuid, p_method text default 'user_requested') returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, vault as $$
declare
  ids uuid[];
  secrets_n integer;
  calls_n integer;
  connections_n integer;
  moves_n integer;
  consent_n integer;
begin
  perform 1 from public.users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('erased', false, 'reason', 'no_such_user');
  end if;

  select coalesce(array_agg(x), '{}') into ids
    from public.platform_connections pc,
         unnest(array[pc.token_secret_id, pc.refresh_secret_id, pc.espn_secret_id, pc.swid_secret_id]) x
   where pc.user_id = p_user_id and x is not null;
  delete from vault.secrets where id = any (ids);
  get diagnostics secrets_n = row_count;
  if secrets_n <> coalesce(array_length(ids, 1), 0) then
    raise exception 'account_erase: % of % secrets found; refusing to erase a partial account', secrets_n, coalesce(array_length(ids, 1), 0);
  end if;

  perform set_config('omen.ledger_erasure', 'on', true);
  delete from public.decisions where user_id = p_user_id;
  get diagnostics calls_n = row_count;
  perform set_config('omen.ledger_erasure', '', true);

  delete from public.platform_connections where user_id = p_user_id;
  get diagnostics connections_n = row_count;
  delete from public.moves where user_id = p_user_id;
  get diagnostics moves_n = row_count;
  delete from public.consent_records where user_id = p_user_id;
  get diagnostics consent_n = row_count;
  delete from public.oauth_state where user_id = p_user_id;

  insert into public.deletion_audit_log (user_id_hash, method)
  values (encode(sha256(convert_to(p_user_id::text, 'UTF8')), 'hex'), coalesce(p_method, 'user_requested'));

  delete from public.users where id = p_user_id;

  return jsonb_build_object('erased', true, 'vault_secrets', secrets_n, 'connections', connections_n,
                            'ledger_calls', calls_n, 'legacy_moves', moves_n, 'consent_records', consent_n);
end $$;

revoke all on function public.account_erase(uuid, text) from public, anon, authenticated;
grant execute on function public.account_erase(uuid, text) to service_role;

commit;
