-- =================================================================
-- Corvus Phase 1 Launch Readiness
-- ADP + per-league scoring configuration schema
-- -----------------------------------------------------------------
-- REVIEW ONLY. Do not apply to Supabase until Justin approves.
-- This is intentionally separate from corvus_rls_security.sql because
-- production migration application is a manual approval gate.
-- =================================================================


-- =================================================================
-- 1. ADP SOURCE TABLES
-- -----------------------------------------------------------------
-- Backend-owned source snapshots for Draft Assistant and later math
-- parameterization. No user data lives in these tables.
-- =================================================================

create table if not exists public.adp_sources (
  id             uuid primary key default gen_random_uuid(),
  source_key     text not null,
  source_name    text not null,
  season         integer not null,
  scoring_format text not null default 'ppr',
  league_size    integer not null default 12,
  source_url     text,
  attribution    text,
  fetched_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint adp_sources_scoring_format_check
    check (scoring_format in ('ppr', 'half_ppr', 'standard', 'custom')),
  constraint adp_sources_league_size_check
    check (league_size between 2 and 20)
);

create unique index if not exists idx_adp_sources_scope
  on public.adp_sources (source_key, season, scoring_format, league_size);

create index if not exists idx_adp_sources_recent
  on public.adp_sources (season, scoring_format, league_size, fetched_at desc);

create table if not exists public.adp_player_rankings (
  id                 uuid primary key default gen_random_uuid(),
  source_id          uuid not null references public.adp_sources(id) on delete cascade,
  season             integer not null,
  scoring_format     text not null default 'ppr',
  league_size        integer not null default 12,
  provider_player_id text,
  player_id          text,
  player_name        text not null,
  position           text not null,
  team               text,
  adp_rank           integer,
  overall_adp        numeric(7, 2),
  positional_adp     numeric(7, 2),
  min_pick           numeric(7, 2),
  max_pick           numeric(7, 2),
  std_dev            numeric(7, 2),
  bye_week           integer,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint adp_player_rankings_scoring_format_check
    check (scoring_format in ('ppr', 'half_ppr', 'standard', 'custom')),
  constraint adp_player_rankings_league_size_check
    check (league_size between 2 and 20),
  constraint adp_player_rankings_position_check
    check (position in ('QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPERFLEX', 'UNKNOWN')),
  constraint adp_player_rankings_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_adp_player_rankings_provider_player
  on public.adp_player_rankings (source_id, provider_player_id)
  where provider_player_id is not null;

create index if not exists idx_adp_player_rankings_board
  on public.adp_player_rankings (season, scoring_format, league_size, adp_rank);

create index if not exists idx_adp_player_rankings_search
  on public.adp_player_rankings (season, scoring_format, league_size, position, player_name);


-- =================================================================
-- 2. PER-LEAGUE SCORING CONFIGURATION
-- -----------------------------------------------------------------
-- Backend writes these rows from platform adapters or a future manual
-- config route. Authenticated users may read their own config, but
-- writes stay backend-owned until validation contracts exist.
-- =================================================================

create table if not exists public.league_scoring_configs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  platform              text not null,
  league_id             text not null,
  league_name           text,
  season                integer not null,
  scoring_format        text not null default 'ppr',
  teams                 integer,
  source                text not null default 'platform',
  is_primary            boolean not null default false,
  default_scoring_rules jsonb not null default '{}'::jsonb,
  raw_platform_settings jsonb not null default '{}'::jsonb,
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint league_scoring_configs_platform_check
    check (platform in ('sleeper', 'yahoo', 'espn', 'manual', 'demo')),
  constraint league_scoring_configs_scoring_format_check
    check (scoring_format in ('ppr', 'half_ppr', 'standard', 'custom')),
  constraint league_scoring_configs_teams_check
    check (teams is null or teams between 2 and 20),
  constraint league_scoring_configs_source_check
    check (source in ('platform', 'manual', 'demo', 'imported')),
  constraint league_scoring_configs_default_rules_check
    check (jsonb_typeof(default_scoring_rules) = 'object'),
  constraint league_scoring_configs_raw_settings_check
    check (jsonb_typeof(raw_platform_settings) = 'object')
);

create unique index if not exists idx_league_scoring_configs_user_league
  on public.league_scoring_configs (user_id, platform, league_id, season);

create index if not exists idx_league_scoring_configs_user_primary
  on public.league_scoring_configs (user_id, season, is_primary);

create table if not exists public.league_scoring_rules (
  id                   uuid primary key default gen_random_uuid(),
  config_id            uuid not null references public.league_scoring_configs(id) on delete cascade,
  category             text not null,
  stat_key             text not null,
  points               numeric(9, 4) not null,
  per_unit             numeric(9, 4) not null default 1,
  applies_to_positions text[] not null default '{}'::text[],
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint league_scoring_rules_points_check
    check (points between -100 and 100),
  constraint league_scoring_rules_per_unit_check
    check (per_unit > 0),
  constraint league_scoring_rules_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_league_scoring_rules_config_stat
  on public.league_scoring_rules (config_id, stat_key);

create table if not exists public.league_roster_slots (
  id              uuid primary key default gen_random_uuid(),
  config_id       uuid not null references public.league_scoring_configs(id) on delete cascade,
  slot_key        text not null,
  slot_count      integer not null,
  is_starter      boolean not null default true,
  position_groups text[] not null default '{}'::text[],
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint league_roster_slots_count_check
    check (slot_count >= 0 and slot_count <= 30),
  constraint league_roster_slots_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_league_roster_slots_config_slot
  on public.league_roster_slots (config_id, slot_key);

create table if not exists public.league_scarcity_weights (
  id               uuid primary key default gen_random_uuid(),
  config_id        uuid not null references public.league_scoring_configs(id) on delete cascade,
  position         text not null,
  replacement_rank integer,
  scarcity_weight  numeric(7, 4) not null default 1,
  baseline_points  numeric(7, 2),
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint league_scarcity_weights_position_check
    check (position in ('QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'FLEX', 'SUPERFLEX')),
  constraint league_scarcity_weights_replacement_rank_check
    check (replacement_rank is null or replacement_rank > 0),
  constraint league_scarcity_weights_weight_check
    check (scarcity_weight >= 0 and scarcity_weight <= 10),
  constraint league_scarcity_weights_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_league_scarcity_weights_config_position
  on public.league_scarcity_weights (config_id, position);


-- =================================================================
-- 3. ROW LEVEL SECURITY
-- =================================================================

alter table public.adp_sources             enable row level security;
alter table public.adp_player_rankings     enable row level security;
alter table public.league_scoring_configs  enable row level security;
alter table public.league_scoring_rules    enable row level security;
alter table public.league_roster_slots     enable row level security;
alter table public.league_scarcity_weights enable row level security;

-- ADP tables are backend-owned for Phase 1. Public Draft Assistant
-- routes should read through the API, not through direct browser SQL.
revoke all on table public.adp_sources from anon, authenticated;
revoke all on table public.adp_player_rankings from anon, authenticated;
grant select, insert, update, delete on table public.adp_sources to service_role;
grant select, insert, update, delete on table public.adp_player_rankings to service_role;

-- League scoring config is user-readable and backend-writable.
drop policy if exists league_scoring_configs_self_select on public.league_scoring_configs;
create policy league_scoring_configs_self_select
  on public.league_scoring_configs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists league_scoring_rules_self_select on public.league_scoring_rules;
create policy league_scoring_rules_self_select
  on public.league_scoring_rules
  for select to authenticated
  using (
    exists (
      select 1
      from public.league_scoring_configs cfg
      where cfg.id = league_scoring_rules.config_id
        and cfg.user_id = (select auth.uid())
    )
  );

drop policy if exists league_roster_slots_self_select on public.league_roster_slots;
create policy league_roster_slots_self_select
  on public.league_roster_slots
  for select to authenticated
  using (
    exists (
      select 1
      from public.league_scoring_configs cfg
      where cfg.id = league_roster_slots.config_id
        and cfg.user_id = (select auth.uid())
    )
  );

drop policy if exists league_scarcity_weights_self_select on public.league_scarcity_weights;
create policy league_scarcity_weights_self_select
  on public.league_scarcity_weights
  for select to authenticated
  using (
    exists (
      select 1
      from public.league_scoring_configs cfg
      where cfg.id = league_scarcity_weights.config_id
        and cfg.user_id = (select auth.uid())
    )
  );

revoke all on table public.league_scoring_configs from anon, authenticated;
revoke all on table public.league_scoring_rules from anon, authenticated;
revoke all on table public.league_roster_slots from anon, authenticated;
revoke all on table public.league_scarcity_weights from anon, authenticated;

grant select on table public.league_scoring_configs to authenticated;
grant select on table public.league_scoring_rules to authenticated;
grant select on table public.league_roster_slots to authenticated;
grant select on table public.league_scarcity_weights to authenticated;

grant select, insert, update, delete on table public.league_scoring_configs to service_role;
grant select, insert, update, delete on table public.league_scoring_rules to service_role;
grant select, insert, update, delete on table public.league_roster_slots to service_role;
grant select, insert, update, delete on table public.league_scarcity_weights to service_role;


-- =================================================================
-- DONE.
-- Review gates before application:
-- - Justin approval.
-- - Supabase SQL editor or migration apply only after approval.
-- - Verify RLS policies and explicit grants in Supabase.
-- - Backfill/ingest task for ADP snapshots remains separate.
-- =================================================================
