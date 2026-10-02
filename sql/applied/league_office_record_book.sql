-- Slops Saloon / League Office record book
-- Founder-authorized production schema, 2026-09-15.
-- All tables are service-role only. No provider credentials or raw ESPN payloads are stored.

create table if not exists public.league_office_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('espn','sleeper','yahoo')),
  league_id text not null,
  season integer not null,
  week integer not null check (week between 1 and 25),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_league_office_sync_jobs_status
  on public.league_office_sync_jobs (status, created_at);

create table if not exists public.league_office_matchups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null,
  league_id text not null,
  season integer not null,
  week integer not null,
  game_id text not null,
  home_team_id text not null,
  home_team_name text,
  home_owner_name text,
  home_score numeric,
  home_projected numeric,
  away_team_id text not null,
  away_team_name text,
  away_owner_name text,
  away_score numeric,
  away_projected numeric,
  status text not null check (status in ('pregame','live','final')),
  winner_team_id text,
  source_verified boolean not null default true,
  synced_at timestamptz not null default now(),
  unique (user_id, platform, league_id, season, week, game_id)
);

create index if not exists idx_league_office_matchups_lookup
  on public.league_office_matchups (user_id, league_id, season, week);

create table if not exists public.league_office_executives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  executive_name text not null,
  platform_team_id text,
  platform_team_name text,
  owner_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, league_id, season, executive_name)
);

create table if not exists public.league_office_rivalries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  executive_a text not null,
  executive_b text not null,
  priority integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, league_id, season, executive_a, executive_b)
);

create table if not exists public.league_office_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  week integer not null,
  game_id text not null,
  favorite_team_id text,
  spread numeric,
  favorite_moneyline integer,
  underdog_moneyline integer,
  over_under numeric,
  locked_at timestamptz not null default now(),
  selection_reason text,
  unique (user_id, league_id, season, week, game_id)
);

create table if not exists public.league_office_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  week integer not null,
  award_name text not null check (award_name in ('Move of the Week','Disaster of the Week')),
  executive_name text,
  detail text,
  evidence text,
  created_at timestamptz not null default now(),
  unique (user_id, league_id, season, week, award_name)
);

create table if not exists public.league_office_accolades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  accolade_name text not null,
  payout numeric not null default 0,
  recipient text,
  result_value text,
  paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  unique (user_id, league_id, season, accolade_name)
);

alter table public.league_office_sync_jobs enable row level security;
alter table public.league_office_matchups enable row level security;
alter table public.league_office_executives enable row level security;
alter table public.league_office_rivalries enable row level security;
alter table public.league_office_lines enable row level security;
alter table public.league_office_awards enable row level security;
alter table public.league_office_accolades enable row level security;

revoke all on table public.league_office_sync_jobs from anon, authenticated;
revoke all on table public.league_office_matchups from anon, authenticated;
revoke all on table public.league_office_executives from anon, authenticated;
revoke all on table public.league_office_rivalries from anon, authenticated;
revoke all on table public.league_office_lines from anon, authenticated;
revoke all on table public.league_office_awards from anon, authenticated;
revoke all on table public.league_office_accolades from anon, authenticated;

grant select, insert, update, delete on table public.league_office_sync_jobs to service_role;
grant select, insert, update, delete on table public.league_office_matchups to service_role;
grant select, insert, update, delete on table public.league_office_executives to service_role;
grant select, insert, update, delete on table public.league_office_rivalries to service_role;
grant select, insert, update, delete on table public.league_office_lines to service_role;
grant select, insert, update, delete on table public.league_office_awards to service_role;
grant select, insert, update, delete on table public.league_office_accolades to service_role;
