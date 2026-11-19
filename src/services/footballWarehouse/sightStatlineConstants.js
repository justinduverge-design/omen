"use strict";

/**
 * Omen projections v1: every number the method uses, in one place, so it can be read, argued with and fitted.
 *
 * None of these is fitted. They are judgment values chosen to be simple and conservative. The backtest
 * (backtest.js) is how they get checked, and a change to any of them is a new METHOD_VERSION.
 * Spec: Blueprints/specs/football-data/omen-projections-v1.md.
 */

const METHOD_VERSION = "omen-proj-v1";

const POSITIONS = Object.freeze(["QB", "RB", "WR", "TE"]);

// Volume (carries, targets, pass attempts per game played) reacts fast; efficiency (yards and scores per
// opportunity) is mostly noise week to week, so its weights are nearly flat.
const HALF_LIFE_GAMES_VOLUME = 4;
const HALF_LIFE_GAMES_EFFICIENCY = 12;
// Each season between a game and the target week multiplies that game's weight (a "season-weighted" blend).
const SEASON_DECAY = 0.6;
const MAX_HISTORY_GAMES = 24;

// Pseudo-observations of the position prior mixed into a player's own estimate (a Bayesian shrinkage:
// estimate = (own_sum + k * prior) / (own_n + k)). Volume k is in weighted games, efficiency k in weighted
// opportunities (carries, targets, attempts).
const SHRINKAGE = Object.freeze({
  volume_games: 2,
  rush_yards_per_carry: 100,
  rush_td_per_carry: 150,
  catch_rate: 60,
  rec_yards_per_target: 80,
  rec_td_per_target: 200,
  completions_per_attempt: 250,
  pass_yards_per_attempt: 300,
  pass_td_per_attempt: 500,
  int_per_attempt: 500,
  fumbles_lost_per_touch: 400,
  red_zone_carries: 30,
  red_zone_targets: 20,
});

// A player's touchdown prior is the position's rate times his red-zone share relative to the position,
// clipped so one hot month cannot move it more than this.
const RED_ZONE_RATIO_CLAMP = Object.freeze([0.5, 2]);

// Game environment: the team's implied points this week against the team's own recent games.
// Volume moves by eps_volume of the relative change, touchdown rates by eps_td, both clipped.
const ENVIRONMENT = Object.freeze({
  eps_volume: 0.35,
  eps_td: 1,
  volume_clamp: Object.freeze([0.9, 1.1]),
  td_clamp: Object.freeze([0.8, 1.25]),
});

// Omen's own availability rule. There is no historical injury-report data in the warehouse, so these
// cannot be backtested; they are conservative. A missing status is "no status on file": the line is not
// scaled and the output says the status was unknown.
const PLAY_PROBABILITY = Object.freeze({
  OUT: 0,
  IR: 0,
  PUP: 0,
  NFI: 0,
  SUSPENDED: 0,
  RESERVED: 0,
  DOUBTFUL: 0.15,
  QUESTIONABLE: 0.85,
});

// Confidence band from effective games (sum of volume weights). Thresholds are on a scale where a full
// current-season history saturates near 6.3.
const CONFIDENCE = Object.freeze({
  low_below: 2,
  high_from: 4,
  stale_gap_weeks: 4,
});

const STAT_KEYS = Object.freeze([
  "attempts",
  "completions",
  "passing_yards",
  "passing_tds",
  "passing_interceptions",
  "carries",
  "rushing_yards",
  "rushing_tds",
  "targets",
  "receptions",
  "receiving_yards",
  "receiving_tds",
  "fumbles_lost",
]);

module.exports = {
  CONFIDENCE,
  ENVIRONMENT,
  HALF_LIFE_GAMES_EFFICIENCY,
  HALF_LIFE_GAMES_VOLUME,
  MAX_HISTORY_GAMES,
  METHOD_VERSION,
  PLAY_PROBABILITY,
  POSITIONS,
  RED_ZONE_RATIO_CLAMP,
  SEASON_DECAY,
  SHRINKAGE,
  STAT_KEYS,
};
