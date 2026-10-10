"use strict";

const { setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");

// Only play_type pass/run count: nflverse labels kneels and spikes as separate play_type values, while
// fatedPoints.js excludes them by flag, so the two agree except for the rare flagged run/pass.
// football.nfl_player_weekly_opportunity is derived inside the warehouse from football.nfl_plays.source_row.
// The rules are the ones in src/services/nflverseFacts.js buildOpportunity (pass with a receiver, run with a
// rusher; two-point tries and plays without a yardline are skipped; red zone <=20, inside-10 <=10, goal-line
// carries <=5, end-zone targets air>=yardline, deep targets air>=20). snaps, snap_share and routes stay NULL.
const DATASET = "player_weekly_opportunity";
const DEFAULT_MAX_OUTLIER_RATIO = 0.01;
const TOLERANCE = 1;
const NUMBER = "'^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'";

class PlayerWeeklyOpportunityError extends Error {
  constructor(code, message, report) { super(message); this.name = "PlayerWeeklyOpportunityError"; this.code = code; if (report) this.report = report; }
}

// Counts per player-week, built from the season's plays. A numeric column that is blank, NA or garbled is NULL.
const DERIVE_SQL = `
WITH plays AS (
  SELECT p.week, p.source_row->>'season_type' AS season_type, p.posteam_id, p.play_type,
         p.receiver_player_id, p.rusher_player_id, n.yardline, n.air
  FROM football.nfl_plays p
  CROSS JOIN LATERAL (SELECT
    CASE WHEN btrim(p.source_row->>'yardline_100') ~ ${NUMBER} THEN btrim(p.source_row->>'yardline_100')::numeric END AS yardline,
    CASE WHEN btrim(p.source_row->>'air_yards') ~ ${NUMBER} THEN btrim(p.source_row->>'air_yards')::numeric END AS air) n
  WHERE p.season = $1 AND p.week IS NOT NULL
    AND p.source_row->>'season_type' IN ('REG', 'POST')
    AND p.source_row->>'two_point_attempt' IS DISTINCT FROM '1'
    AND n.yardline IS NOT NULL
), touches AS (
  SELECT week, season_type, posteam_id, receiver_player_id AS player_id, false AS is_carry, yardline, air FROM plays
  WHERE play_type = 'pass' AND receiver_player_id IS NOT NULL
  UNION ALL
  SELECT week, season_type, posteam_id, rusher_player_id, true, yardline, air FROM plays
  WHERE play_type = 'run' AND rusher_player_id IS NOT NULL
), counted AS (
  SELECT week, season_type, player_id, mode() WITHIN GROUP (ORDER BY posteam_id) AS play_team_id,
    (count(*) FILTER (WHERE is_carry))::integer AS carries,
    (count(*) FILTER (WHERE NOT is_carry))::integer AS targets,
    (count(*) FILTER (WHERE is_carry AND yardline <= 20))::integer AS red_zone_carries,
    (count(*) FILTER (WHERE NOT is_carry AND yardline <= 20))::integer AS red_zone_targets,
    (count(*) FILTER (WHERE yardline <= 10))::integer AS inside_10_touches,
    (count(*) FILTER (WHERE is_carry AND yardline <= 5))::integer AS inside_5_touches,
    (count(*) FILTER (WHERE NOT is_carry AND air >= yardline))::integer AS end_zone_targets,
    (count(*) FILTER (WHERE NOT is_carry AND air >= 20))::integer AS deep_targets
  FROM touches GROUP BY week, season_type, player_id
)
INSERT INTO stage_nfl_player_weekly_opportunity
  (season, week, season_type, player_id, team_id, carries, targets, red_zone_carries, red_zone_targets,
   inside_10_touches, inside_5_touches, end_zone_targets, deep_targets, details, ingest_event_id)
SELECT $1::integer, c.week, c.season_type, c.player_id, coalesce(s.team_id, c.play_team_id),
  c.carries, c.targets, c.red_zone_carries, c.red_zone_targets, c.inside_10_touches, c.inside_5_touches,
  c.end_zone_targets, c.deep_targets,
  coalesce(jsonb_strip_nulls(jsonb_build_object(
    'target_share', CASE WHEN btrim(s.source_row->>'target_share') ~ ${NUMBER} THEN btrim(s.source_row->>'target_share')::numeric END,
    'air_yards_share', CASE WHEN btrim(s.source_row->>'air_yards_share') ~ ${NUMBER} THEN btrim(s.source_row->>'air_yards_share')::numeric END,
    'wopr', CASE WHEN btrim(s.source_row->>'wopr') ~ ${NUMBER} THEN btrim(s.source_row->>'wopr')::numeric END,
    'racr', CASE WHEN btrim(s.source_row->>'racr') ~ ${NUMBER} THEN btrim(s.source_row->>'racr')::numeric END)), '{}'::jsonb),
  $2::bigint
FROM counted c
LEFT JOIN football.nfl_player_weekly_stats s
  ON s.season = $1 AND s.week = c.week AND s.season_type = c.season_type AND s.player_id = c.player_id`;

// Play-by-play against the weekly stat lines over every player-week either side knows about.
// nfl_player_weekly_stats.carries counts QB kneel-downs (play_type 'qb_kneel'); the derived carries exclude them,
// so the carries comparison adds each player-week's kneels to the play-by-play side. Kneel-only weeks still match.
const RECONCILE_SQL = `
WITH kneels AS (
  SELECT week, rusher_player_id AS player_id, count(*)::integer AS kneels FROM football.nfl_plays
  WHERE season = $1 AND play_type = 'qb_kneel' AND rusher_player_id IS NOT NULL AND week IS NOT NULL GROUP BY week, rusher_player_id
), base AS (
  SELECT coalesce(o.player_id, s.player_id) AS player_id, coalesce(o.week, s.week) AS week,
         o.player_id IS NULL AS missing_plays, s.player_id IS NULL AS missing_stats,
         coalesce(o.targets, 0) AS pbp_targets, coalesce(o.carries, 0) AS pbp_carries,
         coalesce(s.targets, 0) AS stat_targets, coalesce(s.carries, 0) AS stat_carries
  FROM stage_nfl_player_weekly_opportunity o
  FULL JOIN (SELECT season, week, season_type, player_id, targets, carries FROM football.nfl_player_weekly_stats WHERE season = $1) s
    ON s.season = o.season AND s.week = o.week AND s.season_type = o.season_type AND s.player_id = o.player_id
), joined AS (
  SELECT base.*, coalesce(k.kneels, 0) AS kneels FROM base LEFT JOIN kneels k ON k.week = base.week AND k.player_id = base.player_id
), live AS (
  SELECT *, (abs(pbp_targets - stat_targets) > $2::integer OR abs(pbp_carries + kneels - stat_carries) > $2::integer) AS outlier
  FROM joined WHERE pbp_targets + pbp_carries + kneels + stat_targets + stat_carries > 0
)
SELECT count(*)::integer AS compared_rows,
  (count(*) FILTER (WHERE outlier))::integer AS outlier_rows,
  (count(*) FILTER (WHERE missing_stats))::integer AS missing_stats_rows,
  (count(*) FILTER (WHERE kneels > 0))::integer AS kneel_adjusted_rows,
  (count(*) FILTER (WHERE missing_plays))::integer AS missing_play_rows,
  (SELECT count(*)::integer FROM stage_nfl_player_weekly_opportunity) AS derived_rows,
  coalesce((SELECT jsonb_agg(x ORDER BY x->>'week', x->>'player_id') FROM (
    SELECT jsonb_build_object('player_id', player_id, 'week', week, 'pbp_targets', pbp_targets, 'stat_targets', stat_targets,
      'pbp_carries', pbp_carries, 'kneels', kneels, 'stat_carries', stat_carries) AS x
    FROM live WHERE outlier ORDER BY week, player_id LIMIT 10) sample), '[]'::jsonb) AS outlier_sample
FROM live`;

// Plays the derivation cannot count: a source id the player crosswalk dropped (column NULL), or no usable yardline.
const SKIPPED_SQL = `
SELECT
  (count(*) FILTER (WHERE (play_type = 'pass' AND receiver_player_id IS NULL AND btrim(coalesce(source_row->>'receiver_player_id', '')) NOT IN ('', 'NA'))
                       OR (play_type = 'run' AND rusher_player_id IS NULL AND btrim(coalesce(source_row->>'rusher_player_id', '')) NOT IN ('', 'NA'))))::integer AS crosswalk_dropped_plays,
  (count(*) FILTER (WHERE ((play_type = 'pass' AND receiver_player_id IS NOT NULL) OR (play_type = 'run' AND rusher_player_id IS NOT NULL))
                       AND source_row->>'season_type' IN ('REG', 'POST') AND source_row->>'two_point_attempt' IS DISTINCT FROM '1'
                       AND NOT (btrim(source_row->>'yardline_100') ~ ${NUMBER})))::integer AS missing_yardline_plays
FROM football.nfl_plays WHERE season = $1 AND week IS NOT NULL`;

const COLUMNS = "week,season_type,player_id,team_id,carries,targets,red_zone_carries,red_zone_targets,inside_10_touches,inside_5_touches,end_zone_targets,deep_targets,details,ingest_event_id";

function safeCode(error) {
  return error instanceof PlayerWeeklyOpportunityError ? error.code
    : typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "warehouse_opportunity_failed";
}

/**
 * Fills one season of football.nfl_player_weekly_opportunity from football.nfl_plays inside one transaction:
 * advisory lock, set-based derivation into a temp stage, reconciliation guard, then delete + insert.
 * ingest_event_id is the season's latest succeeded play_by_play receipt; no receipt row of its own is written
 * (warehouse_ingest_events.dataset has no value for derived tables). An unchanged derivation writes nothing.
 */
function createPlayerWeeklyOpportunityWriter({ pool, transactionTimeouts, maxOutlierRatio = DEFAULT_MAX_OUTLIER_RATIO } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  if (typeof maxOutlierRatio !== "number" || !(maxOutlierRatio >= 0 && maxOutlierRatio <= 1)) throw new RangeError("maxOutlierRatio is invalid");
  const timeouts = validateTransactionTimeouts(transactionTimeouts);
  return { async writeSeason({ season } = {}) {
    if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
    const client = await pool.connect(); let began = false;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ"); began = true; await setLocalTransactionTimeouts(client, timeouts);
      await client.query({ name: `warehouse-${DATASET}-lock-v1`, text: "SELECT pg_advisory_xact_lock(hashtext($1),$2)", values: [DATASET, season] });
      const receipt = await client.query({ name: `warehouse-${DATASET}-receipt-v1`, text: "SELECT id FROM football.warehouse_ingest_events WHERE dataset='play_by_play' AND season=$1 AND state='succeeded' ORDER BY finished_at DESC, id DESC LIMIT 1", values: [season] });
      if (!receipt.rows.length) throw new PlayerWeeklyOpportunityError("play_by_play_receipt_missing", "no succeeded play-by-play receipt for the season");
      const ingestEventId = receipt.rows[0].id;
      await client.query("CREATE TEMP TABLE stage_nfl_player_weekly_opportunity (LIKE football.nfl_player_weekly_opportunity INCLUDING DEFAULTS) ON COMMIT DROP");
      await client.query(DERIVE_SQL, [season, ingestEventId]);
      const present = await client.query({ text: "SELECT count(*)::integer AS n FROM football.nfl_player_weekly_stats WHERE season=$1", values: [season] });
      if (!present.rows[0].n) throw new PlayerWeeklyOpportunityError("stats_missing", "no nfl_player_weekly_stats rows for the season");
      const skipped = (await client.query({ text: SKIPPED_SQL, values: [season] })).rows[0];
      const stats = (await client.query(RECONCILE_SQL, [season, TOLERANCE])).rows[0];
      const reconciliation = {
        comparedRows: stats.compared_rows, outlierRows: stats.outlier_rows, missingStatsRows: stats.missing_stats_rows,
        missingPlayRows: stats.missing_play_rows, kneelAdjustedRows: stats.kneel_adjusted_rows, outlierRatio: stats.compared_rows ? stats.outlier_rows / stats.compared_rows : 0,
        outlierSample: stats.outlier_sample, crosswalkDroppedPlays: skipped.crosswalk_dropped_plays, missingYardlinePlays: skipped.missing_yardline_plays, tolerance: TOLERANCE, maxOutlierRatio,
      };
      if (!stats.derived_rows) throw new PlayerWeeklyOpportunityError("opportunity_no_rows", "play-by-play produced no opportunity rows", reconciliation);
      if (stats.outlier_rows > maxOutlierRatio * stats.compared_rows) throw new PlayerWeeklyOpportunityError("opportunity_reconciliation_failed", "play-by-play disagrees with the weekly stat lines beyond tolerance", reconciliation);
      const drift = await client.query({ text: `SELECT
        (SELECT count(*)::integer FROM (SELECT ${COLUMNS} FROM stage_nfl_player_weekly_opportunity EXCEPT SELECT ${COLUMNS} FROM football.nfl_player_weekly_opportunity WHERE season=$1) a) AS added,
        (SELECT count(*)::integer FROM (SELECT ${COLUMNS} FROM football.nfl_player_weekly_opportunity WHERE season=$1 EXCEPT SELECT ${COLUMNS} FROM stage_nfl_player_weekly_opportunity) b) AS removed`, values: [season] });
      if (drift.rows[0].added === 0 && drift.rows[0].removed === 0) {
        await client.query("COMMIT");
        return { state: "unchanged", ingestEventId, writtenRows: stats.derived_rows, reconciliation };
      }
      await client.query({ name: `warehouse-${DATASET}-delete-v1`, text: "DELETE FROM football.nfl_player_weekly_opportunity WHERE season=$1", values: [season] });
      await client.query({ text: `INSERT INTO football.nfl_player_weekly_opportunity (season,${COLUMNS}) SELECT season,${COLUMNS} FROM stage_nfl_player_weekly_opportunity` });
      await client.query("COMMIT");
      return { state: "succeeded", ingestEventId, writtenRows: stats.derived_rows, reconciliation };
    } catch (error) {
      if (began) try { await client.query("ROLLBACK"); } catch {}
      const safe = new PlayerWeeklyOpportunityError(safeCode(error), "player-week opportunity derivation failed", error?.report);
      throw safe;
    } finally { client.release(); }
  }};
}
module.exports = { createPlayerWeeklyOpportunityWriter, PlayerWeeklyOpportunityError, DEFAULT_MAX_OUTLIER_RATIO };
