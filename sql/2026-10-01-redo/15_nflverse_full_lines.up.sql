-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 15 — the full nflverse football record (Gate 1 database redo). Founder direction 2026-10-04:
-- "finish the nflverse ingestion; make Omen a football brain".
--
-- Step 14 stored 14 of the ~190 columns nflverse publishes per player-week. Grading every league's own
-- scoring (kickers by distance, team defenses, returns, two-point plays, fumbles) and explaining usage
-- (air yards, EPA, target and air-yards share, red-zone work) needs the rest. This step:
--
--   1. nflverse_weekly_stats gains the game it was (team, opponent, game_id, season_type, position), the
--      full numeric stat line as `stats` and play-by-play opportunity as `opportunity` (jsonb, sparse:
--      a key that is absent is 0 or not recorded; empty is never written as 0 in the typed columns).
--   2. nflverse_team_weekly_stats: one row per team-game, the team's full stat line plus the final score
--      (points allowed is what most leagues score a team defense on).
--   3. nflverse_weekly_rosters: who was on which team each week, with roster status and listed position.
--   4. nflverse_games: every game, played or scheduled: kickoff, final score, spread and total (the
--      market's implied points per team), roof, surface, weather, rest days. From nflverse schedules.
--
-- Rights: nflverse release families admitted on 2026-08-24 (Direction/reviews/2026-08-24-a7-source-rights-
-- research.md): stats_player, stats_team, pbp, schedules, rosters. CC BY 4.0, attribution "nflverse".
-- Not stored, and never to be added without a new rights decision: Next Gen Stats (NFL), PFR advanced
-- stats (Sports Reference), ESPN QBR and depth charts (ESPN), contracts (OverTheCap).
--
-- Public football facts only: no personal data. Written by the server (service_role) only.
-- Requires steps 04 (players), 06 (data_events) and 14 (nflverse_weekly_stats).

begin;

do $$
begin
  if to_regclass('public.nflverse_weekly_stats') is null then
    raise exception 'step 15 preflight: step 14 (nflverse_weekly_stats) must be applied first';
  end if;
  if to_regclass('public.nflverse_team_weekly_stats') is not null or to_regclass('public.nflverse_weekly_rosters') is not null
     or to_regclass('public.nflverse_games') is not null then
    raise exception 'step 15 preflight: a step 15 table already exists';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'nflverse_weekly_stats' and column_name = 'stats') then
    raise exception 'step 15 preflight: nflverse_weekly_stats already has the step 15 columns';
  end if;
end $$;

alter table public.nflverse_weekly_stats
  add column team         text check (team is null or team ~ '^omen:team:[a-z0-9]+$'),
  add column opponent     text check (opponent is null or opponent ~ '^omen:team:[a-z0-9]+$'),
  add column game_id      text,
  add column season_type  text check (season_type is null or season_type in ('REG', 'POST')),
  add column position     text,
  add column stats        jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  add column opportunity  jsonb not null default '{}' check (jsonb_typeof(opportunity) = 'object');

comment on column public.nflverse_weekly_stats.stats is
  'Every numeric column of nflverse stats_player_week for this player-week, by its nflverse name. Sparse: an absent key is 0 or not recorded.';
comment on column public.nflverse_weekly_stats.opportunity is
  'Usage derived from nflverse play-by-play: red-zone, inside-10 and inside-5 targets and carries, end-zone and deep targets. Sparse.';

create index nflverse_weekly_stats_team_week on public.nflverse_weekly_stats (team, season, week);

create table public.nflverse_team_weekly_stats (
  team_id          text not null check (team_id ~ '^omen:team:[a-z0-9]+$'),
  season           integer not null check (season between 1999 and 2100),
  week             integer not null check (week between 1 and 23),
  season_type      text not null check (season_type in ('REG', 'POST')),
  game_id          text,
  opponent_team_id text check (opponent_team_id is null or opponent_team_id ~ '^omen:team:[a-z0-9]+$'),
  points_for       integer,
  points_against   integer,
  stats            jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  ingest_event_id  bigint not null references public.data_events(id) on delete restrict,
  primary key (team_id, season, week)
);
create index nflverse_team_weekly_stats_ingest on public.nflverse_team_weekly_stats (ingest_event_id);
comment on table public.nflverse_team_weekly_stats is
  'nflverse stats_team_week, one row per team-game: the full team stat line (sparse jsonb) and the final score from nflverse schedules. Server-only.';

create table public.nflverse_weekly_rosters (
  player_id             text not null references public.players(id) on delete restrict,
  season                integer not null check (season between 1999 and 2100),
  week                  integer not null check (week between 1 and 23),
  team_id               text not null check (team_id ~ '^omen:team:[a-z0-9]+$'),
  game_type             text,
  position              text,
  depth_chart_position  text,
  jersey_number         integer,
  status                text,
  status_detail         text,
  ingest_event_id       bigint not null references public.data_events(id) on delete restrict,
  primary key (player_id, season, week, team_id)
);
create index nflverse_weekly_rosters_team_week on public.nflverse_weekly_rosters (team_id, season, week);
create index nflverse_weekly_rosters_ingest on public.nflverse_weekly_rosters (ingest_event_id);
comment on table public.nflverse_weekly_rosters is
  'nflverse weekly rosters: each player on each team each week, with roster status (ACT, RES, INA, ...) and listed position. Server-only.';

create table public.nflverse_games (
  game_id          text primary key check (length(game_id) between 1 and 64),
  season           integer not null check (season between 1999 and 2100),
  week             integer not null check (week between 1 and 23),
  game_type        text not null check (game_type in ('REG', 'WC', 'DIV', 'CON', 'SB')),
  gameday          date,
  gametime         text,
  away_team_id     text not null check (away_team_id ~ '^omen:team:[a-z0-9]+$'),
  home_team_id     text not null check (home_team_id ~ '^omen:team:[a-z0-9]+$'),
  away_score       integer,
  home_score       integer,
  overtime         boolean,
  location         text,
  roof             text,
  surface          text,
  temp             integer,
  wind             integer,
  away_rest        integer,
  home_rest        integer,
  div_game         boolean,
  spread_line      numeric,
  total_line       numeric,
  away_moneyline   integer,
  home_moneyline   integer,
  away_coach       text,
  home_coach       text,
  stadium          text,
  ingest_event_id  bigint not null references public.data_events(id) on delete restrict
);
create index nflverse_games_season_week on public.nflverse_games (season, week);
create index nflverse_games_ingest on public.nflverse_games (ingest_event_id);
comment on table public.nflverse_games is
  'nflverse schedules: every game, played or scheduled, with score, spread and total lines (spread_line is the home margin the market expects), roof, surface, weather and rest. Server-only.';

alter table public.nflverse_team_weekly_stats enable row level security;
alter table public.nflverse_weekly_rosters enable row level security;
alter table public.nflverse_games enable row level security;
revoke all on table public.nflverse_team_weekly_stats, public.nflverse_weekly_rosters, public.nflverse_games from anon, authenticated;
grant all on table public.nflverse_team_weekly_stats, public.nflverse_weekly_rosters, public.nflverse_games to service_role;

commit;
