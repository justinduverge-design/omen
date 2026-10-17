begin;

-- A third way to index a provider player id: by full name and birth date. Sleeper lists neither a GSIS nor
-- an ESPN id for many established players (Nico Collins, Jaylen Waddle), yet it lists the full name and birth
-- date, as nflverse does. A name-and-birth-date pair is matched only when it is unique on both sides, and the
-- row is labeled provider_bio so it is never mistaken for an id-to-id match.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'football_player_ids_match_method_check'
              and pg_get_constraintdef(oid) like '%provider_bio%') then
    raise exception '0019 preflight: provider_bio is already allowed';
  end if;
end $$;

alter table football.football_player_ids drop constraint football_player_ids_match_method_check;
alter table football.football_player_ids add constraint football_player_ids_match_method_check
  check (match_method in ('source_crosswalk', 'manual_verified', 'provider_gsis', 'provider_bio'));

commit;
