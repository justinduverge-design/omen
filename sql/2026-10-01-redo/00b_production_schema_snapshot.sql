-- SCRATCH ONLY. NEVER RUN AGAINST PRODUCTION. Production already IS this schema.
--
-- Omen production `public` schema as it stood on 2026-10-01, reconstructed from a read-only catalog
-- read (information_schema.columns, pg_constraint, pg_indexes, pg_policies, relacl/proacl) approved
-- by the founder in session. It replaces both `migrations/1790680789307_baseline.js` and
-- `sql/omen_rls_security.sql` as the starting point for rehearsals, because neither matches
-- production (see `Direction/2026-10-01-league-connections-review.md`, finding 10).
--
-- Last production migration at the time of the read: 20260930022039
-- `moves_league_scope_platform_league_id`. If production gains a migration after that, regenerate this
-- file before rehearsing anything; `verify_snapshot.sql` compares a rehearsal database against the
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

create table public.league_office_accolades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  league_id     text not null,
  season        integer not null,
  accolade_name text not null,
  payout        numeric not null default 0,
  recipient     text,
  result_value  text,
  paid          boolean not null default false,
  paid_at       timestamptz,
  notes         text,
  constraint league_office_accolades_user_id_league_id_season_accolade_n_key unique (user_id, league_id, season, accolade_name)
);

create table public.league_office_awards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  league_id      text not null,
  season         integer not null,
  week           integer not null,
  award_name     text not null check (award_name = any (array['Top Performer'::text, 'Pickup of the Week'::text, 'Drop of the Week'::text])),
  executive_name text,
  detail         text,
  evidence       text,
  created_at     timestamptz not null default now()
);

create table public.league_office_executives (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  league_id          text not null,
  season             integer not null,
  executive_name     text not null,
  platform_team_id   text,
  platform_team_name text,
  owner_display_name text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint league_office_executives_user_id_league_id_season_executive_key unique (user_id, league_id, season, executive_name)
);

create table public.league_office_lines (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  league_id          text not null,
  season             integer not null,
  week               integer not null,
  game_id            text not null,
  favorite_team_id   text,
  spread             numeric,
  favorite_moneyline integer,
  underdog_moneyline integer,
  over_under         numeric,
  locked_at          timestamptz not null default now(),
  selection_reason   text
);

create table public.league_office_matchups (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  platform        text not null,
  league_id       text not null,
  season          integer not null,
  week            integer not null,
  game_id         text not null,
  home_team_id    text not null,
  home_team_name  text,
  home_owner_name text,
  home_score      numeric,
  home_projected  numeric,
  away_team_id    text not null,
  away_team_name  text,
  away_owner_name text,
  away_score      numeric,
  away_projected  numeric,
  status          text not null check (status = any (array['pregame'::text, 'live'::text, 'final'::text])),
  winner_team_id  text,
  source_verified boolean not null default true,
  synced_at       timestamptz not null default now(),
  constraint league_office_matchups_league_game_key unique (platform, league_id, season, week, game_id)
);

create table public.league_office_rivalries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  league_id   text not null,
  season      integer not null,
  executive_a text not null,
  executive_b text not null,
  priority    integer not null default 1,
  created_at  timestamptz not null default now(),
  constraint league_office_rivalries_user_id_league_id_season_executive__key unique (user_id, league_id, season, executive_a, executive_b)
);

create table public.league_office_sync_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  platform     text not null check (platform = any (array['espn'::text, 'sleeper'::text, 'yahoo'::text])),
  league_id    text not null,
  season       integer not null,
  week         integer not null check (week >= 1 and week <= 25),
  status       text not null default 'queued' check (status = any (array['queued'::text, 'running'::text, 'completed'::text, 'failed'::text])),
  error_code   text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  constraint league_office_sync_jobs_league_week_key unique (platform, league_id, season, week)
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
create index idx_league_office_awards_user_id on public.league_office_awards (user_id);
create unique index league_office_awards_league_week_name_key on public.league_office_awards (league_id, season, week, award_name);
create index idx_league_office_lines_user_id on public.league_office_lines (user_id);
create unique index league_office_lines_league_week_game_key on public.league_office_lines (league_id, season, week, game_id);
create index idx_league_office_matchups_league_week on public.league_office_matchups (platform, league_id, season, week);
create index idx_league_office_matchups_lookup on public.league_office_matchups (user_id, league_id, season, week);
create index idx_league_office_sync_jobs_status on public.league_office_sync_jobs (status, created_at);
create index idx_league_office_sync_jobs_user_id on public.league_office_sync_jobs (user_id);
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

-- ACLs exactly as production (2026-10-01) ----------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['users','consent_records','deletion_audit_log','league_office_accolades',
    'league_office_awards','league_office_executives','league_office_lines','league_office_matchups',
    'league_office_rivalries','league_office_sync_jobs','moves','oauth_state','platform_connections',
    'profiles','waitlist_signups']
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
grant select, insert, update on public.users, public.moves, public.consent_records to authenticated;

revoke all on function public.vault_create_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.vault_decrypt_secret(uuid) from public, anon, authenticated;
revoke all on function public.vault_update_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.vault_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.vault_create_secret(text, text, text) to service_role;
grant execute on function public.vault_decrypt_secret(uuid) to service_role;
grant execute on function public.vault_update_secret(uuid, text) to service_role;
grant execute on function public.vault_delete_secret(uuid) to service_role;
