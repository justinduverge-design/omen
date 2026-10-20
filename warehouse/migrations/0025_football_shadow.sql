-- Phase 3 (Rust infrastructure plan): a shadow copy of nfl_plays written by the Polars reader
-- (infra/warehouse/polars/pbp_polars.py) and diffed against football.nfl_plays. Nothing reads it.
-- No foreign keys: the shadow can never block or lock the real tables, and dropping the schema is the rollback.
-- Not in snapshots: create-snapshot.sh dumps --schema=football only; the shadow is rebuilt from source.
begin;

create schema football_shadow;
comment on schema football_shadow is 'Shadow outputs for ingest engine comparisons. Never read by the app.';

create table football_shadow.nfl_plays (
  season              integer not null check (season between 1999 and 2100),
  game_id             text not null,
  play_id             bigint not null check (play_id >= 0),
  week                integer check (week between 1 and 23),
  posteam_id          text,
  defteam_id          text,
  passer_player_id    text,
  rusher_player_id    text,
  receiver_player_id  text,
  play_type           text,
  desc_text           text,
  epa                 double precision,
  wpa                 double precision,
  cpoe                double precision,
  air_epa             double precision,
  yac_epa             double precision,
  success             boolean,
  source_row          jsonb not null check (jsonb_typeof(source_row) = 'object'),
  engine              text not null check (engine in ('polars')),
  source_url          text not null,
  loaded_at           timestamptz not null default clock_timestamp(),
  primary key (season, game_id, play_id)
);

revoke all on schema football_shadow from public;
revoke all on football_shadow.nfl_plays from public;
alter default privileges in schema football_shadow revoke all on tables from public;
alter default privileges in schema football_shadow grant select on tables to omen_warehouse_reader, omen_warehouse_backup;
alter default privileges in schema football_shadow grant select, insert, delete on tables to omen_warehouse_writer;
grant usage on schema football_shadow to omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football_shadow.nfl_plays to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert, delete on football_shadow.nfl_plays to omen_warehouse_writer;

commit;
