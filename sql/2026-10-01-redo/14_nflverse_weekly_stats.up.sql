-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 14 — nflverse weekly player stats, one row per player-week (Gate 1 database redo).
--
-- The weekly job (spec: Blueprints/specs/football-data/omen-nflverse-weekly-stats-ingest-v1.md) pulls
-- nflverse's weekly player stats and snap counts, joins each row to the canonical `players.id` through the
-- step-04 crosswalk, and upserts by (player_id, season, week). A player the crosswalk cannot match is
-- skipped and logged, never guessed. Every row names the `data_events` ingest batch that last wrote it
-- (rights basis 'nflverse_open_data', source_ref = sha256 of the raw CSV), so each row is traceable.
--
-- Stats are public football facts: no personal data lives here. Raw stat lines only; Omen's reads and
-- scoring are computed from them elsewhere, so no scoring rules are stored. The stat columns are nullable
-- because nflverse leaves a column empty when it does not apply to the player or the week.
--
-- Requires steps 04 (players) and 06 (data_events).
-- Server-only: RLS on, no policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.nflverse_weekly_stats') is not null then
    raise exception 'step 14 preflight: nflverse_weekly_stats already exists';
  end if;
  if to_regclass('public.players') is null or to_regclass('public.data_events') is null then
    raise exception 'step 14 preflight: steps 04 and 06 (players, data_events) must be applied first';
  end if;
end $$;

create table public.nflverse_weekly_stats (
  player_id          text not null references public.players(id) on delete restrict,
  season             integer not null,
  week               integer not null,
  pass_yards         integer,
  pass_tds           integer,
  interceptions      integer,
  rush_yards         integer,
  rush_tds           integer,
  carries            integer,
  targets            integer,
  receptions         integer,
  rec_yards          integer,
  rec_tds            integer,
  snaps              integer,
  snap_share         numeric,
  fantasy_points_ppr numeric,
  ingest_event_id    bigint not null references public.data_events(id) on delete restrict,
  primary key (player_id, season, week)
);
create index nflverse_weekly_stats_ingest on public.nflverse_weekly_stats (ingest_event_id);

comment on table public.nflverse_weekly_stats is
  'nflverse weekly player stats and snap counts, one row per canonical player-week. Written weekly by the server (upsert by primary key); every row names the data_events ingest that wrote it. Server-only.';

alter table public.nflverse_weekly_stats enable row level security;
revoke all on table public.nflverse_weekly_stats from anon, authenticated;
grant all on table public.nflverse_weekly_stats to service_role;

commit;
