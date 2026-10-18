with top as (
  select o.player_id from football.nfl_player_weekly_opportunity o join football.football_players p using(player_id)
  where o.season=2026 and o.season_type='REG' and p.football_position in ('RB','WR','TE')
  group by o.player_id order by sum(coalesce(o.targets,0)+coalesce(o.carries,0)) desc limit 40)
select json_agg(x) from (
  select p.display_name as name, p.football_position as position, max(o.team_id) as team,
    json_agg(json_build_object('week',o.week,'snap_share',round(o.snap_share::numeric,2),'carries',o.carries,'targets',o.targets,'red_zone_touches',coalesce(o.red_zone_carries,0)+coalesce(o.red_zone_targets,0),'inside_10_touches',o.inside_10_touches) order by o.week) as weeks
  from top t join football.football_players p using(player_id) join football.nfl_player_weekly_opportunity o using(player_id)
  where o.season=2026 and o.season_type='REG' group by t.player_id, p.display_name, p.football_position) x;
