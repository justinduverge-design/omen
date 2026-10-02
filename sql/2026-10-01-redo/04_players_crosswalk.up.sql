-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 04 — one player identity for all of Omen, and the crosswalk from every provider's id to it.
-- Tables are created empty. The D3 job fills them (Sleeper's public player dump + nflverse `players`,
-- matched on normalized name + birth date, falling back to name + position). A player it cannot match
-- with certainty goes to player_identity_unresolved with the reason. It is never guessed.
--
-- Why a crosswalk at all: nflverse has no Sleeper or Yahoo id, and only 34% of fantasy-relevant
-- players are reachable through Sleeper's own gsis/espn ids (slice plan, "Double-check results").
-- Without it, a roster cannot be joined to any football data, projection snapshot or Ledger player.
--
-- The canonical id is text `omen:player:<slug>`, assigned once by the crosswalk job and never derived
-- at read time (two real players share the name Josh Allen). Reference data: no user data lives here.
-- Server-only: RLS on, no policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.players') is not null then
    raise exception 'step 04 preflight: players already exists';
  end if;
end $$;

create table public.players (
  id           text primary key check (id ~ '^omen:player:[a-z0-9][a-z0-9._-]*$'),
  full_name    text not null,
  position     text not null,   -- primary playing position as published (QB, RB, WR, TE, K, DEF, and IDP positions)
  nfl_team     text,            -- null for free agents
  birth_date   date,
  gsis_id      text unique,     -- NFL game-stats id, nflverse's key
  status       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index players_position_team on public.players (position, nfl_team);

create table public.player_provider_ids (
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo', 'nflverse')),
  provider_player_id text not null check (provider_player_id <> ''),
  player_id          text not null references public.players(id) on delete restrict,
  match_method       text not null check (match_method in ('provider_supplied', 'name_birth_date', 'name_position', 'manual')),
  matched_at         timestamptz not null default now(),
  verified_at        timestamptz,
  primary key (provider, provider_player_id),
  constraint player_provider_ids_one_per_provider unique (player_id, provider)
);
create index player_provider_ids_player on public.player_provider_ids (player_id);

create table public.player_identity_unresolved (
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo', 'nflverse')),
  provider_player_id text not null,
  full_name          text not null,
  position           text,
  nfl_team           text,
  birth_date         date,
  reason             text not null check (reason in ('no_match', 'ambiguous', 'conflict')),
  candidates         jsonb not null default '[]' check (jsonb_typeof(candidates) = 'array'),
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  resolved_at        timestamptz,
  primary key (provider, provider_player_id)
);

alter table public.players enable row level security;
alter table public.player_provider_ids enable row level security;
alter table public.player_identity_unresolved enable row level security;
revoke all on table public.players, public.player_provider_ids, public.player_identity_unresolved from anon, authenticated;
grant all on table public.players, public.player_provider_ids, public.player_identity_unresolved to service_role;

commit;
