-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 06 — provider projections as they were when Omen read them, and the shadow log.
--
--   projection_snapshots   one row per provider projection read: the points the provider gave and the
--                          raw projected STAT LINE. The stat line is what the projection explainer's
--                          "where the points come from" block needs (approved design, D5 layer 1): the
--                          server applies the league's scoring to each line in memory and shows points by
--                          source summing to the provider's number. League scoring rules are NOT stored
--                          (A6 rights question open); only the provider's own projection is.
--   projection_shadow_log  per player-week: the provider's projection beside Omen's read (null until an
--                          engine exists), so "does Omen beat the provider" is answered by a forward
--                          record with proven as-of timing. The first-factor experiment found no context
--                          family that beats the projection; the shadow log is the only place a future
--                          claim can be proven, so it starts with the provider number alone.
--
-- Both insert-only. Neither holds user data; an ESPN or Yahoo projection read through a person's
-- connection is scoped to the LEAGUE (scope = 'league'), never to the person.
--
-- Rights, recorded and not resolved here: Sleeper's projections endpoint is public but undocumented;
-- ESPN and Yahoo projections come through the user's own connection. The slice starts on Sleeper only.
-- Retaining ESPN/Yahoo league-scoped projections needs the same founder call as A6 before the server
-- writes them; the table allows it so the decision is a server flag, not a migration.
--
-- Server-only: RLS on, no policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.projection_snapshots') is not null then
    raise exception 'step 06 preflight: projection_snapshots already exists';
  end if;
end $$;

create table public.projection_snapshots (
  id                 bigint generated always as identity primary key,
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_player_id text not null check (provider_player_id <> ''),
  player_id          text references public.players(id) on delete restrict,  -- null until the crosswalk resolves it
  season             integer not null check (season between 2000 and 2100),
  week               integer not null check (week between 1 and 22),
  scope              text not null check (scope in ('public', 'league')),
  league_id          uuid references public.leagues(id) on delete restrict,
  provider_points    jsonb not null check (jsonb_typeof(provider_points) = 'object'),   -- e.g. {"ppr": 23.12, "half_ppr": 21.3, "std": 19.5} or {"league": 22.8}
  stat_line          jsonb not null check (jsonb_typeof(stat_line) = 'object'),         -- raw projected stats as the provider sent them
  opponent           text,
  fetched_at         timestamptz not null,
  source_ref         text not null check (source_ref ~ '^sha256:[0-9a-f]{64}$'),       -- hash of the raw provider payload
  created_at         timestamptz not null default now(),
  constraint projection_snapshots_scope_league check ((scope = 'league') = (league_id is not null))
);
create unique index projection_snapshots_identity on public.projection_snapshots
  (provider, provider_player_id, season, week, scope, coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid), fetched_at);
create index projection_snapshots_player_week on public.projection_snapshots (player_id, season, week);

create table public.projection_shadow_log (
  id                     bigint generated always as identity primary key,
  provider               text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_player_id     text not null,
  player_id              text references public.players(id) on delete restrict,
  season                 integer not null check (season between 2000 and 2100),
  week                   integer not null check (week between 1 and 22),
  projection_snapshot_id bigint not null references public.projection_snapshots(id) on delete restrict,
  provider_projection    numeric not null,
  points_basis           text not null,             -- which key of provider_points this is: ppr, half_ppr, std, league
  omen_expected          numeric,                    -- null until an engine produces a read
  omen_range_lo          numeric,
  omen_range_hi          numeric,
  engine_version         text not null,              -- 'provider-only' before any engine exists
  logged_at              timestamptz not null default now(),
  constraint projection_shadow_log_one_per_engine unique (provider, provider_player_id, season, week, points_basis, engine_version),
  constraint projection_shadow_log_range check (omen_range_lo is null or omen_range_hi is null or omen_range_lo <= omen_range_hi)
);

create function public.projections_append_only() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception '% is append-only: % refused', tg_table_name, tg_op using errcode = '42501';
end $$;
create trigger projection_snapshots_append_only before update or delete on public.projection_snapshots
  for each row execute function public.projections_append_only();
create trigger projection_shadow_log_append_only before update or delete on public.projection_shadow_log
  for each row execute function public.projections_append_only();

alter table public.projection_snapshots enable row level security;
alter table public.projection_shadow_log enable row level security;
revoke all on table public.projection_snapshots, public.projection_shadow_log from anon, authenticated;
grant all on table public.projection_snapshots, public.projection_shadow_log to service_role;
revoke all on sequence public.projection_snapshots_id_seq, public.projection_shadow_log_id_seq from anon, authenticated;
revoke all on function public.projections_append_only() from public, anon, authenticated;
grant execute on function public.projections_append_only() to service_role;

commit;
