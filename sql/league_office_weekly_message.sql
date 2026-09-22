-- League Office weekly message contract.
-- Replaces the legacy Move/Disaster-only award constraint with the locked group-chat categories.
alter table public.league_office_awards
  drop constraint if exists league_office_awards_award_name_check;

alter table public.league_office_awards
  add constraint league_office_awards_award_name_check
  check (award_name in ('Top Performer','Pickup of the Week','Drop of the Week'));

-- The league/week/category is the record-book identity. Reconnects may change which
-- Omen user supplies ESPN credentials, but must not create a second League Office record.
alter table public.league_office_awards
  drop constraint if exists league_office_awards_user_id_league_id_season_week_award_na_key;
create unique index if not exists league_office_awards_league_week_name_key
  on public.league_office_awards (league_id, season, week, award_name);

alter table public.league_office_lines
  drop constraint if exists league_office_lines_user_id_league_id_season_week_game_id_key;
create unique index if not exists league_office_lines_league_week_game_key
  on public.league_office_lines (league_id, season, week, game_id);
