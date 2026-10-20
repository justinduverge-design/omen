begin;

-- Weather forecasts for upcoming games (Open-Meteo, CC BY 4.0), so Sight's next-game read carries the same
-- wind and cold it was trained on (recorded game-day weather in nfl_games). Every fetch is kept, so the
-- forecast a read used can always be audited. Domes are stored as not applicable (no weather).

create table football.game_weather_forecasts (
  game_id        text not null check (game_id <> ''),
  season         integer not null check (season between 1999 and 2100),
  week           integer not null check (week between 1 and 23),
  kickoff_at     timestamptz not null,
  fetched_at     timestamptz not null,
  status         text not null check (status in ('read', 'not_applicable')),
  roof_type      text check (roof_type in ('outdoors', 'dome', 'retractable')),
  temperature_f  numeric check (temperature_f between -60 and 140),
  wind_mph       numeric check (wind_mph between 0 and 150),
  gust_mph       numeric check (gust_mph between 0 and 200),
  precip_in      numeric check (precip_in >= 0),
  precip_probability_pct integer check (precip_probability_pct between 0 and 100),
  source         text not null check (source = 'open-meteo'),
  primary key (game_id, fetched_at)
);
create index game_weather_forecasts_week on football.game_weather_forecasts (season, week, fetched_at desc);
comment on table football.game_weather_forecasts is
  '[facts] Forecast weather for upcoming games (Open-Meteo, CC BY 4.0), every fetch kept; Sight uses the latest per game.';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('game_weather_forecasts', 'facts', 'one row per (game, fetch)', 'Open-Meteo forecast API (CC BY 4.0), stadium coordinates from src/data/stadiums.json',
   'daily 07:15 ET, games kicking off in the next 10 days',
   'Forecast wind, cold and rain for upcoming games, so Sight reads the next game with the weather it was trained on.',
   array['Retractable roofs: open or closed is unknown in advance; stored as retractable with the outdoor forecast.']::text[]);

revoke all on football.game_weather_forecasts from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.game_weather_forecasts to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert on football.game_weather_forecasts to omen_warehouse_writer;

commit;
