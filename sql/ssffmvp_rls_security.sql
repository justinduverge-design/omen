-- ════════════════════════════════════════════════════════════════
-- Slops Saloon Fantasy Football MVP (SSFFMVP)
-- Supabase Setup — Schema + RLS + Vault Wrappers
-- ----------------------------------------------------------------
-- Run once in the Supabase SQL Editor on a fresh project.
-- Idempotent: safe to re-run; uses IF NOT EXISTS / OR REPLACE.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists pg_sodium  with schema pgsodium;
-- Supabase Vault is built on pg_sodium and is enabled by default
-- on Supabase projects. This adds the `vault` schema with
-- vault.secrets / vault.decrypted_secrets and helper functions.


-- ─────────────────────────────────────────────────────────────
-- 2. CORE SCHEMA
-- ─────────────────────────────────────────────────────────────

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  team_name     text,
  platform      text,
  league_id     text,
  is_subscribed boolean default false,
  created_at    timestamptz default now()
);

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
  access_token_id  uuid,   -- Vault secret_id (UUID), NOT the token itself
  refresh_token_id uuid,   -- Vault secret_id (UUID), NOT the token itself
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
  outcome       text default 'pending',
  created_at    timestamptz default now()
);

create table if not exists public.deletion_audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id_hash  text not null,
  deleted_at    timestamptz default now(),
  method        text default 'user_requested'
);


-- ─────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_consent_records_user_id      on public.consent_records      (user_id);
create index if not exists idx_oauth_credentials_user_id    on public.oauth_credentials    (user_id);
create index if not exists idx_platform_connections_user_id on public.platform_connections (user_id);
create index if not exists idx_moves_user_week              on public.moves                (user_id, week_num, season);
create index if not exists idx_moves_pending                on public.moves                (outcome) where outcome = 'pending';


-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table public.users                enable row level security;
alter table public.consent_records      enable row level security;
alter table public.oauth_credentials    enable row level security;
alter table public.platform_connections enable row level security;
alter table public.moves                enable row level security;
alter table public.deletion_audit_log   enable row level security;

-- users: each authenticated user can only see/edit their own row
drop policy if exists users_self_select on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists users_self_insert on public.users;
create policy users_self_select on public.users for select using      (auth.uid() = id);
create policy users_self_update on public.users for update using      (auth.uid() = id);
create policy users_self_insert on public.users for insert with check (auth.uid() = id);

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

-- platform_connections
drop policy if exists platforms_self_all on public.platform_connections;
create policy platforms_self_all on public.platform_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- moves
drop policy if exists moves_self_all on public.moves;
create policy moves_self_all on public.moves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- deletion_audit_log: never readable by users (insert-only via app);
-- service_role bypasses RLS so the cron/admin can still query.
drop policy if exists deletion_audit_no_user_read on public.deletion_audit_log;
create policy deletion_audit_no_user_read on public.deletion_audit_log for select using (false);


-- ─────────────────────────────────────────────────────────────
-- 5. VAULT WRAPPER RPCs
-- The Node.js API calls these via `supabase.rpc(name, args)`.
-- They wrap Supabase Vault so app code never sees pgsodium directly.
-- Signatures match what src/ssffmvp_api_v2.js expects.
-- ─────────────────────────────────────────────────────────────

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

-- Restrict execution to authenticated users + service_role
revoke all on function public.vault_create_secret(text, text, text)  from public;
revoke all on function public.vault_decrypt_secret(uuid)             from public;
revoke all on function public.vault_update_secret(uuid, text)        from public;

grant execute on function public.vault_create_secret(text, text, text) to authenticated, service_role;
grant execute on function public.vault_decrypt_secret(uuid)            to authenticated, service_role;
grant execute on function public.vault_update_secret(uuid, text)       to authenticated, service_role;


-- ════════════════════════════════════════════════════════════════
-- DONE.
-- After running, verify:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--   select proname from pg_proc where proname like 'vault_%';
-- ════════════════════════════════════════════════════════════════
