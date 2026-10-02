-- =================================================================
-- Slops Saloon Fantasy Football MVP (Omen)
-- Supabase setup - schema + RLS + Vault wrappers
-- -----------------------------------------------------------------
-- Run once on a fresh project; idempotent so it's safe to re-run on
-- existing projects to apply additions (new tables / columns / policies).
-- Built to match the production schema export verbatim.
--
-- 2026-07-12: Stripe/billing removed (Omen is free indefinitely, see
-- decision log). The `drop` statements below converge an existing
-- production database to the new schema when this script is re-run;
-- they are NOT idempotent no-ops on a fresh project, they are real
-- destructive drops -- run against production only with Justin's
-- explicit sign-off, after confirming no other consumer still reads
-- `public.subscriptions` or `public.users.is_subscribed`.
--
-- 2026-09-27: production database-hygiene pass (0 rows / 0 code
-- references, verified before dropping; see decision log). Also closed
-- an over-grant gap: `users`, `moves`, `consent_records`,
-- `deletion_audit_log`, and `oauth_state` all carried Supabase's default
-- full-CRUD grant to `anon`/`authenticated`, relying entirely on RLS to
-- block access. RLS did block it (verified empirically
-- against a throwaway project before touching production), but that made
-- "RLS stays enabled" a single point of failure for tables the app never
-- accesses as anon/authenticated in the first place -- the frontend's only
-- Supabase client (`frontend/src/lib/supabase.js`) is auth-session-only and
-- never calls `.from()`; the Express backend always uses the service-role
-- key. `oauth_credentials` and `system_context` are dropped below;
-- everything else is closed with explicit `revoke`/`grant` blocks in
-- section 5, matching the pattern this file already used for `profiles`,
-- `platform_connections`, and `waitlist_signups`.

drop table if exists public.subscriptions cascade;
alter table public.users drop column if exists is_subscribed;
drop table if exists public.oauth_credentials cascade;
drop table if exists public.system_context cascade;
drop table if exists public.local_snapshots cascade;


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

-- oauth_credentials was dropped 2026-09-27: 0 rows, 0 code references.
-- Superseded by platform_connections' own token_secret_id/refresh_secret_id/
-- espn_secret_id/swid_secret_id columns, which is what the app actually uses.

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

-- local_snapshots was dropped 2026-09-27: 0 rows, and its sole reader
-- (omen_agents.js's fetchWithLocalFallback) was confirmed unreachable --
-- never required by server.js, any cron entry point, or any Dockerfile.
-- omen_agents.js itself was already-retired legacy code (its own header
-- said so) superseded by src/services/agents.js + src/routes/optimizer.js,
-- and its "ssff-bot" data source never existed anywhere in this repo.
-- Deleted alongside it, not resurrected.

-- system_context was dropped 2026-09-27: 0 rows, 0 code references, and its
-- role (internal KV config store) was never actually populated.

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
create index if not exists idx_platform_connections_user_id on public.platform_connections (user_id);
create index if not exists idx_moves_user_week              on public.moves                (user_id, week_num, season);
create unique index if not exists idx_moves_user_week_unique on public.moves               (user_id, week_num, season);
create index if not exists idx_moves_pending                on public.moves                (outcome) where outcome = 'pending';
create index if not exists idx_oauth_state_expires_at       on public.oauth_state          (expires_at);
create index if not exists idx_waitlist_signups_created_at  on public.waitlist_signups     (created_at);
create index if not exists idx_league_office_awards_user_id     on public.league_office_awards     (user_id);
create index if not exists idx_league_office_lines_user_id      on public.league_office_lines      (user_id);
create index if not exists idx_league_office_sync_jobs_user_id  on public.league_office_sync_jobs  (user_id);


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
alter table public.system_context        enable row level security;
alter table public.waitlist_signups      enable row level security;

-- users -- self-only
drop policy if exists users_self_select on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists users_self_insert on public.users;
create policy users_self_select on public.users for select to authenticated using      ((select auth.uid()) = id);
create policy users_self_update on public.users for update to authenticated using      ((select auth.uid()) = id);
create policy users_self_insert on public.users for insert to authenticated with check ((select auth.uid()) = id);

-- Supabase grants full CRUD to anon/authenticated by default on table
-- creation; revoke it and grant back only what the policies above use.
-- Closed 2026-09-27 -- see the top-of-file note.
revoke all on table public.users from anon, authenticated;
grant select, insert, update on table public.users to authenticated;

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
create policy consent_self_select on public.consent_records for select to authenticated using      ((select auth.uid()) = user_id);
create policy consent_self_insert on public.consent_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy consent_self_update on public.consent_records for update to authenticated using      ((select auth.uid()) = user_id);

revoke all on table public.consent_records from anon, authenticated;
grant select, insert, update on table public.consent_records to authenticated;

-- oauth_credentials was dropped 2026-09-27 -- see the top-of-file note.

-- platform_connections -- read-own; api server (service_role) manages writes.
-- 2026-09-27: production had also accumulated "platform: insert own" and
-- "platform: update own" policies that this file never created and that
-- were never matched by a table grant (dead, and a deviation from the
-- read-only-via-RLS design below) -- dropped directly against production;
-- this file was already correct and needs no insert/update policy added.
drop policy if exists platforms_self_select on public.platform_connections;
create policy platforms_self_select on public.platform_connections for select to authenticated using ((select auth.uid()) = user_id);

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
create policy moves_self_all on public.moves for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on table public.moves to service_role;

revoke all on table public.moves from anon, authenticated;
grant select, insert, update on table public.moves to authenticated;

-- deletion_audit_log -- never readable by users; service_role still bypasses RLS
drop policy if exists deletion_audit_no_user_read on public.deletion_audit_log;
create policy deletion_audit_no_user_read on public.deletion_audit_log for select using (false);
revoke all on table public.deletion_audit_log from anon, authenticated;

-- oauth_state -- service_role only.
-- RLS enabled with NO policies = no anon/auth user can read or write, and
-- as of 2026-09-27 the default anon/authenticated table grant is revoked
-- too, so that stays true even if RLS is ever accidentally disabled.
-- service_role bypasses RLS and is not revoked here.
revoke all on table public.oauth_state from anon, authenticated;

-- waitlist_signups -- writes go through POST /api/waitlist, which uses the
-- server-only service_role key.  Do not expose a direct browser Data API path.
drop policy if exists anon_insert on public.waitlist_signups;
drop policy if exists authenticated_insert on public.waitlist_signups;

revoke all on table public.waitlist_signups from anon, authenticated;
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
-- =================================================================
