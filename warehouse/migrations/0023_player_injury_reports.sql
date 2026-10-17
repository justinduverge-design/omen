begin;

-- Injury reports per player, from the Sleeper public player list the player index already downloads once a day
-- (Sleeper asks for at most one players call per day, so there is no extra request). Founder decision
-- 2026-10-17: use Sleeper's injury data. Status, body part and notes as Sleeper lists them; practice fields
-- are kept when Sleeper fills them. One current row per player, replaced on every successful index run.

create table football.player_injury_reports (
  player_id              text primary key references football.football_players(player_id) on delete cascade,
  status                 text not null check (status in ('Questionable', 'Doubtful', 'Out', 'IR', 'PUP', 'NA', 'Sus', 'COV', 'DNR')),
  body_part              text check (length(body_part) <= 80),
  notes                  text check (length(notes) <= 200),
  practice_participation text check (length(practice_participation) <= 40),
  practice_description   text check (length(practice_description) <= 200),
  source_updated_at      timestamptz,
  index_run_id           bigint not null references football.player_index_runs(id) on delete restrict
);
comment on table football.player_injury_reports is
  '[facts] Current injury report per player from Sleeper''s public player list (status, body part, notes, practice), refreshed with each player-index run.';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('player_injury_reports', 'facts', 'one current row per injured player',
   'Sleeper public player list (same daily download as the player index); founder-approved 2026-10-17',
   'daily 07:15 ET, with the player index',
   'Injury status and body part for every player, so Start/Sit can weigh an injury the league''s provider did not report.',
   array['Once a day: a Sunday-morning inactive is not seen until the next run.', 'Sleeper''s practice fields are often empty.']::text[]);

revoke all on football.player_injury_reports from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.player_injury_reports to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert, update, delete on football.player_injury_reports to omen_warehouse_writer;

commit;
