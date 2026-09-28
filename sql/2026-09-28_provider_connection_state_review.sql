-- REVIEW ONLY — do not apply to Supabase until Justin approves the migration.
--
-- Purpose: additive persistence for provider health observations. Secret values
-- remain in Vault; these columns contain only state, bounded diagnostics, and
-- timestamps. Existing rows remain valid because every column is nullable and
-- routes retain their compatibility fallback until the migration is applied.

alter table public.platform_connections
  add column if not exists connection_state text,
  add column if not exists connection_reason_code text,
  add column if not exists credential_generation bigint,
  add column if not exists consecutive_failures integer,
  add column if not exists last_status integer,
  add column if not exists last_checked_at timestamptz,
  add column if not exists state_changed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_connections_connection_state_check') then
    alter table public.platform_connections add constraint platform_connections_connection_state_check
      check (connection_state is null or connection_state in (
        'not_connected', 'connected', 'reconnect_required',
        'temporarily_unavailable', 'disconnected'
      ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_connections_credential_generation_check') then
    alter table public.platform_connections add constraint platform_connections_credential_generation_check
      check (credential_generation is null or credential_generation >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_connections_consecutive_failures_check') then
    alter table public.platform_connections add constraint platform_connections_consecutive_failures_check
      check (consecutive_failures is null or consecutive_failures >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_connections_last_status_check') then
    alter table public.platform_connections add constraint platform_connections_last_status_check
      check (last_status is null or last_status between 100 and 599);
  end if;
end $$;

create index if not exists idx_platform_connections_health_state
  on public.platform_connections (user_id, platform, connection_state);

-- Preserve the established RLS/grant contract from `sql/omen_rls_security.sql`:
-- authenticated may read the existing safe, column-limited connection view,
-- while the newly-added health columns remain ungranted to browser roles.
-- Do not blanket-revoke authenticated here: that would regress the client
-- league directory while adding no protection beyond the existing column grant.
revoke all on table public.platform_connections from anon;
grant select, insert, update, delete on table public.platform_connections to service_role;
