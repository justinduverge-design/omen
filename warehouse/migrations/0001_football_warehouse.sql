begin;

-- This database contains rebuildable public football facts only. Login roles and
-- their passwords are provisioned on the host; migrations only define NOLOGIN
-- capability roles.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'omen_warehouse_reader') then
    create role omen_warehouse_reader nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'omen_warehouse_writer') then
    create role omen_warehouse_writer nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'omen_warehouse_backup') then
    create role omen_warehouse_backup nologin;
  end if;
end
$$;

create schema football;
revoke all on schema football from public;
grant usage on schema football to omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;

create table football.warehouse_schema_migrations (
  version       bigint primary key,
  name          text not null unique check (name ~ '^[0-9]{4}_[a-z0-9_]+$'),
  checksum      text not null check (checksum ~ '^[0-9a-f]{64}$'),
  applied_at    timestamptz not null default clock_timestamp()
);

create table football.warehouse_ingest_events (
  id              bigint generated always as identity primary key,
  run_id          text not null check (run_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  dataset         text not null check (dataset in (
                    'teams', 'players', 'player_ids', 'schedules', 'weekly_rosters',
                    'player_weekly_stats', 'team_weekly_stats', 'play_by_play'
                  )),
  season          integer check (season between 1999 and 2100),
  rights_basis    text not null check (rights_basis = 'nflverse_open_data'),
  source_url      text not null check (source_url ~ '^https://'),
  source_ref      text not null check (source_ref ~ '^sha256:[0-9a-f]{64}$'),
  source_bytes    bigint not null check (source_bytes >= 0),
  source_rows     bigint check (source_rows >= 0),
  source_from     timestamptz,
  source_through  timestamptz,
  state           text not null check (state in ('started', 'succeeded', 'failed')),
  started_at      timestamptz not null default clock_timestamp(),
  finished_at     timestamptz,
  error_code      text,
  error_summary   text check (error_summary is null or length(error_summary) <= 500),
  metadata        jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (run_id, dataset, season),
  check (source_through is null or source_from is null or source_through >= source_from),
  check (
    (state = 'started' and finished_at is null and source_rows is null and error_code is null and error_summary is null)
    or (state = 'succeeded' and finished_at is not null and source_rows is not null and error_code is null and error_summary is null)
    or (state = 'failed' and finished_at is not null and error_code is not null)
  )
);
create index warehouse_ingest_events_dataset_season_finished
  on football.warehouse_ingest_events (dataset, season, finished_at desc)
  where state = 'succeeded';
create index warehouse_ingest_events_source_ref
  on football.warehouse_ingest_events (source_ref);

create table football.football_teams (
  team_id          text primary key check (team_id ~ '^omen:team:[a-z0-9]+$'),
  nflverse_abbr    text not null unique check (nflverse_abbr ~ '^[A-Z0-9]{2,3}$'),
  display_name     text not null,
  first_season     integer check (first_season between 1999 and 2100),
  last_season      integer check (last_season between 1999 and 2100),
  ingest_event_id  bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  check (last_season is null or first_season is null or last_season >= first_season)
);

create table football.football_players (
  player_id          text primary key check (player_id ~ '^omen:player:[a-z0-9:_-]+$'),
  gsis_id            text unique,
  display_name       text not null,
  first_name         text,
  last_name          text,
  football_position text,
  birth_date         date,
  ingest_event_id    bigint not null references football.warehouse_ingest_events(id) on delete restrict
);

create table football.football_player_ids (
  provider         text not null check (provider in ('gsis', 'espn', 'yahoo', 'sleeper', 'pfr', 'nfl')),
  provider_id      text not null check (length(provider_id) between 1 and 128),
  player_id        text not null references football.football_players(player_id) on delete restrict,
  match_method     text not null check (match_method in ('source_crosswalk', 'manual_verified')),
  ingest_event_id  bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (provider, provider_id),
  unique (player_id, provider)
);
create index football_player_ids_player on football.football_player_ids (player_id);

create table football.nfl_games (
  season            integer not null check (season between 1999 and 2100),
  game_id           text not null check (length(game_id) between 1 and 64),
  week              integer not null check (week between 1 and 23),
  game_type         text not null check (game_type in ('REG', 'WC', 'DIV', 'CON', 'SB')),
  kickoff_at        timestamptz,
  away_team_id      text not null references football.football_teams(team_id) on delete restrict,
  home_team_id      text not null references football.football_teams(team_id) on delete restrict,
  away_score        smallint check (away_score >= 0),
  home_score        smallint check (home_score >= 0),
  overtime          boolean,
  stadium           text,
  location          text,
  roof              text,
  surface           text,
  temperature_f     smallint,
  wind_mph          smallint check (wind_mph is null or wind_mph >= 0),
  away_rest_days    smallint check (away_rest_days is null or away_rest_days >= 0),
  home_rest_days    smallint check (home_rest_days is null or home_rest_days >= 0),
  division_game     boolean,
  spread_line       numeric(6,2),
  total_line        numeric(6,2),
  away_moneyline    integer,
  home_moneyline    integer,
  away_coach        text,
  home_coach        text,
  source_row        jsonb not null default '{}'::jsonb check (jsonb_typeof(source_row) = 'object'),
  ingest_event_id   bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, game_id),
  check (away_team_id <> home_team_id),
  check ((away_score is null) = (home_score is null))
);
create index nfl_games_week on football.nfl_games (season, week, game_type);
create index nfl_games_away_week on football.nfl_games (away_team_id, season, week);
create index nfl_games_home_week on football.nfl_games (home_team_id, season, week);
create index nfl_games_ingest on football.nfl_games (ingest_event_id);

create table football.nfl_weekly_rosters (
  season            integer not null check (season between 1999 and 2100),
  week              integer not null check (week between 1 and 23),
  team_id           text not null references football.football_teams(team_id) on delete restrict,
  player_id         text not null references football.football_players(player_id) on delete restrict,
  game_type         text,
  football_position text,
  depth_position    text,
  jersey_number     smallint check (jersey_number between 0 and 99),
  roster_status     text,
  status_detail     text,
  source_row        jsonb not null default '{}'::jsonb check (jsonb_typeof(source_row) = 'object'),
  ingest_event_id   bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, week, team_id, player_id)
);
create index nfl_weekly_rosters_player_week
  on football.nfl_weekly_rosters (player_id, season, week);
create index nfl_weekly_rosters_ingest on football.nfl_weekly_rosters (ingest_event_id);

create table football.nfl_player_weekly_stats (
  season              integer not null check (season between 1999 and 2100),
  week                integer not null check (week between 1 and 23),
  season_type         text not null check (season_type in ('REG', 'POST')),
  player_id           text not null references football.football_players(player_id) on delete restrict,
  team_id             text references football.football_teams(team_id) on delete restrict,
  opponent_team_id    text references football.football_teams(team_id) on delete restrict,
  game_id             text,
  football_position   text,
  fantasy_points_ppr  numeric,
  passing_yards       numeric,
  rushing_yards       numeric,
  receiving_yards     numeric,
  targets             numeric,
  receptions          numeric,
  stats               jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  opportunity         jsonb not null default '{}'::jsonb check (jsonb_typeof(opportunity) = 'object'),
  ingest_event_id     bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, week, season_type, player_id)
);
create index nfl_player_weekly_stats_team_week
  on football.nfl_player_weekly_stats (team_id, season, week);
create index nfl_player_weekly_stats_game on football.nfl_player_weekly_stats (season, game_id);
create index nfl_player_weekly_stats_ingest on football.nfl_player_weekly_stats (ingest_event_id);

create table football.nfl_team_weekly_stats (
  season            integer not null check (season between 1999 and 2100),
  week              integer not null check (week between 1 and 23),
  season_type       text not null check (season_type in ('REG', 'POST')),
  team_id           text not null references football.football_teams(team_id) on delete restrict,
  opponent_team_id  text references football.football_teams(team_id) on delete restrict,
  game_id           text,
  points_for        smallint check (points_for is null or points_for >= 0),
  points_against    smallint check (points_against is null or points_against >= 0),
  stats             jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  ingest_event_id   bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, week, season_type, team_id)
);
create index nfl_team_weekly_stats_game on football.nfl_team_weekly_stats (season, game_id);
create index nfl_team_weekly_stats_ingest on football.nfl_team_weekly_stats (ingest_event_id);

create table football.nfl_plays (
  season                   integer not null check (season between 1999 and 2100),
  game_id                  text not null,
  play_id                  bigint not null check (play_id >= 0),
  week                     integer check (week between 1 and 23),
  posteam_id               text references football.football_teams(team_id) on delete restrict,
  defteam_id               text references football.football_teams(team_id) on delete restrict,
  passer_player_id         text references football.football_players(player_id) on delete restrict,
  rusher_player_id         text references football.football_players(player_id) on delete restrict,
  receiver_player_id       text references football.football_players(player_id) on delete restrict,
  play_type                text,
  desc_text                text,
  epa                      double precision,
  wpa                      double precision,
  cpoe                     double precision,
  air_epa                  double precision,
  yac_epa                  double precision,
  success                  boolean,
  source_row               jsonb not null check (jsonb_typeof(source_row) = 'object'),
  ingest_event_id          bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, game_id, play_id),
  foreign key (season, game_id) references football.nfl_games(season, game_id) on delete restrict,
  check (posteam_id is null or defteam_id is null or posteam_id <> defteam_id)
) partition by range (season);

do $$
declare
  partition_season integer;
begin
  for partition_season in 1999..2027 loop
    execute format(
      'create table football.nfl_plays_%s partition of football.nfl_plays for values from (%s) to (%s)',
      partition_season, partition_season, partition_season + 1
    );
  end loop;
end
$$;

create index nfl_plays_game on football.nfl_plays (season, game_id, play_id);
create index nfl_plays_week_team on football.nfl_plays (season, week, posteam_id);
create index nfl_plays_passer on football.nfl_plays (passer_player_id, season, week)
  where passer_player_id is not null;
create index nfl_plays_rusher on football.nfl_plays (rusher_player_id, season, week)
  where rusher_player_id is not null;
create index nfl_plays_receiver on football.nfl_plays (receiver_player_id, season, week)
  where receiver_player_id is not null;
create index nfl_plays_epa on football.nfl_plays (season, epa) where epa is not null;
create index nfl_plays_ingest on football.nfl_plays (ingest_event_id);

create table football.nfl_player_weekly_opportunity (
  season             integer not null check (season between 1999 and 2100),
  week               integer not null check (week between 1 and 23),
  season_type        text not null check (season_type in ('REG', 'POST')),
  player_id          text not null references football.football_players(player_id) on delete restrict,
  team_id            text references football.football_teams(team_id) on delete restrict,
  snaps              integer check (snaps is null or snaps >= 0),
  routes             integer check (routes is null or routes >= 0),
  carries            integer check (carries is null or carries >= 0),
  targets            integer check (targets is null or targets >= 0),
  red_zone_carries   integer check (red_zone_carries is null or red_zone_carries >= 0),
  red_zone_targets   integer check (red_zone_targets is null or red_zone_targets >= 0),
  inside_10_touches  integer check (inside_10_touches is null or inside_10_touches >= 0),
  inside_5_touches   integer check (inside_5_touches is null or inside_5_touches >= 0),
  end_zone_targets   integer check (end_zone_targets is null or end_zone_targets >= 0),
  deep_targets       integer check (deep_targets is null or deep_targets >= 0),
  details            jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  ingest_event_id    bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (season, week, season_type, player_id)
);
create index nfl_player_weekly_opportunity_team_week
  on football.nfl_player_weekly_opportunity (team_id, season, week);
create index nfl_player_weekly_opportunity_ingest
  on football.nfl_player_weekly_opportunity (ingest_event_id);

create table football.football_metric_runs (
  id                bigint generated always as identity primary key,
  metric_name       text not null check (metric_name ~ '^omen_[a-z0-9_]+$'),
  formula_version   text not null check (formula_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  season            integer not null check (season between 1999 and 2100),
  week              integer check (week between 1 and 23),
  state             text not null check (state in ('running', 'succeeded', 'failed')),
  started_at        timestamptz not null default clock_timestamp(),
  finished_at       timestamptz,
  parameters        jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  error_code        text,
  error_summary     text check (error_summary is null or length(error_summary) <= 500),
  unique (metric_name, formula_version, season, week),
  check (
    (state = 'running' and finished_at is null and error_code is null and error_summary is null)
    or (state = 'succeeded' and finished_at is not null and error_code is null and error_summary is null)
    or (state = 'failed' and finished_at is not null and error_code is not null)
  )
);

create table football.football_metric_run_inputs (
  metric_run_id   bigint not null references football.football_metric_runs(id) on delete cascade,
  ingest_event_id bigint not null references football.warehouse_ingest_events(id) on delete restrict,
  primary key (metric_run_id, ingest_event_id)
);

create table football.football_metric_values (
  metric_run_id  bigint not null references football.football_metric_runs(id) on delete cascade,
  entity_type    text not null check (entity_type in ('player', 'team', 'game', 'play')),
  entity_id      text not null check (length(entity_id) between 1 and 160),
  value          double precision not null check (value > '-Infinity'::float8 and value < 'Infinity'::float8),
  components     jsonb not null default '{}'::jsonb check (jsonb_typeof(components) = 'object'),
  primary key (metric_run_id, entity_type, entity_id)
);
create index football_metric_values_entity
  on football.football_metric_values (entity_type, entity_id, metric_run_id);

revoke all on all tables in schema football from public;
revoke all on all sequences in schema football from public;

grant select on all tables in schema football to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert, update, delete on all tables in schema football to omen_warehouse_writer;
grant usage, select on all sequences in schema football to omen_warehouse_writer;

alter default privileges in schema football revoke all on tables from public;
alter default privileges in schema football revoke all on sequences from public;
alter default privileges in schema football grant select on tables to omen_warehouse_reader, omen_warehouse_backup;
alter default privileges in schema football grant select, insert, update, delete on tables to omen_warehouse_writer;
alter default privileges in schema football grant usage, select on sequences to omen_warehouse_writer;

commit;
