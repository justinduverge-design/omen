"use strict";

/**
 * Position priors: what a typical player at a position does, per game played and per opportunity.
 *
 * `DEFAULT_PRIORS` are rounded, judgment-level league typicals used only when no training rows exist
 * (the first season of a backtest with no warm-up, or a thin test). `buildPriors` replaces them with pooled
 * rates from rows the caller passes in. The caller is responsible for passing ONLY rows from strictly before
 * the target (the backtest passes earlier seasons only), so a prior can never contain the answer.
 */

const { POSITIONS } = require("./constants");

const DEFAULT_RATES = Object.freeze({
  QB: {
    rush_yards_per_carry: 5.2,
    rush_td_per_carry: 0.04,
    catch_rate: 0.7,
    rec_yards_per_target: 6,
    rec_td_per_target: 0.03,
    completions_per_attempt: 0.645,
    pass_yards_per_attempt: 6.9,
    pass_td_per_attempt: 0.043,
    int_per_attempt: 0.025,
    fumbles_lost_per_touch: 0.008,
  },
  RB: {
    rush_yards_per_carry: 4.3,
    rush_td_per_carry: 0.036,
    catch_rate: 0.77,
    rec_yards_per_target: 5.9,
    rec_td_per_target: 0.03,
    completions_per_attempt: 0.5,
    pass_yards_per_attempt: 5,
    pass_td_per_attempt: 0.03,
    int_per_attempt: 0.03,
    fumbles_lost_per_touch: 0.006,
  },
  WR: {
    rush_yards_per_carry: 6,
    rush_td_per_carry: 0.03,
    catch_rate: 0.64,
    rec_yards_per_target: 8.2,
    rec_td_per_target: 0.05,
    completions_per_attempt: 0.5,
    pass_yards_per_attempt: 5,
    pass_td_per_attempt: 0.03,
    int_per_attempt: 0.03,
    fumbles_lost_per_touch: 0.005,
  },
  TE: {
    rush_yards_per_carry: 3,
    rush_td_per_carry: 0.03,
    catch_rate: 0.7,
    rec_yards_per_target: 7.3,
    rec_td_per_target: 0.052,
    completions_per_attempt: 0.5,
    pass_yards_per_attempt: 5,
    pass_td_per_attempt: 0.03,
    int_per_attempt: 0.03,
    fumbles_lost_per_touch: 0.004,
  },
});

const DEFAULT_VOLUME = Object.freeze({
  QB: { attempts: 31, carries: 3.8, targets: 0 },
  RB: { attempts: 0, carries: 9, targets: 2.8 },
  WR: { attempts: 0, carries: 0.3, targets: 4.6 },
  TE: { attempts: 0, carries: 0.02, targets: 3.4 },
});

// Red-zone share of a position's carries and targets (yardline_100 <= 20).
const DEFAULT_RED_ZONE = Object.freeze({
  QB: { carry_share: 0.12, target_share: 0.1 },
  RB: { carry_share: 0.13, target_share: 0.1 },
  WR: { carry_share: 0.1, target_share: 0.1 },
  TE: { carry_share: 0.1, target_share: 0.15 },
});

function defaultPriors() {
  const positions = {};
  for (const position of POSITIONS) {
    positions[position] = {
      volume: { ...DEFAULT_VOLUME[position] },
      debut_volume: { ...DEFAULT_VOLUME[position] },
      rates: { ...DEFAULT_RATES[position] },
      red_zone: { ...DEFAULT_RED_ZONE[position] },
      n_rows: 0,
    };
  }
  return { version: "default-judgment", league_implied_mean: 22.5, positions };
}

const DEFAULT_PRIORS = Object.freeze(defaultPriors());

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

// A pooled rate backed by fewer opportunities than this is not trusted over the default.
const MIN_OPPORTUNITIES = 200;

function pooled(sumNum, sumDen, fallback) {
  return sumDen >= MIN_OPPORTUNITIES ? sumNum / sumDen : fallback;
}

/**
 * @param {Array<{player_id:string, position:string, season:number, week:number, stats:object, opp?:object|null,
 *   implied_points?:number|null}>} rows normalized player-week rows, every one strictly before the target
 */
function buildPriors(rows) {
  const priors = defaultPriors();
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return priors;

  const minSeason = list.reduce((min, row) => Math.min(min, row.season), Infinity);
  const firstSeen = new Map();
  for (const row of list) {
    const key = row.player_id;
    const current = firstSeen.get(key);
    if (!current || row.season < current.season || (row.season === current.season && row.week < current.week)) {
      firstSeen.set(key, { season: row.season, week: row.week });
    }
  }

  let impliedSum = 0;
  let impliedN = 0;
  const acc = Object.fromEntries(
    POSITIONS.map((position) => [
      position,
      {
        rows: 0,
        att: 0,
        car: 0,
        tgt: 0,
        debutRows: 0,
        dAtt: 0,
        dCar: 0,
        dTgt: 0,
        rushYds: 0,
        rushTd: 0,
        rec: 0,
        recYds: 0,
        recTd: 0,
        cmp: 0,
        passYds: 0,
        passTd: 0,
        int: 0,
        fl: 0,
        rzCar: 0,
        rzCarDen: 0,
        rzTgt: 0,
        rzTgtDen: 0,
      },
    ]),
  );

  for (const row of list) {
    const a = acc[row.position];
    if (!a) continue;
    const s = row.stats || {};
    a.rows += 1;
    a.att += num(s.attempts);
    a.car += num(s.carries);
    a.tgt += num(s.targets);
    a.rushYds += num(s.rushing_yards);
    a.rushTd += num(s.rushing_tds);
    a.rec += num(s.receptions);
    a.recYds += num(s.receiving_yards);
    a.recTd += num(s.receiving_tds);
    a.cmp += num(s.completions);
    a.passYds += num(s.passing_yards);
    a.passTd += num(s.passing_tds);
    a.int += num(s.passing_interceptions);
    a.fl += num(s.fumbles_lost);
    if (row.opp) {
      a.rzCar += num(row.opp.red_zone_carries);
      a.rzCarDen += num(s.carries);
      a.rzTgt += num(row.opp.red_zone_targets);
      a.rzTgtDen += num(s.targets);
    }
    const first = firstSeen.get(row.player_id);
    if (first && row.season > minSeason && first.season === row.season && first.week === row.week) {
      a.debutRows += 1;
      a.dAtt += num(s.attempts);
      a.dCar += num(s.carries);
      a.dTgt += num(s.targets);
    }
    if (Number.isFinite(Number(row.implied_points))) {
      impliedSum += Number(row.implied_points);
      impliedN += 1;
    }
  }

  for (const position of POSITIONS) {
    const a = acc[position];
    const p = priors.positions[position];
    p.n_rows = a.rows;
    if (a.rows >= 50) {
      p.volume = { attempts: a.att / a.rows, carries: a.car / a.rows, targets: a.tgt / a.rows };
    }
    if (a.debutRows >= 30) {
      p.debut_volume = { attempts: a.dAtt / a.debutRows, carries: a.dCar / a.debutRows, targets: a.dTgt / a.debutRows };
    } else {
      p.debut_volume = { ...p.volume };
    }
    const r = p.rates;
    r.rush_yards_per_carry = pooled(a.rushYds, a.car, r.rush_yards_per_carry);
    r.rush_td_per_carry = pooled(a.rushTd, a.car, r.rush_td_per_carry);
    r.catch_rate = pooled(a.rec, a.tgt, r.catch_rate);
    r.rec_yards_per_target = pooled(a.recYds, a.tgt, r.rec_yards_per_target);
    r.rec_td_per_target = pooled(a.recTd, a.tgt, r.rec_td_per_target);
    r.completions_per_attempt = pooled(a.cmp, a.att, r.completions_per_attempt);
    r.pass_yards_per_attempt = pooled(a.passYds, a.att, r.pass_yards_per_attempt);
    r.pass_td_per_attempt = pooled(a.passTd, a.att, r.pass_td_per_attempt);
    r.int_per_attempt = pooled(a.int, a.att, r.int_per_attempt);
    r.fumbles_lost_per_touch = pooled(a.fl, a.car + a.tgt + a.att, r.fumbles_lost_per_touch);
    p.red_zone = {
      carry_share: a.rzCarDen >= MIN_OPPORTUNITIES ? a.rzCar / a.rzCarDen : p.red_zone.carry_share,
      target_share: a.rzTgtDen >= MIN_OPPORTUNITIES ? a.rzTgt / a.rzTgtDen : p.red_zone.target_share,
    };
  }

  priors.version = `trained:${list.length}-rows:through-season-${list.reduce((max, row) => Math.max(max, row.season), 0)}`;
  if (impliedN >= 100) priors.league_implied_mean = impliedSum / impliedN;
  return priors;
}

module.exports = { DEFAULT_PRIORS, MIN_OPPORTUNITIES, buildPriors, defaultPriors };
