-- Sight's rows for the latest season it has computed. Only run metadata and the graders' summaries leave.
-- Read by sight-status.js (collectEvidence) and by sight-status-run on KVM1 (psql's stdin).
begin transaction read only;
with season as (select max(season) as s from football.football_metric_runs where metric_name = 'omen_sight')
select coalesce(json_agg(json_build_object(
  'metric', r.metric_name, 'version', r.formula_version, 'season', r.season, 'week', r.week, 'state', r.state,
  'finished_at', r.finished_at, 'error_code', r.error_code,
  'positions', case when r.metric_name = 'omen_sight_accuracy' then r.parameters->'summary'->'positions' end
) order by r.metric_name, r.formula_version, r.week), '[]'::json)
from football.football_metric_runs r, season
where r.metric_name in ('omen_sight', 'omen_sight_accuracy') and r.season = season.s;
commit;
