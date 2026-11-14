"use strict";

/**
 * SYNTHETIC fixture season for the Sight stat-line scorecard test (card B13-SIGHT-STATLINE). Not real data: no
 * player, team or number here comes from a provider or a user.
 *
 * The world has a known answer. Every player produces the same stat line every week of the two warm-up seasons and
 * of the test season up to week SHIFT_WEEK - 1. From SHIFT_WEEK on, each shifted player's volume rises by a fixed
 * step. The `last3` forecast (mean of the last three games played, up to the forecast origin) can then be worked out
 * by hand for every horizon: it is exact until the step, short by the whole step for every target week whose origin
 * is before the step, and recovers by a third of the step per game afterwards.
 */

const WARMUP_SEASONS = Object.freeze([2022, 2023]);
const TEST_SEASON = 2024;
const SHIFT_WEEK = 10;
const WEEKS = 18;
const WR_TARGET_STEP = 3;
const RB_CARRY_STEP = 3;
const YARDS_PER_CARRY = 4;

const PLAYERS = Object.freeze([
  // `base` is the weekly volume before the step. `shifted: false` keeps a player flat all season.
  { id: "fixture:wr1", position: "WR", team: "AAA", base: 6, shifted: true },
  { id: "fixture:wr2", position: "WR", team: "BBB", base: 7, shifted: true },
  { id: "fixture:wr3", position: "WR", team: "CCC", base: 8, shifted: true },
  { id: "fixture:wr4", position: "WR", team: "DDD", base: 9, shifted: true },
  // Two targets a game is below the WR relevance threshold (4): in the `all` universe only.
  { id: "fixture:wr5-low-usage", position: "WR", team: "EEE", base: 2, shifted: false },
  { id: "fixture:rb1", position: "RB", team: "FFF", base: 10, shifted: true },
  { id: "fixture:rb2", position: "RB", team: "GGG", base: 12, shifted: true },
]);

function statsFor(player, week, season) {
  const stepped = season === TEST_SEASON && week >= SHIFT_WEEK && player.shifted;
  const zero = {
    attempts: 0,
    completions: 0,
    passing_yards: 0,
    passing_tds: 0,
    passing_interceptions: 0,
    carries: 0,
    rushing_yards: 0,
    rushing_tds: 0,
    targets: 0,
    receptions: 0,
    receiving_yards: 0,
    receiving_tds: 0,
    fumbles_lost: 0,
  };
  if (player.position === "RB") {
    const carries = player.base + (stepped ? RB_CARRY_STEP : 0);
    return { ...zero, carries, rushing_yards: carries * YARDS_PER_CARRY };
  }
  const targets = player.base + (stepped ? WR_TARGET_STEP : 0);
  return { ...zero, targets, receptions: Math.floor(targets / 2), receiving_yards: targets * 6 };
}

/** { [season]: { playerWeeks, games } } in the shape walkForward's source returns. */
function buildSightStatlineWorld() {
  const world = {};
  for (const season of [...WARMUP_SEASONS, TEST_SEASON]) {
    const playerWeeks = [];
    for (let week = 1; week <= WEEKS; week += 1) {
      for (const player of PLAYERS) {
        playerWeeks.push({
          player_id: player.id,
          position: player.position,
          team: player.team,
          week,
          stats: statsFor(player, week, season),
          opp: null,
          reported_ppr: null,
        });
      }
    }
    world[season] = { playerWeeks, games: [] };
  }
  return world;
}

module.exports = {
  PLAYERS,
  RB_CARRY_STEP,
  SHIFT_WEEK,
  TEST_SEASON,
  WARMUP_SEASONS,
  WEEKS,
  WR_TARGET_STEP,
  YARDS_PER_CARRY,
  buildSightStatlineWorld,
};
