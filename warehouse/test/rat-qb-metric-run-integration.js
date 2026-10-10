"use strict";

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { createRatQbRunner } = require("../../src/services/footballWarehouse/ratQbRun");
const { createMetricRunWriter, MetricRunError } = require("../../src/services/footballWarehouse/metricRunWriter");

const QB_COUNT = 10;
const HASH = (c) => `sha256:${c.repeat(64)}`;

async function event(pool, runId, dataset, season, ref) {
  const r = await pool.query(
    `INSERT INTO football.warehouse_ingest_events
       (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes, source_rows, state, finished_at)
     VALUES ($1, $2, $3, 'nflverse_open_data', 'https://github.com/nflverse/fixture', $4, 1, 1, 'succeeded', clock_timestamp())
     RETURNING id`, [runId, dataset, season, ref]);
  return r.rows[0].id;
}

async function seed(pool) {
  const prereq = await event(pool, "rat-qb-prereq", "players", 2025, HASH("a"));
  const pbp = await event(pool, "rat-qb-pbp", "play_by_play", 2025, HASH("b"));
  await pool.query(`INSERT INTO football.football_teams (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
                    VALUES ('omen:team:buf','BUF','Buffalo',1999,$1), ('omen:team:mia','MIA','Miami',1999,$1)`, [prereq]);
  await pool.query(`INSERT INTO football.football_players (player_id, gsis_id, display_name, football_position, ingest_event_id)
                    SELECT 'omen:player:qb' || i, '00-00000' || lpad(i::text, 2, '0'), 'QB ' || i, 'QB', $1
                      FROM generate_series(1, ${QB_COUNT}) i`, [prereq]);
  await pool.query(`INSERT INTO football.football_players (player_id, gsis_id, display_name, football_position, ingest_event_id)
                    VALUES ('omen:player:wr1', '00-0000999', 'WR 1', 'WR', $1)`, [prereq]);
  // One regular-season game per QB (week i), plus a playoff game that must be excluded.
  await pool.query(`INSERT INTO football.nfl_games (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
                    SELECT 2025, '2025_' || lpad(i::text, 2, '0') || '_BUF_MIA', i, 'REG', 'omen:team:buf', 'omen:team:mia', $1
                      FROM generate_series(1, ${QB_COUNT}) i`, [prereq]);
  await pool.query(`INSERT INTO football.nfl_games (season, game_id, week, game_type, away_team_id, home_team_id, ingest_event_id)
                    VALUES (2025, '2025_20_BUF_MIA', 20, 'DIV', 'omen:team:buf', 'omen:team:mia', $1)`, [prereq]);
  // 110 dropbacks per QB (better QBs have higher index), 10 designed rushes, a few sacks and picks.
  await pool.query(`
    INSERT INTO football.nfl_plays (season, game_id, play_id, week, posteam_id, defteam_id, passer_player_id,
                                    rusher_player_id, play_type, epa, cpoe, source_row, ingest_event_id)
    SELECT 2025, '2025_' || lpad(i::text, 2, '0') || '_BUF_MIA', j, i, 'omen:team:buf', 'omen:team:mia',
           'omen:player:qb' || i, NULL, 'pass',
           CASE WHEN j % 13 = 0 THEN -2.5 ELSE 0.04 * i - 0.2 + ((j % 7) - 3) * 0.15 END,
           CASE WHEN j % 13 = 0 OR j % 50 = 0 THEN NULL ELSE (i - 5.5) + ((j % 5) - 2) END,
           jsonb_build_object('qb_dropback', '1', 'qb_scramble', '0', 'qb_spike', '0', 'qb_kneel', '0',
             'sack', CASE WHEN j % 13 = 0 THEN '1' ELSE '0' END,
             'pass_attempt', CASE WHEN j % 13 = 0 THEN '0' ELSE '1' END,
             'rush_attempt', '0',
             'interception', CASE WHEN j % 50 = 0 AND i <= 5 THEN '1' ELSE '0' END,
             'fumble_lost', '0'),
           $1
      FROM generate_series(1, ${QB_COUNT}) i, generate_series(1, 110) j`, [pbp]);
  await pool.query(`
    INSERT INTO football.nfl_plays (season, game_id, play_id, week, posteam_id, defteam_id, passer_player_id,
                                    rusher_player_id, play_type, epa, cpoe, source_row, ingest_event_id)
    SELECT 2025, '2025_' || lpad(i::text, 2, '0') || '_BUF_MIA', 1000 + j, i, 'omen:team:buf', 'omen:team:mia',
           NULL, 'omen:player:qb' || i, 'run', 0.1 * ((j % 3) - 1) + 0.01 * i, NULL,
           jsonb_build_object('qb_dropback', '0', 'qb_scramble', '0', 'qb_spike', '0', 'qb_kneel', '0', 'sack', '0',
             'pass_attempt', '0', 'rush_attempt', '1', 'interception', '0', 'fumble_lost', '0'),
           $1
      FROM generate_series(1, ${QB_COUNT}) i, generate_series(1, 10) j`, [pbp]);
  // Playoff plays for QB 1 and a non-QB passer: both must be ignored.
  await pool.query(`
    INSERT INTO football.nfl_plays (season, game_id, play_id, week, posteam_id, defteam_id, passer_player_id,
                                    play_type, epa, source_row, ingest_event_id)
    SELECT 2025, '2025_20_BUF_MIA', j, 20, 'omen:team:buf', 'omen:team:mia',
           CASE WHEN j <= 50 THEN 'omen:player:qb1' ELSE 'omen:player:wr1' END, 'pass', 5.0,
           jsonb_build_object('qb_dropback', '1', 'pass_attempt', '1'), $1
      FROM generate_series(1, 100) j`, [pbp]);
  // Edge plays for QB 10 (the loop above gave it 110 dropbacks, 10 designed rushes, 8 sacks):
  // a scramble, a spike, a kneel, a sack the QB fumbled and lost, and a catch the receiver fumbled.
  await pool.query(`
    INSERT INTO football.nfl_plays (season, game_id, play_id, week, posteam_id, defteam_id, passer_player_id,
                                    rusher_player_id, play_type, epa, cpoe, source_row, ingest_event_id)
    VALUES
      (2025, '2025_10_BUF_MIA', 2001, 10, 'omen:team:buf', 'omen:team:mia', NULL, 'omen:player:qb10', 'run', 0.5, NULL,
       '{"qb_dropback":"1","qb_scramble":"1","rush_attempt":"1","pass_attempt":"0","sack":"0","interception":"0","fumble_lost":"0"}', $1),
      (2025, '2025_10_BUF_MIA', 2002, 10, 'omen:team:buf', 'omen:team:mia', 'omen:player:qb10', NULL, 'qb_spike', -0.1, NULL,
       '{"qb_dropback":"1","qb_spike":"1","pass_attempt":"1","sack":"0","interception":"0","fumble_lost":"0"}', $1),
      (2025, '2025_10_BUF_MIA', 2003, 10, 'omen:team:buf', 'omen:team:mia', NULL, 'omen:player:qb10', 'qb_kneel', -0.4, NULL,
       '{"qb_dropback":"0","qb_kneel":"1","rush_attempt":"1","sack":"0","interception":"0","fumble_lost":"0"}', $1),
      (2025, '2025_10_BUF_MIA', 2004, 10, 'omen:team:buf', 'omen:team:mia', 'omen:player:qb10', NULL, 'pass', -2.5, NULL,
       '{"qb_dropback":"1","sack":"1","pass_attempt":"0","interception":"0","fumble_lost":"1","fumbled_1_player_id":"00-0000010"}', $1),
      (2025, '2025_10_BUF_MIA', 2005, 10, 'omen:team:buf', 'omen:team:mia', 'omen:player:qb10', NULL, 'pass', 0.0, 1.0,
       '{"qb_dropback":"1","sack":"0","pass_attempt":"1","interception":"0","fumble_lost":"1","fumbled_1_player_id":"00-0000999"}', $1)`, [pbp]);
  return { pbp };
}

async function main() {
  const socket = process.argv[2];
  if (!socket) throw new Error("PostgreSQL socket path is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 3 });
  try {
    const { pbp } = await seed(pool);
    const runner = createRatQbRunner({ pool });

    // 1. First full-season run succeeds, grades all 10 QBs, links the PBP event.
    const first = await runner.run({ season: 2025 });
    assert.equal(first.state, "succeeded");
    assert.equal(first.valueCount, QB_COUNT);
    assert.equal(first.summary.outcome, "graded");
    const stored = await pool.query(
      `SELECT r.id, r.metric_name, r.formula_version, r.week, r.state, r.parameters, r.error_code
         FROM football.football_metric_runs r WHERE r.id = $1`, [first.metricRunId]);
    assert.equal(stored.rows[0].metric_name, "omen_qb_grade");
    assert.equal(stored.rows[0].formula_version, "v0");
    assert.equal(stored.rows[0].week, null);
    assert.equal(stored.rows[0].state, "succeeded");
    assert.equal(stored.rows[0].parameters.fitted, false);
    assert.equal(stored.rows[0].parameters.summary.qualified_count, QB_COUNT);
    const inputs = await pool.query("SELECT ingest_event_id FROM football.football_metric_run_inputs WHERE metric_run_id=$1", [first.metricRunId]);
    assert.deepEqual(inputs.rows.map((r) => Number(r.ingest_event_id)), [Number(pbp)]);

    const values = await pool.query(
      `SELECT entity_id, value, components FROM football.football_metric_values
        WHERE metric_run_id=$1 ORDER BY value DESC`, [first.metricRunId]);
    assert.equal(values.rowCount, QB_COUNT);
    assert.ok(!values.rows.some((r) => r.entity_id === "omen:player:wr1"), "non-QB must not be graded");
    const grades = values.rows.map((r) => r.value);
    const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
    const sd = Math.sqrt(grades.reduce((a, b) => a + (b - mean) ** 2, 0) / grades.length);
    assert.ok(Math.abs(mean - 50) < 1e-3 && Math.abs(sd - 10) < 1e-2, `mean ${mean} sd ${sd}`);
    // Playoff plays (epa 5.0) excluded: QB 1 has exactly 110 regular-season dropbacks.
    const qb1 = values.rows.find((r) => r.entity_id === "omen:player:qb1");
    assert.equal(qb1.components.dropbacks, 110);
    assert.equal(qb1.components.designed_rushes, 10);
    // Edge plays end to end for QB 10: +1 scramble, +1 sack-fumble, +1 receiver-fumble catch = 113 dropbacks;
    // spike and kneel excluded; scramble is not a designed rush; only the QB's own fumble is charged.
    const qb10 = values.rows.find((r) => r.entity_id === "omen:player:qb10").components;
    assert.equal(qb10.dropbacks, 113);
    assert.equal(qb10.sacks, 9);
    assert.equal(qb10.fumbles_lost, 1);
    assert.equal(qb10.interceptions, 0);
    assert.equal(qb10.designed_rushes, 10);
    // QB 10's edge plays (sack-fumble) cost it the top spot to QB 9; both stay at the top.
    assert.ok(["omen:player:qb9", "omen:player:qb10"].includes(values.rows[0].entity_id), "best constructed QBs rank first");

    // 2. Identical rerun is unchanged and does not duplicate anything.
    const again = await runner.run({ season: 2025 });
    assert.equal(again.state, "unchanged");
    assert.equal(again.metricRunId, first.metricRunId);
    const counts = await pool.query(
      `SELECT (SELECT count(*)::integer FROM football.football_metric_runs WHERE metric_name='omen_qb_grade' AND week IS NULL) AS null_week_runs,
              (SELECT count(*)::integer FROM football.football_metric_values WHERE metric_run_id=$1) AS value_rows`, [first.metricRunId]);
    assert.deepEqual(counts.rows[0], { null_week_runs: 1, value_rows: QB_COUNT });

    // 2b. A QB crosswalk change must defeat the "unchanged" shortcut, and reverting must recompute again.
    await pool.query("UPDATE football.football_players SET football_position='WR' WHERE player_id='omen:player:qb1'");
    const crosswalk = await runner.run({ season: 2025 });
    assert.equal(crosswalk.state, "succeeded");
    assert.equal(crosswalk.metricRunId, first.metricRunId);
    assert.equal(crosswalk.valueCount, QB_COUNT - 1);
    await pool.query("UPDATE football.football_players SET football_position='QB' WHERE player_id='omen:player:qb1'");
    const restored = await runner.run({ season: 2025 });
    assert.equal(restored.state, "succeeded");
    assert.equal(restored.valueCount, QB_COUNT);

    // 3. A week-limited run is its own row; 5 qualified QBs is below the cohort minimum, so it stores no values.
    const early = await runner.run({ season: 2025, week: 5 });
    assert.equal(early.state, "succeeded");
    assert.equal(early.valueCount, 0);
    assert.equal(early.summary.outcome, "cohort_too_small");
    assert.notEqual(early.metricRunId, first.metricRunId);
    assert.equal((await runner.run({ season: 2025, week: 5 })).state, "unchanged");

    // 4. A re-ingest (new PBP event) recomputes into the same run row and repoints the inputs.
    const pbp2 = await event(pool, "rat-qb-pbp-2", "play_by_play", 2025, HASH("c"));
    await pool.query("UPDATE football.nfl_plays SET ingest_event_id=$1 WHERE season=2025", [pbp2]);
    const refreshed = await runner.run({ season: 2025 });
    assert.equal(refreshed.state, "succeeded");
    assert.equal(refreshed.metricRunId, first.metricRunId);
    const repointed = await pool.query("SELECT ingest_event_id FROM football.football_metric_run_inputs WHERE metric_run_id=$1", [first.metricRunId]);
    assert.deepEqual(repointed.rows.map((r) => Number(r.ingest_event_id)), [Number(pbp2)]);
    assert.equal((await pool.query("SELECT count(*)::integer n FROM football.football_metric_values WHERE metric_run_id=$1", [first.metricRunId])).rows[0].n, QB_COUNT);

    // 5. No input plays: the run fails with a safe code and stores no values.
    await assert.rejects(runner.run({ season: 2024 }), (error) => error instanceof MetricRunError && error.code === "no_inputs");
    const failed = await pool.query("SELECT state, error_code FROM football.football_metric_runs WHERE season=2024");
    assert.deepEqual(failed.rows, [{ state: "failed", error_code: "no_inputs" }]);

    // 6. A failing recompute never clobbers a previously succeeded run.
    const writer = createMetricRunWriter({ pool });
    await assert.rejects(writer.writeRun({
      metricName: "omen_qb_grade", formulaVersion: "v0", season: 2025,
      resolveInputs: async () => ({ ingestEventIds: [Number(pbp2)], parameters: { changed: true } }),
      computeValues: async () => { throw new Error("boom"); },
    }), (error) => error instanceof MetricRunError && error.code === "metric_run_failed");
    const survivor = await pool.query(
      `SELECT r.state, (SELECT count(*)::integer FROM football.football_metric_values v WHERE v.metric_run_id = r.id) AS n
         FROM football.football_metric_runs r WHERE r.id=$1`, [first.metricRunId]);
    assert.deepEqual(survivor.rows[0], { state: "succeeded", n: QB_COUNT });

    // 6b. Two simultaneous null-week runs leave exactly one run row.
    await pool.query("DELETE FROM football.football_metric_runs WHERE metric_name='omen_qb_grade' AND season=2025 AND week IS NULL");
    const racers = await Promise.all([runner.run({ season: 2025 }), runner.run({ season: 2025 })]);
    assert.deepEqual(racers.map((r) => r.state).sort(), ["succeeded", "unchanged"]);
    assert.equal(racers[0].metricRunId, racers[1].metricRunId);
    const raced = await pool.query("SELECT count(*)::integer n FROM football.football_metric_runs WHERE metric_name='omen_qb_grade' AND season=2025 AND week IS NULL");
    assert.equal(raced.rows[0].n, 1);

    // 7. The schema rejects a metric name outside the omen_ namespace.
    await assert.rejects(pool.query(
      "INSERT INTO football.football_metric_runs (metric_name, formula_version, season, state, started_at) VALUES ('qb_grade','v0',2025,'running',now())"));
    console.log("VERIFIED Node RAT-QB v0 metric run writer");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : "rat-qb integration failed");
  process.exitCode = 1;
});
