begin;

-- The player index (football.football_player_ids) takes provider ids from sources other than nflverse.
-- Each such row cites a player_index_runs receipt instead of an nflverse ingest event, so every id still
-- says exactly where it came from. First source: Sleeper's public player list, whose records carry the
-- player's GSIS id (and, for some, a Yahoo id); a Sleeper id is indexed only through that GSIS id.
--
-- Additive: nflverse-sourced rows keep citing warehouse_ingest_events; exactly one receipt per row.

create table football.player_index_runs (
  id           bigint generated always as identity primary key,
  source       text not null check (source in ('sleeper_players')),
  rights_basis text not null check (rights_basis = 'sleeper_public_api'),
  source_url   text not null check (source_url ~ '^https://'),
  source_ref   text not null check (source_ref ~ '^sha256:[0-9a-f]{64}$'),
  source_rows  integer not null check (source_rows >= 0),
  fetched_at   timestamptz not null,
  finished_at  timestamptz not null default clock_timestamp()
);

alter table football.football_player_ids
  add column index_run_id bigint references football.player_index_runs(id) on delete restrict,
  alter column ingest_event_id drop not null,
  add constraint football_player_ids_one_receipt check ((ingest_event_id is null) <> (index_run_id is null));

alter table football.football_player_ids drop constraint football_player_ids_match_method_check;
alter table football.football_player_ids add constraint football_player_ids_match_method_check
  check (match_method in ('source_crosswalk', 'manual_verified', 'provider_gsis'));

create index football_player_ids_index_run on football.football_player_ids (index_run_id) where index_run_id is not null;

comment on table football.player_index_runs is
  '[ledger] Receipt for each player-index load from a non-nflverse source (first: Sleeper player list, matched by GSIS id).';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('player_index_runs', 'ledger', 'one row per player-index load from a non-nflverse source',
   'Sleeper public player list', 'daily 07:15 ET, after the player ingest',
   'Receipt for provider ids indexed from outside nflverse, so every index row says where it came from.', array[]::text[]);

update football.warehouse_map
   set source = 'nflverse players (GSIS, ESPN) and the Sleeper player list (Sleeper, Yahoo, matched by GSIS)',
       gaps = array['A Yahoo id is indexed only where Sleeper lists it; players Sleeper does not map stay unindexed for Yahoo.']::text[]
 where name = 'football_player_ids';

revoke all on football.player_index_runs from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.player_index_runs to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert on football.player_index_runs to omen_warehouse_writer;
grant usage, select on sequence football.player_index_runs_id_seq to omen_warehouse_writer;

commit;
