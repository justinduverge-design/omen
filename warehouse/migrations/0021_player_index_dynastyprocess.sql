begin;

-- A second player-index source: the DynastyProcess player id crosswalk (github.com/dynastyprocess/data,
-- files/db_playerids.csv, GPL-3.0). It pairs GSIS ids with Yahoo and Sleeper ids for the established players
-- Sleeper's own list leaves without a Yahoo id. The founder accepted the GPL-3.0 rights risk on 2026-10-17;
-- every load says so in its receipt (rights_basis), so the decision stays visible and reversible.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'player_index_runs_source_check'
              and pg_get_constraintdef(oid) like '%dynastyprocess_playerids%') then
    raise exception '0021 preflight: dynastyprocess_playerids is already allowed';
  end if;
end $$;

alter table football.player_index_runs drop constraint player_index_runs_source_check;
alter table football.player_index_runs add constraint player_index_runs_source_check
  check (source in ('sleeper_players', 'dynastyprocess_playerids'));
alter table football.player_index_runs drop constraint player_index_runs_rights_basis_check;
alter table football.player_index_runs add constraint player_index_runs_rights_basis_check
  check ((source = 'sleeper_players' and rights_basis = 'sleeper_public_api')
      or (source = 'dynastyprocess_playerids' and rights_basis = 'gpl_3_0_founder_accepted'));

update football.warehouse_map
   set source = 'Sleeper public player list; DynastyProcess player id crosswalk (GPL-3.0, founder-accepted 2026-10-17)'
 where name = 'player_index_runs';

commit;
