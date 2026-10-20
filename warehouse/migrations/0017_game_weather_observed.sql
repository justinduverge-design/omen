begin;

-- Observed weather for played games (Open-Meteo historical archive, CC BY 4.0), 1999 onward: the rain nflverse
-- does not record, and a consistent temperature and wind for every game. Feeds Sight's weather and team-elements
-- layers. A dome or closed roof is stored as not applicable. One row per game; a re-read replaces nothing.

create table football.game_weather_observed (
  game_id       text primary key check (game_id <> ''),
  season        integer not null check (season between 1999 and 2100),
  week          integer not null check (week between 1 and 23),
  kickoff_at    timestamptz not null,
  status        text not null check (status in ('read', 'not_applicable')),
  roof_type     text check (roof_type in ('outdoors', 'dome', 'retractable', 'open', 'closed')),
  temperature_f numeric check (temperature_f between -60 and 140),
  wind_mph      numeric check (wind_mph between 0 and 150),
  gust_mph      numeric check (gust_mph between 0 and 200),
  precip_in     numeric check (precip_in >= 0),
  source        text not null check (source = 'open-meteo-archive'),
  fetched_at    timestamptz not null default clock_timestamp()
);
create index game_weather_observed_season on football.game_weather_observed (season, week);
comment on table football.game_weather_observed is
  '[facts] Observed weather for each played game (Open-Meteo archive, CC BY 4.0): temperature, wind, gusts and rain in the 3-hour game window.';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('game_weather_observed', 'facts', 'one row per played game', 'Open-Meteo historical archive (CC BY 4.0), venue coordinates from src/data/stadiums.json',
   'daily 07:15 ET (backfill 1999 onward, then new games)',
   'What the weather actually was for every game, including rain, for Sight''s weather and team-elements layers.',
   array['Retractable roofs use the game''s recorded roof state when nflverse has it; otherwise the outdoor reading.']::text[]);

revoke all on football.game_weather_observed from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.game_weather_observed to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert on football.game_weather_observed to omen_warehouse_writer;

commit;
