-- SCRATCH ONLY. NEVER RUN AGAINST PRODUCTION. Production already IS this schema.
--
-- Omen production `public` schema as it stood on 2026-10-01, reconstructed from a read-only catalog
-- read (information_schema.columns, pg_constraint, pg_indexes, pg_policies, relacl/proacl) approved
-- by the founder in session. It replaces both `migrations/1790680789307_baseline.js` and
-- `sql/omen_rls_security.sql` as the starting point for rehearsals, because neither matches
-- production (see `Direction/2026-10-01-league-connections-review.md`, finding 10).
--
-- Last production migration at the time of the read: 20260930022039
-- `moves_league_scope_platform_league_id`. Since then, 2026-10-02: the seven `league_office_*` tables
-- were dropped (`sql/applied/2026-10-02_drop_league_office.sql`) and removed here and from the fixture.
-- Last production migration now: 20261002231212 `drop_league_office`. If production gains another
-- migration, regenerate this file before rehearsing anything; `verify_snapshot.sql` compares a rehearsal database against the
-- column/constraint inventory recorded below.
--
-- Run after 00a_scratch_supabase_shim.sql. Objects are created as the `postgres` role, as in
-- production; the explicit revoke/grant block at the end reproduces production's table ACLs exactly
-- (the 2026-09-27 hygiene pass removed the Supabase defaults).

-- Tables ---------------------------------------------------------------------------------------

create table public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  team_name  text,
  platform   text,
  league_id  text,
  created_at timestamptz default now()
);

create table public.consent_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  consent_type text not null,
  granted      boolean not null,
  granted_at   timestamptz,
  withdrawn_at timestamptz,
  ip_address   inet,
  user_agent   text,
  constraint consent_records_user_id_consent_type_key unique (user_id, consent_type)
);

create table public.deletion_audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id_hash text not null,
  deleted_at   timestamptz default now(),
  method       text default 'user_requested'
);

create table public.moves (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references public.users(id) on delete cascade,
  week_num                    integer not null,
  season                      integer default 2026,
  move_type                   text,
  headline                    text,
  reasoning                   text,
  confidence                  integer,
  target_player               text,
  vorp_score                  numeric,
  followed                    boolean,
  outcome                     text default 'pending',
  created_at                  timestamptz default now(),
  user_stars                  integer,
  user_note                   text,
  eff                         integer,
  scoring                     text,
  scoring_contract            jsonb,
  scoring_contract_hash       text,
  scoring_contract_version    text,
  scoring_contract_required   boolean,
  scoring_coverage_state      text,
  provider_rule_snapshot_hash text,
  provider_final_outcome      jsonb,
  reconciliation_state        text,
  platform                    text,
  league_id                   text
);

create table public.oauth_state (
  state      text primary key,
  platform   text,
  user_id    uuid,
  verifier   text,
  expires_at timestamptz
);

create table public.platform_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.users(id) on delete cascade,
  platform          text not null,
  league_id         text not null,
  is_active         boolean default true,
  created_at        timestamptz default now(),
  platform_user_id  text,
  platform_username text,
  token_secret_id   uuid,
  refresh_secret_id uuid,
  token_expires_at  timestamptz,
  espn_secret_id    uuid,
  espn_swid         text,
  espn_team_id      text,
  updated_at        timestamptz default now(),
  swid_secret_id    uuid,
  is_selected       boolean,
  constraint platform_connections_user_platform_unique unique (user_id, platform)
);

create table public.profiles (
  user_id       uuid primary key references public.users(id) on delete cascade,
  favorite_team text,
  created_at    timestamptz default now()
);

create table public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  platform   text,
  created_at timestamptz not null default now()
);

-- Indexes (beyond the ones constraints create) ---------------------------------------------------

create index idx_consent_records_user_id on public.consent_records (user_id);
create index idx_moves_pending on public.moves (outcome) where (outcome = 'pending'::text);
create index idx_moves_user_week on public.moves (user_id, week_num, season);
create unique index idx_moves_user_week_unique on public.moves (user_id, week_num, season);
create index moves_outcome_idx on public.moves (outcome, followed);
create index moves_user_id_idx on public.moves (user_id);
create index moves_user_season_league_created on public.moves (user_id, season, platform, league_id, created_at desc);
create index moves_week_idx on public.moves (week_num, season);
create index idx_oauth_state_expires_at on public.oauth_state (expires_at);
create index idx_platform_connections_user_id on public.platform_connections (user_id);
create unique index platform_connections_one_selected_per_user on public.platform_connections (user_id) where is_selected;
create index idx_waitlist_signups_created_at on public.waitlist_signups (created_at);

-- RLS policies (RLS is already on for every table via the ensure_rls event trigger) -----------------

create policy consent_self_insert on public.consent_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy consent_self_select on public.consent_records for select to authenticated using ((select auth.uid()) = user_id);
create policy consent_self_update on public.consent_records for update to authenticated using ((select auth.uid()) = user_id);
create policy deletion_audit_no_user_read on public.deletion_audit_log for select using (false);
create policy moves_self_all on public.moves for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy platforms_self_select on public.platform_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_self_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy users_self_insert on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy users_self_select on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_self_update on public.users for update to authenticated using ((select auth.uid()) = id);

-- Vault wrapper functions (service_role only, as in production) -----------------------------------

create or replace function public.vault_create_secret(secret text, name text default null, description text default '')
returns uuid language plpgsql security definer set search_path = public, vault as $$
declare new_id uuid;
begin
  select vault.create_secret(secret, name, description) into new_id;
  return new_id;
end $$;

create or replace function public.vault_decrypt_secret(secret_id uuid)
returns table (decrypted_secret text) language plpgsql security definer set search_path = public, vault as $$
begin
  return query select s.decrypted_secret::text from vault.decrypted_secrets s where s.id = secret_id;
end $$;

create or replace function public.vault_update_secret(secret_id uuid, new_secret text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  perform vault.update_secret(secret_id, new_secret);
end $$;

create or replace function public.vault_delete_secret(secret_id uuid)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  delete from vault.secrets where id = secret_id;
end $$;

-- ACLs: in 00d_production_acls.sql (separate so a restored backup, which drops privileges, can re-apply them).
