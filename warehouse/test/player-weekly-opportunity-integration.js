"use strict";

const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { createPlayerWeeklyOpportunityWriter } = require("../../src/services/footballWarehouse/playerWeeklyOpportunityWriter");
const { buildOpportunity } = require("../../src/services/nflverseFacts");

const SEASON = 2026;
const hash = (character) => `sha256:${character.repeat(64)}`;
const SOURCE = "https://example.test/nflverse/integration-prerequisites";
const WR = "omen:player:fixture-wr";
const RB = "omen:player:fixture-rb";
const TE = "omen:player:fixture-te";
const QB = "omen:player:fixture-qb";

// Raw play-by-play CSV values, the way nfl_plays.source_row stores them. The first five rows are the
// fixtures of test/nflverseWeeklyStats.test.js "opportunity counts red-zone, end-zone and deep targets".
const PLAYS = [
  { week: 1, play_type: "pass", yardline_100: "15", air_yards: "16", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "pass", yardline_100: "60", air_yards: "25", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "pass", yardline_100: "2", air_yards: "2", two_point_attempt: "1", receiver_player_id: WR },
  { week: 1, play_type: "run", yardline_100: "4", air_yards: "NA", two_point_attempt: "0", rusher_player_id: RB },
  { week: 1, play_type: "no_play", yardline_100: "5", air_yards: "NA", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "pass", yardline_100: "NA", air_yards: "9", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "run", yardline_100: "18", air_yards: "NA", two_point_attempt: "0", rusher_player_id: RB },
  { week: 1, play_type: "pass", yardline_100: "9", air_yards: "9", two_point_attempt: "0", receiver_player_id: TE },
  { week: 1, play_type: "run", yardline_100: "60", air_yards: "NA", two_point_attempt: "0", rusher_player_id: RB },
  { week: 1, play_type: "pass", yardline_100: "8", air_yards: "", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "pass", yardline_100: "30", air_yards: "20", two_point_attempt: "0", receiver_player_id: WR },
  { week: 1, play_type: "run", yardline_100: "5", air_yards: "NA", two_point_attempt: "0", rusher_player_id: RB },
  { week: 2, play_type: "run", yardline_100: "3", air_yards: "NA", two_point_attempt: "0", rusher_player_id: RB },
  // Playoff week with no stats row (team falls back to posteam_id); and a target whose receiver the crosswalk dropped.
  { week: 19, season_type: "POST", play_type: "run", yardline_100: "1", air_yards: "NA", two_point_attempt: "0", rusher_player_id: QB },
  { week: 1, play_type: "pass", yardline_100: "40", air_yards: "5", two_point_attempt: "0", receiver_player_id: "00-9999999", dropped: true },
].map((play, index) => ({ season_type: "REG", ...play, play_id: index + 1, season: String(SEASON), posteam: "BUF" }));

async function seed(pool) {
  const seeded = await pool.query(`
    INSERT INTO football.warehouse_ingest_events
      (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes, source_rows, state, finished_at)
    VALUES ('opp-prereq', 'players', $1, 'nflverse_open_data', '${SOURCE}', $2, 128, 4, 'succeeded', clock_timestamp()),
           ('opp-plays', 'play_by_play', $1, 'nflverse_open_data', '${SOURCE}/pbp', $3, 128, 13, 'succeeded', clock_timestamp())
    RETURNING id, dataset`, [SEASON, hash("a"), hash("b")]);
  const ids = Object.fromEntries(seeded.rows.map((row) => [row.dataset, row.id]));
  await pool.query(`INSERT INTO football.football_teams (team_id, nflverse_abbr, display_name, first_season, ingest_event_id)
    VALUES ('omen:team:buf', 'BUF', 'Buffalo', 1999, $1), ('omen:team:mia', 'MIA', 'Miami', 1999, $1)`, [ids.players]);
  await pool.query(`INSERT INTO football.football_players (player_id, gsis_id, display_name, football_position, ingest_event_id)
    VALUES ($2, '00-0000002', 'Fixture Receiver', 'WR', $1), ($3, '00-0000003', 'Fixture Back', 'RB', $1), ($4, '00-0000004', 'Fixture End', 'TE', $1), ($5, '00-0000005', 'Fixture Passer', 'QB', $1)`, [ids.players, WR, RB, TE, QB]);
  await pool.query(`INSERT INTO football.nfl_games (season, game_id, week, game_type, away_team_id, home_team_id, away_score, home_score, ingest_event_id)
    VALUES ($1, '2026_01_BUF_MIA', 1, 'REG', 'omen:team:buf', 'omen:team:mia', 24, 27, $2),
           ($1, '2026_02_BUF_MIA', 2, 'REG', 'omen:team:buf', 'omen:team:mia', 20, 10, $2),
           ($1, '2026_19_BUF_MIA', 19, 'WC', 'omen:team:buf', 'omen:team:mia', 20, 10, $2)`, [SEASON, ids.players]);
  for (const play of PLAYS) {
    await pool.query(`INSERT INTO football.nfl_plays
      (season, game_id, play_id, week, posteam_id, defteam_id, rusher_player_id, receiver_player_id, play_type, source_row, ingest_event_id)
      VALUES ($1, $2, $3, $4, 'omen:team:buf', 'omen:team:mia', $5, $6, $7, $8::jsonb, $9)`,
      [SEASON, { 1: "2026_01_BUF_MIA", 2: "2026_02_BUF_MIA", 19: "2026_19_BUF_MIA" }[play.week], play.play_id, play.week, play.rusher_player_id || null,
        play.dropped ? null : play.receiver_player_id || null, play.play_type, JSON.stringify(play), ids.play_by_play]);
  }
  const stat = (week, player, targets, carries, sourceRow = {}) => pool.query(`INSERT INTO football.nfl_player_weekly_stats
    (season, week, season_type, player_id, team_id, targets, carries, source_row, ingest_event_id)
    VALUES ($1, $2, 'REG', $3, 'omen:team:buf', $4, $5, $6::jsonb, $7)`, [SEASON, week, player, targets, carries, JSON.stringify(sourceRow), ids.players]);
  await stat(1, WR, 5, 0, { target_share: "0.25", air_yards_share: "0.3", wopr: "0.7", racr: "NA" });
  await stat(1, RB, 0, 4);
  await stat(1, TE, 1, 0);
  await stat(2, RB, 0, 1);
  return ids;
}

async function rows(pool) {
  return (await pool.query("SELECT * FROM football.nfl_player_weekly_opportunity WHERE season=$1 ORDER BY week, player_id", [SEASON])).rows;
}

async function verifyParity(pool) {
  const expected = buildOpportunity(PLAYS);
  const stored = await rows(pool);
  assert.equal(stored.length, 5);
  for (const row of stored) {
    const o = expected.get(`${row.player_id}|${SEASON}|${row.week}`) || {};
    assert.equal(row.season_type, row.week === 19 ? "POST" : "REG");
    assert.deepEqual({
      red_zone_carries: row.red_zone_carries, red_zone_targets: row.red_zone_targets,
      inside_10_touches: row.inside_10_touches, inside_5_touches: row.inside_5_touches,
      end_zone_targets: row.end_zone_targets, deep_targets: row.deep_targets,
    }, {
      red_zone_carries: o.rz_carries || 0, red_zone_targets: o.rz_targets || 0,
      inside_10_touches: (o.i10_targets || 0) + (o.i10_carries || 0), inside_5_touches: o.gl_carries || 0,
      end_zone_targets: o.ez_targets || 0, deep_targets: o.deep_targets || 0,
    }, `${row.player_id} week ${row.week} matches buildOpportunity`);
    assert.equal(row.snaps, null); assert.equal(row.snap_share, null); assert.equal(row.routes, null);
  }
  const wr = stored.find((row) => row.player_id === WR);
  assert.deepEqual([wr.targets, wr.carries, wr.team_id], [4, 0, "omen:team:buf"]);
  assert.deepEqual(wr.details, { target_share: 0.25, air_yards_share: 0.3, wopr: 0.7 });
  const rb = stored.find((row) => row.player_id === RB && row.week === 1);
  assert.deepEqual([rb.carries, rb.red_zone_carries, rb.inside_10_touches, rb.inside_5_touches], [4, 3, 2, 2]);
  assert.deepEqual(stored.find((row) => row.player_id === TE).details, {});
  const post = stored.find((row) => row.player_id === QB);
  assert.deepEqual([post.team_id, post.carries, post.inside_5_touches], ["omen:team:buf", 1, 1], "no stats row: team falls back to posteam_id");
}

async function main() {
  const socket = process.argv[2];
  if (!socket) throw new Error("PostgreSQL socket path is required");
  const pool = new Pool({ host: socket, user: "postgres", database: "postgres", max: 2 });
  try {
    const ids = await seed(pool);
    const writer = createPlayerWeeklyOpportunityWriter({ pool });

    const first = await writer.writeSeason({ season: SEASON });
    assert.equal(first.state, "succeeded");
    assert.equal(first.writtenRows, 5);
    assert.equal(String(first.ingestEventId), String(ids.play_by_play));
    assert.deepEqual([first.reconciliation.comparedRows, first.reconciliation.outlierRows, first.reconciliation.missingStatsRows], [5, 0, 1]);
    assert.deepEqual([first.reconciliation.crosswalkDroppedPlays, first.reconciliation.missingYardlinePlays], [1, 1]);
    await verifyParity(pool);
    assert.equal((await writer.writeSeason({ season: SEASON })).state, "unchanged");

    // A guard failure writes nothing and leaves the previous rows in place.
    await pool.query("UPDATE football.nfl_player_weekly_stats SET targets=20 WHERE player_id=$1", [WR]);
    await assert.rejects(writer.writeSeason({ season: SEASON }), (error) => {
      assert.equal(error.code, "opportunity_reconciliation_failed");
      assert.equal(error.report.outlierRows, 1);
      assert.equal(error.report.outlierSample[0].player_id, WR);
      return true;
    });
    assert.equal((await rows(pool)).length, 5);
    // A looser tolerance reports the outlier and proceeds (nothing changed, so unchanged).
    const loose = await createPlayerWeeklyOpportunityWriter({ pool, maxOutlierRatio: 0.5 }).writeSeason({ season: SEASON });
    assert.equal(loose.state, "unchanged");
    assert.equal(loose.reconciliation.outlierRows, 1);
    await pool.query("UPDATE football.nfl_player_weekly_stats SET targets=5 WHERE player_id=$1", [WR]);

    // Corrected play-by-play under a new receipt rewrites the season in place.
    const receipt = await pool.query(`INSERT INTO football.warehouse_ingest_events
      (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes, source_rows, state, finished_at)
      VALUES ('opp-plays-2', 'play_by_play', $1, 'nflverse_open_data', '${SOURCE}/pbp', $2, 128, 13, 'succeeded', clock_timestamp() + interval '1 second')
      RETURNING id`, [SEASON, hash("c")]);
    await pool.query(`UPDATE football.nfl_plays SET ingest_event_id=$2, source_row = jsonb_set(source_row, '{yardline_100}', '"12"') WHERE season=$1 AND play_id=2`, [SEASON, receipt.rows[0].id]);
    const corrected = await writer.writeSeason({ season: SEASON });
    assert.equal(corrected.state, "succeeded");
    assert.equal(String(corrected.ingestEventId), String(receipt.rows[0].id));
    const wr = (await rows(pool)).find((row) => row.player_id === WR);
    assert.equal(wr.red_zone_targets, 3);
    assert.equal(wr.deep_targets, 2);

    await pool.query("DELETE FROM football.nfl_player_weekly_stats WHERE season=$1", [SEASON]);
    await assert.rejects(writer.writeSeason({ season: SEASON }), (error) => error.code === "stats_missing");
    assert.equal((await rows(pool)).length, 5);
    await assert.rejects(writer.writeSeason({ season: 2025 }), (error) => error.code === "play_by_play_receipt_missing");
    const dangling = await pool.query("SELECT count(*)::integer count FROM football.warehouse_ingest_events WHERE state='started'");
    assert.equal(dangling.rows[0].count, 0);
    console.log("VERIFIED PostgreSQL 17 player-week opportunity derivation");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : "player-week opportunity integration failed");
  process.exitCode = 1;
});
