-- =================================================================
-- Slops Saloon Fantasy Football MVP (Omen)
-- Supabase setup - schema + RLS + Vault wrappers
-- -----------------------------------------------------------------
-- Run once on a fresh project; idempotent so it's safe to re-run on
-- existing projects to apply additions (new tables / columns / policies).
-- Built to match the production schema export while removing the retired
-- paid-access schema from both fresh and existing databases.
-- =================================================================


-- =================================================================
-- 1. EXTENSIONS
-- =================================================================

create extension if not exists "uuid-ossp";

-- Supabase Vault is provided automatically on every Supabase project
-- as the `vault` schema (vault.secrets, vault.decrypted_secrets,
-- vault.create_secret, etc.) and is no longer backed by pg_sodium
-- (which Supabase deprecated). Nothing to install here.


-- =================================================================
-- 2. CORE SCHEMA
-- =================================================================

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  team_name     text,
  platform      text,
  league_id     text,
  push_token     text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table if not exists public.profiles (
  user_id       uuid primary key references public.users(id) on delete cascade,
  favorite_team text,
  created_at    timestamptz default now()
);

alter table public.profiles
  add column if not exists favorite_team text;

create table if not exists public.consent_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  consent_type  text not null,
  granted       boolean not null,
  granted_at    timestamptz,
  withdrawn_at  timestamptz,
  ip_address    inet,
  user_agent    text
);

create table if not exists public.oauth_credentials (
  user_id          uuid not null references public.users(id) on delete cascade,
  platform         text not null,
  access_token_id  uuid,
  refresh_token_id uuid,
  expires_at       timestamptz,
  primary key (user_id, platform)
);

create table if not exists public.platform_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  platform    text not null,
  league_id   text not null,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- platform_connections additions: the API code references these columns,
-- but they were missing from production. ADD COLUMN IF NOT EXISTS makes
-- this safe to apply against the live DB without breaking existing rows.
alter table public.platform_connections
  add column if not exists platform_user_id   text,
  add column if not exists platform_username  text,
  add column if not exists token_secret_id    uuid,   -- Vault secret_id
  add column if not exists refresh_secret_id  uuid,   -- Vault secret_id
  add column if not exists token_expires_at   timestamptz,
  add column if not exists espn_secret_id     uuid,   -- Vault secret_id
  add column if not exists swid_secret_id     uuid,   -- Vault secret_id
  add column if not exists espn_swid          text,
  add column if not exists espn_team_id       text,
  add column if not exists updated_at         timestamptz default now();

create table if not exists public.moves (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete cascade,
  week_num      integer not null,
  season        integer default 2026,
  move_type     text,
  headline      text,
  reasoning     text,
  confidence    integer,
  target_player text,
  vorp_score    numeric,
  followed      boolean,
  scoring       text default 'PPR',
  platform      text,
  league_id     text,
  eff           integer,
  result        text,
  scored_at     timestamptz,
  user_stars    integer,
  user_note     text,
  outcome       text default 'pending',
  created_at    timestamptz default now()
);

alter table public.moves
  add column if not exists followed   boolean,
  add column if not exists user_stars integer,
  add column if not exists user_note  text,
  add column if not exists outcome    text default 'pending',
  add column if not exists eff        integer;

create table if not exists public.deletion_audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id_hash  text not null,
  deleted_at    timestamptz default now(),
  method        text default 'user_requested'
);


-- =================================================================
-- 3. NEW TABLES (previously missing from setup script)
-- =================================================================

-- oauth_state -- short-lived PKCE state during Yahoo OAuth handshake.
-- API server creates a row on /authorize, validates+deletes on /callback.
-- expires_at is set but the API also needs to enforce it (cleanup cron).
create table if not exists public.oauth_state (
  state       text primary key,
  platform    text,
  user_id     uuid,
  verifier    text,
  expires_at  timestamptz
);

-- local_snapshots -- emergency-fallback ingestion path for ssff-bot data.
-- See omen_agents.js [A] LOCAL LOGIC BRIDGE.
create table if not exists public.local_snapshots (
  league_id    text primary key,
  snapshot     jsonb not null,
  source       text default 'ssff-bot-local',
  exported_at  timestamptz,
  ingested_at  timestamptz default now()
);

-- system_context -- internal KV config store (e.g. current_week, model_version).
create table if not exists public.system_context (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz
);

-- Remove retired paid-access storage from existing databases. These statements
-- are intentionally idempotent; production execution remains a separate,
-- founder-approved migration step.
drop table if exists public.subscriptions;
alter table public.users drop column if exists is_subscribed;

-- waitlist_signups -- public landing-page capture.
-- Duplicate emails are allowed intentionally so the current frontend never
-- turns a repeat signup into a generic launch-blocking error.
create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  platform   text,
  created_at timestamptz default now()
);


-- =================================================================
-- 4. INDEXES
-- =================================================================

create index if not exists idx_consent_records_user_id      on public.consent_records      (user_id);
create index if not exists idx_oauth_credentials_user_id    on public.oauth_credentials    (user_id);
create index if not exists idx_platform_connections_user_id on public.platform_connections (user_id);
create index if not exists idx_moves_user_week              on public.moves                (user_id, week_num, season);
create unique index if not exists idx_moves_user_week_unique on public.moves               (user_id, week_num, season);
create index if not exists idx_moves_pending                on public.moves                (outcome) where outcome = 'pending';
create index if not exists idx_oauth_state_expires_at       on public.oauth_state          (expires_at);
create index if not exists idx_waitlist_signups_created_at  on public.waitlist_signups     (created_at);


-- =================================================================
-- 5. ROW LEVEL SECURITY
-- =================================================================

alter table public.users                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.consent_records       enable row level security;
alter table public.oauth_credentials     enable row level security;
alter table public.platform_connections  enable row level security;
alter table public.moves                 enable row level security;
alter table public.deletion_audit_log    enable row level security;
alter table public.oauth_state           enable row level security;
alter table public.local_snapshots       enable row level security;
alter table public.system_context        enable row level security;
alter table public.waitlist_signups      enable row level security;

-- users -- self-only
drop policy if exists users_self_select on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists users_self_insert on public.users;
create policy users_self_select on public.users for select using      (auth.uid() = id);
create policy users_self_update on public.users for update using      (auth.uid() = id);
create policy users_self_insert on public.users for insert with check (auth.uid() = id);

-- profiles -- self-only team preference
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy profiles_self_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
grant select (user_id, favorite_team) on table public.profiles to authenticated;
grant insert (user_id, favorite_team) on table public.profiles to authenticated;
grant update (favorite_team) on table public.profiles to authenticated;
grant select, insert, update on table public.profiles to service_role;

-- consent_records
drop policy if exists consent_self_select on public.consent_records;
drop policy if exists consent_self_insert on public.consent_records;
drop policy if exists consent_self_update on public.consent_records;
create policy consent_self_select on public.consent_records for select using      (auth.uid() = user_id);
create policy consent_self_insert on public.consent_records for insert with check (auth.uid() = user_id);
create policy consent_self_update on public.consent_records for update using      (auth.uid() = user_id);

-- oauth_credentials
drop policy if exists oauth_self_select on public.oauth_credentials;
drop policy if exists oauth_self_insert on public.oauth_credentials;
drop policy if exists oauth_self_update on public.oauth_credentials;
drop policy if exists oauth_self_delete on public.oauth_credentials;
create policy oauth_self_select on public.oauth_credentials for select using      (auth.uid() = user_id);
create policy oauth_self_insert on public.oauth_credentials for insert with check (auth.uid() = user_id);
create policy oauth_self_update on public.oauth_credentials for update using      (auth.uid() = user_id);
create policy oauth_self_delete on public.oauth_credentials for delete using      (auth.uid() = user_id);

-- platform_connections -- read-own; api server (service_role) manages writes
drop policy if exists platforms_self_select on public.platform_connections;
create policy platforms_self_select on public.platform_connections for select using (auth.uid() = user_id);

-- Column-level grants keep client-visible connection status useful without
-- exposing Vault secret UUIDs. Server routes use service_role and bypass this.
revoke all on table public.platform_connections from anon, authenticated;
grant select (
  id,
  user_id,
  platform,
  league_id,
  is_active,
  created_at,
  platform_user_id,
  platform_username,
  token_expires_at,
  espn_team_id,
  updated_at
) on table public.platform_connections to authenticated;

-- moves -- full self-access
drop policy if exists moves_self_all on public.moves;
create policy moves_self_all on public.moves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on table public.moves to service_role;

-- deletion_audit_log -- never readable by users; service_role still bypasses RLS
drop policy if exists deletion_audit_no_user_read on public.deletion_audit_log;
create policy deletion_audit_no_user_read on public.deletion_audit_log for select using (false);

-- oauth_state, local_snapshots, system_context -- service_role only.
-- RLS enabled with NO policies = no anon/auth user can read or write.
-- service_role bypasses RLS.

-- waitlist_signups -- browser may insert only; no anon/auth select/update/delete
drop policy if exists anon_insert on public.waitlist_signups;
create policy anon_insert on public.waitlist_signups
  for insert to anon, authenticated
  with check (true);

revoke all on table public.waitlist_signups from anon, authenticated;
grant insert (email, platform) on table public.waitlist_signups to anon, authenticated;
grant select, insert, update, delete on table public.waitlist_signups to service_role;


-- =================================================================
-- 6. VAULT WRAPPER RPCs
-- -----------------------------------------------------------------
-- Drop first because the existing functions in production may have
-- different return types (CREATE OR REPLACE refuses to change a
-- function's return type). Safe because the API immediately re-creates
-- them below; this script is run as a single SQL editor execution.
-- =================================================================

-- Drop ALL overloads of the three vault wrappers regardless of
-- existing signatures. The simpler `DROP FUNCTION IF EXISTS (uuid)`
-- form only matches an exact signature; production may have these
-- functions defined with text/uuid/etc parameters or different return
-- types from earlier setups. This DO block is signature-agnostic.
do $$
declare r record;
begin
  for r in
    select 'drop function ' || p.oid::regprocedure || ' cascade' as stmt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('vault_create_secret',
                        'vault_decrypt_secret',
                        'vault_update_secret',
                        'vault_delete_secret')
  loop
    execute r.stmt;
  end loop;
end $$;

create or replace function public.vault_create_secret(
  secret      text,
  name        text default null,
  description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  new_id uuid;
begin
  select vault.create_secret(secret, name, description) into new_id;
  return new_id;
end;
$$;

create or replace function public.vault_decrypt_secret(secret_id uuid)
returns table (decrypted_secret text)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  return query
  select s.decrypted_secret::text
  from   vault.decrypted_secrets s
  where  s.id = secret_id;
end;
$$;

create or replace function public.vault_update_secret(
  secret_id  uuid,
  new_secret text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform vault.update_secret(secret_id, new_secret);
end;
$$;

create or replace function public.vault_delete_secret(secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  delete from vault.secrets where id = secret_id;
end;
$$;

revoke all on function public.vault_create_secret(text, text, text)  from public;
revoke all on function public.vault_decrypt_secret(uuid)             from public;
revoke all on function public.vault_update_secret(uuid, text)        from public;
revoke all on function public.vault_delete_secret(uuid)               from public;
grant execute on function public.vault_create_secret(text, text, text) to service_role;
grant execute on function public.vault_decrypt_secret(uuid)            to service_role;
grant execute on function public.vault_update_secret(uuid, text)       to service_role;
grant execute on function public.vault_delete_secret(uuid)             to service_role;


-- =================================================================
-- DONE.
-- After running, verify:
--   select tablename, rowsecurity from pg_tables where schemaname='public';
--   select proname from pg_proc where proname like 'vault_%';
--   select to_regclass('public.subscriptions'); -- expected: null (relation does not exist)
-- =================================================================
