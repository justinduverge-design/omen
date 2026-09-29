/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
-- 1. Tables

create table public.users (
  id uuid primary key default gen_random_uuid(),\n  email text not null unique,\n  team_name text,\n  platform text,\n  league_id text,\n  created_at timestamptz default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid references public.users(id) on delete cascade,\n  consent_type text not null,\n  granted boolean not null,\n  granted_at timestamptz,\n  withdrawn_at timestamptz,\n  ip_address inet,\n  user_agent text
);

create table public.deletion_audit_log (
  id uuid primary key default gen_random_uuid(),\n  user_id_hash text not null,\n  deleted_at timestamptz default now(),\n  method text default 'user_requested'
);

create table public.league_office_accolades (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  league_id text not null,\n  season integer not null,\n  accolade_name text not null,\n  payout numeric not null default 0,\n  recipient text,\n  result_value text,\n  paid boolean not null default false,\n  paid_at timestamptz,\n  notes text,\n  unique (user_id, league_id, season, accolade_name)
);

create table public.league_office_awards (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  league_id text not null,\n  season integer not null,\n  week integer not null,\n  award_name text not null,\n  executive_name text,\n  detail text,\n  evidence text,\n  created_at timestamptz not null default now()
);

create table public.league_office_executives (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  league_id text not null,\n  season integer not null,\n  executive_name text not null,\n  platform_team_id text,\n  platform_team_name text,\n  owner_display_name text,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  unique (user_id, league_id, season, executive_name)
);

create table public.league_office_lines (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  league_id text not null,\n  season integer not null,\n  week integer not null,\n  game_id text not null,\n  favorite_team_id text,\n  spread numeric,\n  favorite_moneyline integer,\n  underdog_moneyline integer,\n  over_under numeric,\n  locked_at timestamptz not null default now(),\n  selection_reason text
);

create table public.league_office_matchups (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  platform text not null,\n  league_id text not null,\n  season integer not null,\n  week integer not null,\n  game_id text not null,\n  home_team_id text not null,\n  home_team_name text,\n  home_owner_name text,\n  home_score numeric,\n  home_projected numeric,\n  away_team_id text not null,\n  away_team_name text,\n  away_owner_name text,\n  away_score numeric,\n  away_projected numeric,\n  status text not null check (status in ('pregame','live','final')),\n  winner_team_id text,\n  source_verified boolean not null default true,\n  synced_at timestamptz not null default now(),\n  unique (user_id, platform, league_id, season, week, game_id)
);

create table public.league_office_rivalries (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  league_id text not null,\n  season integer not null,\n  executive_a text not null,\n  executive_b text not null,\n  priority integer not null default 1,\n  created_at timestamptz not null default now(),\n  unique (user_id, league_id, season, executive_a, executive_b)
);

create table public.league_office_sync_jobs (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid not null references public.users(id) on delete cascade,\n  platform text not null check (platform in ('espn','sleeper','yahoo')),\n  league_id text not null,\n  season integer not null,\n  week integer not null check (week between 1 and 25),\n  status text not null default 'queued' check (status in ('queued','running','completed','failed')),\n  error_code text,\n  created_at timestamptz not null default now(),\n  started_at timestamptz,\n  completed_at timestamptz
);

create table public.moves (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid references public.users(id) on delete cascade,\n  week_num integer not null,\n  season integer default 2026,\n  move_type text,\n  headline text,\n  reasoning text,\n  confidence integer,\n  target_player text,\n  vorp_score numeric,\n  followed boolean,\n  outcome text default 'pending',\n  created_at timestamptz default now(),\n  user_stars integer,\n  user_note text,\n  eff integer,\n  scoring text,\n  scoring_contract jsonb,\n  scoring_contract_hash text,\n  scoring_contract_version text,\n  scoring_contract_required boolean,\n  scoring_coverage_state text,\n  provider_rule_snapshot_hash text,\n  provider_final_outcome jsonb,\n  reconciliation_state text,\n  unique (user_id, week_num, season)
);

create table public.oauth_state (
  state text primary key,\n  platform text,\n  user_id uuid,\n  verifier text,\n  expires_at timestamptz
);

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),\n  user_id uuid references public.users(id) on delete cascade,\n  platform text not null,\n  league_id text not null,\n  is_active boolean default true,\n  created_at timestamptz default now(),\n  platform_user_id text,\n  platform_username text,\n  token_secret_id uuid,\n  refresh_secret_id uuid,\n  token_expires_at timestamptz,\n  espn_secret_id uuid,\n  espn_swid text,\n  espn_team_id text,\n  updated_at timestamptz default now(),\n  swid_secret_id uuid,\n  is_selected boolean default false
);

create table public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,\n  favorite_team text,\n  created_at timestamptz default now()
);

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),\n  email text not null,\n  platform text,\n  created_at timestamptz default now()
);


-- 2. Indexes
create index idx_league_office_matchups_lookup on public.league_office_matchups (user_id, league_id, season, week);
create index idx_league_office_sync_jobs_status on public.league_office_sync_jobs (status, created_at);
create index idx_league_office_awards_user_id on public.league_office_awards (user_id);
create index idx_league_office_lines_user_id on public.league_office_lines (user_id);
create index idx_league_office_sync_jobs_user_id on public.league_office_sync_jobs (user_id);
create unique index league_office_awards_league_week_name_key on public.league_office_awards (league_id, season, week, award_name);
create unique index league_office_lines_league_week_game_key on public.league_office_lines (league_id, season, week, game_id);

-- 3. RLS Policies
alter table public.users enable row level security;
alter table public.consent_records enable row level security;
alter table public.deletion_audit_log enable row level security;
alter table public.league_office_accolades enable row level security;
alter table public.league_office_awards enable row level security;
alter table public.league_office_executives enable row level security;
alter table public.league_office_lines enable row level security;
alter table public.league_office_matchups enable row level security;
alter table public.league_office_rivalries enable row level security;
alter table public.league_office_sync_jobs enable row level security;
alter table public.moves enable row level security;
alter table public.oauth_state enable row level security;
alter table public.platform_connections enable row level security;
alter table public.profiles enable row level security;
alter table public.waitlist_signups enable row level security;

create policy consent_self_select on public.consent_records for select to authenticated using ((select auth.uid()) = user_id);
create policy consent_self_insert on public.consent_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy consent_self_update on public.consent_records for update to authenticated using ((select auth.uid()) = user_id);

create policy deletion_audit_no_user_read on public.deletion_audit_log for select using (false);

create policy moves_self_all on public.moves for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy platforms_self_select on public.platform_connections for select to authenticated using ((select auth.uid()) = user_id);

create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_self_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy users_self_select on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_self_update on public.users for update to authenticated using ((select auth.uid()) = id);
create policy users_self_insert on public.users for insert to authenticated with check ((select auth.uid()) = id);


`);
};

exports.down = (pgm) => {};
