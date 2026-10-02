-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8: authoring SQL and applying it are
-- distinct acts, and the required order is explicit founder approval -> staging
-- application -> verification -> production application. The 2026-08-26 A6 approval
-- implies no authority here.
--
-- Purpose: let one user follow MORE THAN ONE league per provider.
--
-- Today `platform_connections` is one row per (user_id, platform) carrying a single
-- `league_id`. That shape encodes an assumption the product no longer holds — that a
-- user plays in exactly one league per platform. A user with three ESPN leagues, one
-- Yahoo and one Sleeper can connect all three providers and still only ever bind one
-- league on each. The Command Center league carousel, the provider filter chips, and
-- the multiselect league picker all need a stored set, not a single id.
--
-- Deliberately NOT done by widening `platform_connections`: the credential columns
-- (`espn_secret_id`, `swid_secret_id`, `token_secret_id`, `platform_user_id`) are
-- per-ACCOUNT facts, and duplicating a row per league would duplicate the Vault
-- pointers along with them. One account, many leagues, is a join — so it gets a join
-- table. `platform_connections` keeps owning "is this provider connected, and with
-- what credentials"; this table owns "and which of its leagues does the user follow".
--
-- Relationship to `platform_connections.league_id`: that column stays, and stays
-- authoritative for the ACTIVE league within a provider. This table is additive. Until
-- it exists, `src/services/leagueFollows.js` reports `follows_persisted: false` and
-- every surface degrades to "follow everything the provider discovered", which is
-- honest and is what the app does today.
--
-- Additive and reversible. No existing table or row is modified.

begin;

create table if not exists public.league_follows (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  platform     text not null,
  league_id    text not null,
  -- The user's team inside THAT league. Per-league, not per-account, which is exactly
  -- why `platform_connections.espn_team_id` cannot serve more than one ESPN league.
  team_id      text,
  -- Labels captured at follow time so the carousel can render a league the provider is
  -- momentarily failing to describe. Display only; never used as an identity.
  league_name  text,
  team_name    text,
  season       integer,
  -- Null until the user reorders. Null sorts last, so an un-reordered set keeps the
  -- deterministic order the API already computes (provider league count desc, then
  -- alphabetical) rather than collapsing to insertion order.
  sort_order   integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One follow per (user, platform, league). Re-following is an upsert, not a duplicate.
create unique index if not exists league_follows_user_platform_league
  on public.league_follows (user_id, platform, league_id);

-- The carousel's read path is "every league this user follows, grouped by provider".
create index if not exists league_follows_user_platform
  on public.league_follows (user_id, platform);

comment on table public.league_follows is
  'Leagues a user has chosen to follow, one row per (user, platform, league). Additive to platform_connections, which keeps owning provider credentials and the active league within a provider. Absent table => every surface degrades to "follow everything discovered".';

comment on column public.league_follows.team_id is
  'The user''s team within this specific league. Per-league, unlike platform_connections.espn_team_id, which can only describe one.';

alter table public.league_follows enable row level security;

-- Read-own. Writes go through the API server on service_role, matching the
-- platform_connections posture: the server verifies with the provider that the league
-- genuinely belongs to the account before it writes a row.
drop policy if exists league_follows_self_select on public.league_follows;
create policy league_follows_self_select on public.league_follows
  for select using (auth.uid() = user_id);

revoke all on table public.league_follows from anon, authenticated;
grant select (
  id,
  user_id,
  platform,
  league_id,
  team_id,
  league_name,
  team_name,
  season,
  sort_order,
  created_at,
  updated_at
) on table public.league_follows to authenticated;

commit;

-- Rollback:
--   drop table if exists public.league_follows;
--
-- Backfill (run ONLY after the table is verified present; also reversible):
--   insert into public.league_follows (user_id, platform, league_id, team_id)
--   select user_id, platform, league_id, espn_team_id
--     from public.platform_connections
--    where is_active and league_id is not null and league_id <> platform
--   on conflict (user_id, platform, league_id) do nothing;
