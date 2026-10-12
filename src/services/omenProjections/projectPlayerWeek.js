"use strict";

/**
 * Omen projections v1: the pure projection of one player-week.
 *
 * No I/O, no clock, no randomness. The input is everything known BEFORE the target week; the output is a
 * projected STAT LINE in nflverse keys (never a points total, so any league's scoring can be applied), plus a
 * confidence band, flags and provenance. Method and limits: Blueprints/specs/football-data/omen-projections-v1.md.
 *
 * Input:
 *   {
 *     player_id?, position: "QB"|"RB"|"WR"|"TE", season, week, team?: "KC",
 *     history: [{ season, week, team?, stats: {attempts, completions, passing_yards, passing_tds,
 *                 passing_interceptions, carries, rushing_yards, rushing_tds, targets, receptions,
 *                 receiving_yards, receiving_tds, fumbles_lost},
 *                 opp?: {red_zone_carries, red_zone_targets} | null, implied_points?: number | null }],
 *     game?: { bye?: boolean, implied_points?: number | null } | null,   // null = no schedule context
 *     status?: string | null,       // Omen's own availability status; null = none on file
 *     rookie?: boolean,
 *     priors?: result of buildPriors / DEFAULT_PRIORS,
 *     as_of?: ISO string (provenance only)
 *   }
 *
 * Rows of `history` at or after (season, week) are ignored and counted (`inputs.ignored_future_rows`): a caller
 * bug cannot leak the target week into its own projection.
 */

const {
  CONFIDENCE, ENVIRONMENT, HALF_LIFE_GAMES_EFFICIENCY, HALF_LIFE_GAMES_VOLUME, MAX_HISTORY_GAMES, METHOD_VERSION,
  PLAY_PROBABILITY, POSITIONS, RED_ZONE_RATIO_CLAMP, SEASON_DECAY, SHRINKAGE, STAT_KEYS,
} = require("./constants");
const { DEFAULT_PRIORS } = require("./priors");

const BANDS = ["low", "medium", "high"];
const REGULAR_SEASON_WEEKS = 18;

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const clamp = (value, [lo, hi]) => Math.min(hi, Math.max(lo, value));
const round = (value, digits = 3) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function zeroLine() {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
}

/** Status text -> { state, probability, known }. Anything unrecognised plays at full strength and is flagged. */
function interpretStatus(status) {
  if (status == null || String(status).trim() === "") return { state: "unknown", probability: 1, known: false, recognised: true };
  const key = String(status).trim().toUpperCase().replace(/[\s-]+/g, "_");
  const alias = { INJURED_RESERVE: "IR", INACTIVE: "OUT", SUSPENSION: "SUSPENDED", SUSP: "SUSPENDED",
    PHYSICALLY_UNABLE_TO_PERFORM: "PUP", NON_FOOTBALL_INJURY: "NFI", RESERVE: "RESERVED" }[key] || key;
  if (alias in PLAY_PROBABILITY) {
    const probability = PLAY_PROBABILITY[alias];
    const state = probability === 0 ? "out" : alias === "DOUBTFUL" ? "doubtful" : "questionable";
    return { state, probability, known: true, recognised: true };
  }
  if (["ACTIVE", "HEALTHY", "PROBABLE", "NONE"].includes(alias)) return { state: "active", probability: 1, known: true, recognised: true };
  return { state: "unknown", probability: 1, known: false, recognised: false };
}

function weeksMissed(target, last) {
  const seasonGap = target.season - last.season;
  return seasonGap * REGULAR_SEASON_WEEKS + target.week - last.week - 1;
}

function projectPlayerWeek(input, options = {}) {
  if (!input || typeof input !== "object") throw new TypeError("input is required");
  const useGameContext = options.useGameContext !== false;
  const { season, week } = input;
  if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1) throw new TypeError("season and week must be integers");
  const position = String(input.position || "").toUpperCase();
  const priors = input.priors || DEFAULT_PRIORS;

  const base = {
    method_version: METHOD_VERSION,
    player_id: input.player_id ?? null,
    position,
    season,
    week,
  };
  if (!POSITIONS.includes(position)) {
    return { ...base, supported: false, stat_line: null, availability: null, confidence: { band: null, basis: "rule", reasons: ["position_not_supported"] },
      flags: ["position_not_supported"], sample: null, inputs: { as_of: input.as_of ?? null, priors_version: priors.version } };
  }
  const pp = priors.positions[position];

  // History: strictly before the target, most recent first, bounded.
  const all = Array.isArray(input.history) ? input.history : [];
  const before = [];
  let ignoredFuture = 0;
  for (const row of all) {
    if (!row || !Number.isInteger(row.season) || !Number.isInteger(row.week)) continue;
    if (row.season > season || (row.season === season && row.week >= week)) ignoredFuture += 1;
    else before.push(row);
  }
  before.sort((a, b) => b.season - a.season || b.week - a.week);
  const hist = before.slice(0, MAX_HISTORY_GAMES);

  const flags = [];
  const reasons = [];
  const availability = interpretStatus(input.status);
  if (!availability.recognised) flags.push("status_unrecognized");
  const provenance = {
    as_of: input.as_of ?? null,
    history_rows_used: hist.length,
    history_through: hist.length ? { season: hist[0].season, week: hist[0].week } : null,
    ignored_future_rows: ignoredFuture,
    priors_version: priors.version,
    game_context: "unavailable",
    red_zone_detail: "unavailable",
    status: availability.known ? "known" : "unknown",
  };

  // Bye weeks and OUT-type statuses are facts of the schedule or of Omen's availability rule: an empty line,
  // never an estimate of what the player "would have" done.
  if (input.game && input.game.bye === true) {
    return { ...base, supported: true, stat_line: zeroLine(), availability: { state: "bye", play_probability: 0 },
      confidence: { band: null, basis: "rule", reasons: ["bye_week"] }, flags: ["bye_week"], sample: null, inputs: provenance };
  }
  if (availability.state === "out") {
    return { ...base, supported: true, stat_line: zeroLine(), availability: { state: "out", play_probability: 0 },
      confidence: { band: null, basis: "rule", reasons: ["status_out"] }, flags: ["status_out"], sample: null, inputs: provenance };
  }

  // Weights by game index (most recent = 0) and season gap.
  const weights = hist.map((row, i) => {
    const decay = SEASON_DECAY ** (season - row.season);
    return {
      row,
      v: 0.5 ** (i / HALF_LIFE_GAMES_VOLUME) * decay,
      e: 0.5 ** (i / HALF_LIFE_GAMES_EFFICIENCY) * decay,
    };
  });
  const nEff = weights.reduce((sum, w) => sum + w.v, 0);
  const noHistory = hist.length === 0;
  if (noHistory) flags.push(input.rookie ? "rookie" : "no_history");
  else if (input.rookie) flags.push("rookie");
  if (!noHistory && hist.length < 3) flags.push("thin_sample");

  // Volume per game played, shrunk toward the position (or toward the debut prior with no history).
  const volumeKeys = position === "QB" ? ["attempts", "carries"] : ["carries", "targets"];
  const volume = { attempts: 0, carries: 0, targets: 0 };
  for (const key of volumeKeys) {
    if (noHistory) {
      volume[key] = num(pp.debut_volume?.[key] ?? pp.volume[key]);
    } else {
      const own = weights.reduce((sum, w) => sum + w.v * num(w.row.stats?.[key]), 0);
      volume[key] = (own + SHRINKAGE.volume_games * num(pp.volume[key])) / (nEff + SHRINKAGE.volume_games);
    }
  }

  // Environment: this game's implied team points against the team's own recent games.
  let volumeMultiplier = 1;
  let tdMultiplier = 1;
  const impliedNow = Number(input.game?.implied_points);
  if (!useGameContext) {
    provenance.game_context = "disabled";
  } else if (Number.isFinite(impliedNow) && impliedNow > 0) {
    const withImplied = weights.filter((w) => Number.isFinite(Number(w.row.implied_points)) && Number(w.row.implied_points) > 0);
    const wSum = withImplied.reduce((sum, w) => sum + w.v, 0);
    const reference = wSum > 0
      ? withImplied.reduce((sum, w) => sum + w.v * Number(w.row.implied_points), 0) / wSum
      : num(priors.league_implied_mean) || 22.5;
    const relative = impliedNow / reference - 1;
    volumeMultiplier = clamp(1 + ENVIRONMENT.eps_volume * relative, ENVIRONMENT.volume_clamp);
    tdMultiplier = clamp(1 + ENVIRONMENT.eps_td * relative, ENVIRONMENT.td_clamp);
    provenance.game_context = wSum > 0 ? "applied_vs_team_recent" : "applied_vs_league_mean";
  } else {
    flags.push("no_game_context");
  }
  for (const key of ["attempts", "carries", "targets"]) volume[key] *= volumeMultiplier;

  // Efficiency per opportunity, shrunk toward the position, with a nearly flat weighting.
  const rate = (numKey, denKey, priorValue, k) => {
    if (noHistory) return priorValue;
    let s = 0;
    let n = 0;
    for (const w of weights) {
      s += w.e * num(w.row.stats?.[numKey]);
      n += w.e * num(w.row.stats?.[denKey]);
    }
    return (s + k * priorValue) / (n + k);
  };

  // Red-zone work moves the touchdown prior, within a clamp.
  const redZoneRatio = (oppKey, denKey, positionShare, k) => {
    if (noHistory || !(positionShare > 0)) return 1;
    let rz = 0;
    let den = 0;
    for (const w of weights) {
      if (!w.row.opp) continue;
      rz += w.e * num(w.row.opp[oppKey]);
      den += w.e * num(w.row.stats?.[denKey]);
    }
    if (den <= 0 && rz <= 0) return 1;
    provenance.red_zone_detail = "used";
    const share = (rz + k * positionShare) / (den + k);
    return clamp(share / positionShare, RED_ZONE_RATIO_CLAMP);
  };

  const r = pp.rates;
  const rzCarry = redZoneRatio("red_zone_carries", "carries", pp.red_zone?.carry_share, SHRINKAGE.red_zone_carries);
  const rzTarget = redZoneRatio("red_zone_targets", "targets", pp.red_zone?.target_share, SHRINKAGE.red_zone_targets);
  const rates = {
    rush_yards_per_carry: rate("rushing_yards", "carries", r.rush_yards_per_carry, SHRINKAGE.rush_yards_per_carry),
    rush_td_per_carry: rate("rushing_tds", "carries", r.rush_td_per_carry * rzCarry, SHRINKAGE.rush_td_per_carry) * tdMultiplier,
    catch_rate: Math.min(1, rate("receptions", "targets", r.catch_rate, SHRINKAGE.catch_rate)),
    rec_yards_per_target: rate("receiving_yards", "targets", r.rec_yards_per_target, SHRINKAGE.rec_yards_per_target),
    rec_td_per_target: rate("receiving_tds", "targets", r.rec_td_per_target * rzTarget, SHRINKAGE.rec_td_per_target) * tdMultiplier,
    completions_per_attempt: Math.min(1, rate("completions", "attempts", r.completions_per_attempt, SHRINKAGE.completions_per_attempt)),
    pass_yards_per_attempt: rate("passing_yards", "attempts", r.pass_yards_per_attempt, SHRINKAGE.pass_yards_per_attempt),
    pass_td_per_attempt: rate("passing_tds", "attempts", r.pass_td_per_attempt, SHRINKAGE.pass_td_per_attempt) * tdMultiplier,
    int_per_attempt: rate("passing_interceptions", "attempts", r.int_per_attempt, SHRINKAGE.int_per_attempt),
  };
  // Fumbles lost per touch (carry, target or pass attempt).
  let flNum = 0;
  let flDen = 0;
  if (!noHistory) {
    for (const w of weights) {
      flNum += w.e * num(w.row.stats?.fumbles_lost);
      flDen += w.e * (num(w.row.stats?.carries) + num(w.row.stats?.targets) + num(w.row.stats?.attempts));
    }
  }
  rates.fumbles_lost_per_touch = (flNum + SHRINKAGE.fumbles_lost_per_touch * r.fumbles_lost_per_touch)
    / (flDen + SHRINKAGE.fumbles_lost_per_touch);

  // Expected line GIVEN the player plays; scaled by Omen's play probability.
  const p = availability.probability;
  const attempts = position === "QB" ? volume.attempts : 0;
  const targets = position === "QB" ? 0 : volume.targets;
  const carries = volume.carries;
  const line = {
    attempts: attempts * p,
    completions: attempts * rates.completions_per_attempt * p,
    passing_yards: attempts * rates.pass_yards_per_attempt * p,
    passing_tds: attempts * rates.pass_td_per_attempt * p,
    passing_interceptions: attempts * rates.int_per_attempt * p,
    carries: carries * p,
    rushing_yards: carries * rates.rush_yards_per_carry * p,
    rushing_tds: carries * rates.rush_td_per_carry * p,
    targets: targets * p,
    receptions: targets * rates.catch_rate * p,
    receiving_yards: targets * rates.rec_yards_per_target * p,
    receiving_tds: targets * rates.rec_td_per_target * p,
    fumbles_lost: (attempts + carries + targets) * rates.fumbles_lost_per_touch * p,
  };
  const statLine = {};
  for (const key of STAT_KEYS) statLine[key] = round(Math.max(0, line[key]));

  // Confidence band (never a percentage): sample size first, then things that make the sample less relevant.
  let level;
  if (noHistory) {
    level = 0;
    reasons.push(input.rookie ? "rookie_no_nfl_games" : "no_prior_games");
  } else {
    level = nEff < CONFIDENCE.low_below ? 0 : nEff < CONFIDENCE.high_from ? 1 : 2;
    reasons.push(level === 0 ? "thin_sample" : level === 1 ? "moderate_sample" : "deep_sample");
  }
  const last = hist[0];
  if (last) {
    const missed = weeksMissed({ season, week }, last);
    if (missed >= CONFIDENCE.stale_gap_weeks) {
      flags.push("returning_from_absence");
      reasons.push("long_gap_since_last_game");
      level -= 1;
    }
    if (input.team && last.team && String(input.team) !== String(last.team)) {
      flags.push("team_changed");
      reasons.push("team_changed");
      level -= 1;
    }
  }
  if (availability.state === "questionable" || availability.state === "doubtful") {
    flags.push(`status_${availability.state}`);
    reasons.push(`status_${availability.state}`);
    level -= 1;
  }
  if (provenance.red_zone_detail === "unavailable" && !noHistory) flags.push("no_red_zone_detail");
  level = Math.max(0, Math.min(2, level));

  return {
    ...base,
    supported: true,
    stat_line: statLine,
    availability: { state: availability.state, play_probability: p },
    confidence: { band: BANDS[level], basis: "sample", reasons },
    flags,
    sample: {
      games_used: hist.length,
      effective_games: round(nEff, 2),
      last_game: last ? { season: last.season, week: last.week } : null,
      weeks_missed_since_last_game: last ? Math.max(0, weeksMissed({ season, week }, last)) : null,
    },
    components: {
      volume_per_game_if_active: { attempts: round(attempts), carries: round(carries), targets: round(targets) },
      rates: Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, round(v, 4)])),
      red_zone_ratio: { carries: round(rzCarry, 3), targets: round(rzTarget, 3) },
      environment: { volume_multiplier: round(volumeMultiplier, 4), td_multiplier: round(tdMultiplier, 4) },
    },
    inputs: provenance,
  };
}

module.exports = { BANDS, interpretStatus, projectPlayerWeek, zeroLine };
