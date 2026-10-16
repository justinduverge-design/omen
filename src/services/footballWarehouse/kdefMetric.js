"use strict";

// Kickers and team defenses for Sight. Pure math (no database, no clock).
//
// nflverse's weekly fantasy points do not cover kicking or team defense, so Omen scores both itself from
// play-by-play with standard league scoring, then builds season-to-date features the same way the skill
// ratings do. Kickers are players; defenses are teams.
//
// Kicker:  FG 0-39 = 3, 40-49 = 4, 50+ = 5, missed or blocked FG = -1, made extra point = 1.
// Defense: sack 1, interception 2, fumble recovery 2, defensive or return TD 6, safety 2, plus points
//          allowed: 0 -> 10, 1-6 -> 7, 7-13 -> 4, 14-20 -> 1, 21-27 -> 0, 28-34 -> -1, 35+ -> -4.

const flag = (v) => v === true || (v != null && v !== "" && v !== false && Number(v) === 1);
const num = (v) => { if (v == null || v === "" || v === "NA") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const teamIdFromAbbr = (abbr) => (abbr ? `omen:team:${String(abbr).toLowerCase()}` : null);

function fgPoints(distance) {
  if (distance == null) return 3;
  if (distance >= 50) return 5;
  if (distance >= 40) return 4;
  return 3;
}

function pointsAllowedTier(points) {
  if (points == null) return 0;
  if (points === 0) return 10;
  if (points <= 6) return 7;
  if (points <= 13) return 4;
  if (points <= 20) return 1;
  if (points <= 27) return 0;
  if (points <= 34) return -1;
  return -4;
}

const blankK = () => ({ fp: 0, fga: 0, fgm: 0, fga50: 0, xpa: 0, xpm: 0, buckets: [] });
const blankD = () => ({ fp: 0, sacks: 0, ints: 0, fumbleRecoveries: 0, tds: 0, safeties: 0, oppDropbacks: 0, oppPlays: 0, epaAllowed: 0, pointsAllowed: null, played: false });

/**
 * Week-by-week kicker and defense lines for one season.
 * plays: [{ week, gameId, posteamId, defteamId, epa, kickerGsis, fieldGoalAttempt, fieldGoalResult, kickDistance,
 *           extraPointAttempt, extraPointResult, sack, interception, fumbleLost, fumbleRecoveryTeam, returnTouchdown,
 *           touchdown, tdTeam, safety, qbDropback, playType }]
 * games: [{ week, homeTeamId, awayTeamId, homeScore, awayScore }]
 * kickerByGsis: Map(gsis -> omen player id)
 */
function weeklyLines(plays, games, kickerByGsis) {
  const kickers = new Map(); // id -> Map(week -> line)
  const defenses = new Map(); // team -> Map(week -> line)
  const k = (id, week) => { if (!kickers.has(id)) kickers.set(id, new Map()); const m = kickers.get(id); if (!m.has(week)) m.set(week, blankK()); return m.get(week); };
  const d = (team, week) => { if (!defenses.has(team)) defenses.set(team, new Map()); const m = defenses.get(team); if (!m.has(week)) m.set(week, blankD()); return m.get(week); };

  for (const p of plays) {
    const week = Number(p.week);
    const kicker = p.kickerGsis ? kickerByGsis.get(p.kickerGsis) : null;
    if (kicker && flag(p.fieldGoalAttempt)) {
      const line = k(kicker, week);
      const dist = num(p.kickDistance);
      line.fga += 1;
      if (dist != null && dist >= 50) line.fga50 += 1;
      const made = p.fieldGoalResult === "made";
      if (made) { line.fgm += 1; line.fp += fgPoints(dist); } else line.fp -= 1;
      line.buckets.push({ dist, made });
    }
    if (kicker && flag(p.extraPointAttempt)) {
      const line = k(kicker, week);
      line.xpa += 1;
      if (p.extraPointResult === "good") { line.xpm += 1; line.fp += 1; }
    }
    const def = p.defteamId;
    if (!def) continue;
    const line = d(def, week);
    line.played = true;
    const defAbbrTeam = (abbr) => teamIdFromAbbr(abbr) === def;
    if (flag(p.qbDropback)) line.oppDropbacks += 1;
    if (p.playType === "pass" || p.playType === "run") {
      line.oppPlays += 1;
      const epa = num(p.epa);
      if (epa != null) line.epaAllowed += epa;
    }
    if (flag(p.sack)) { line.sacks += 1; line.fp += 1; }
    if (flag(p.interception)) { line.ints += 1; line.fp += 2; }
    if (flag(p.fumbleLost) && defAbbrTeam(p.fumbleRecoveryTeam)) { line.fumbleRecoveries += 1; line.fp += 2; }
    if (flag(p.touchdown) && defAbbrTeam(p.tdTeam)) { line.tds += 1; line.fp += 6; }
    if (flag(p.safety)) { line.safeties += 1; line.fp += 2; }
  }

  for (const g of games) {
    if (g.homeScore == null || g.awayScore == null) continue;
    for (const [team, allowed] of [[g.homeTeamId, Number(g.awayScore)], [g.awayTeamId, Number(g.homeScore)]]) {
      const line = d(team, Number(g.week));
      line.played = true;
      line.pointsAllowed = allowed;
      line.fp += pointsAllowedTier(allowed);
    }
  }
  return { kickers, defenses };
}

const rate = (sum, n) => ({ raw: n > 0 ? sum / n : null, n, sum });

/** League field-goal make rate by 10-yard bucket, from every kick through `week` (the expected-make baseline). */
function makeRates(kickers, week) {
  const b = new Map();
  for (const weeks of kickers.values()) for (const [w, line] of weeks) {
    if (w > week) continue;
    for (const kick of line.buckets) {
      const key = kick.dist == null ? 30 : Math.min(60, Math.floor(kick.dist / 10) * 10);
      const r = b.get(key) || { made: 0, n: 0 };
      r.n += 1; if (kick.made) r.made += 1;
      b.set(key, r);
    }
  }
  return (dist) => { const key = dist == null ? 30 : Math.min(60, Math.floor(dist / 10) * 10); const r = b.get(key); return r && r.n ? r.made / r.n : 0.85; };
}

/** Season-to-date aggregates through `week`: Map(id -> { games, ...sums }) for kickers and defenses. */
function toDate(lines, week) {
  const kRates = makeRates(lines.kickers, week);
  const kickers = new Map();
  for (const [id, weeks] of lines.kickers) {
    const a = { games: 0, fp: 0, fga: 0, fgm: 0, fga50: 0, xpa: 0, expectedMade: 0 };
    for (const [w, line] of weeks) {
      if (w > week) continue;
      a.games += 1; a.fp += line.fp; a.fga += line.fga; a.fgm += line.fgm; a.fga50 += line.fga50; a.xpa += line.xpa;
      for (const kick of line.buckets) a.expectedMade += kRates(kick.dist);
    }
    if (a.games) kickers.set(id, a);
  }
  const defenses = new Map();
  for (const [team, weeks] of lines.defenses) {
    const a = { games: 0, fp: 0, sacks: 0, takeaways: 0, tds: 0, oppDropbacks: 0, oppPlays: 0, epaAllowed: 0, pointsAllowed: 0 };
    for (const [w, line] of weeks) {
      if (w > week || line.pointsAllowed == null) continue;
      a.games += 1; a.fp += line.fp; a.sacks += line.sacks; a.takeaways += line.ints + line.fumbleRecoveries; a.tds += line.tds;
      a.oppDropbacks += line.oppDropbacks; a.oppPlays += line.oppPlays; a.epaAllowed += line.epaAllowed; a.pointsAllowed += line.pointsAllowed;
    }
    if (a.games) defenses.set(team, a);
  }
  return { kickers, defenses };
}

const SPECS = Object.freeze({
  K: {
    position: "K", entityType: "player",
    qualifies: (a, week) => a.fga + a.xpa >= Math.max(4, Math.round(week * 2)),
    components: [
      { key: "fg_attempts_per_game", sign: 1, shrinkK: 3 },
      { key: "long_attempt_share", sign: 1, shrinkK: 10 },
      { key: "accuracy_over_expected", sign: 1, shrinkK: 15 },
      { key: "xp_attempts_per_game", sign: 1, shrinkK: 3 },
    ],
    raw: (a) => ({
      fg_attempts_per_game: rate(a.fga, a.games),
      long_attempt_share: rate(a.fga50, a.fga),
      accuracy_over_expected: rate(a.fgm - a.expectedMade, a.fga),
      xp_attempts_per_game: rate(a.xpa, a.games),
    }),
    production: (a) => a.fp / a.games,
  },
  DEF: {
    position: "DEF", entityType: "team",
    qualifies: (a) => a.games >= 2,
    components: [
      { key: "sack_rate", sign: 1, shrinkK: 150 },
      { key: "takeaway_rate", sign: 1, shrinkK: 300 },
      { key: "epa_allowed_per_play", sign: -1, shrinkK: 200 },
      { key: "points_allowed_per_game", sign: -1, shrinkK: 3 },
      { key: "defensive_td_per_game", sign: 1, shrinkK: 6 },
    ],
    raw: (a) => ({
      sack_rate: rate(a.sacks, a.oppDropbacks),
      takeaway_rate: rate(a.takeaways, a.oppPlays),
      epa_allowed_per_play: rate(a.epaAllowed, a.oppPlays),
      points_allowed_per_game: rate(a.pointsAllowed, a.games),
      defensive_td_per_game: rate(a.tds, a.games),
    }),
    production: (a) => a.fp / a.games,
  },
});

module.exports = { SPECS, weeklyLines, toDate, fgPoints, pointsAllowedTier, teamIdFromAbbr };

// --- Sight for kickers and defenses (v2 only: they always use game context) ---

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };
const r4 = (x) => Math.round(x * 1e4) / 1e4;

/** Next game per (week, team): opponent, own implied total and opponent implied total. */
function nextGames(gameRows) {
  const m = new Map();
  for (const g of gameRows) {
    const total = g.total_line == null ? null : Number(g.total_line);
    const spread = g.spread_line == null ? null : Number(g.spread_line);
    const home = total != null && spread != null ? total / 2 + spread / 2 : null;
    const away = total != null && spread != null ? total / 2 - spread / 2 : null;
    m.set(`${g.week}|${g.home_team_id}`, { opp: g.away_team_id, own: home, oppImplied: away });
    m.set(`${g.week}|${g.away_team_id}`, { opp: g.home_team_id, own: away, oppImplied: home });
  }
  return m;
}

/**
 * Sight values for K (entity player) and DEF (entity team) through `week`, with the fitted v2 weights.
 * `weightsFor(season, position, phase, "v2")` comes from sightV1 so every position shares one weights file.
 */
function computeKdefSight({ season, week, lines, gameRows, kickerTeamByWeek, weightsFor, phase }) {
  const td = toDate(lines, week);
  const next = nextGames(gameRows);
  const values = [];
  const summary = {};
  for (const position of ["K", "DEF"]) {
    const spec = SPECS[position];
    const w = weightsFor(season, position, phase, "v2");
    const pool = position === "K" ? td.kickers : td.defenses;
    const ids = [...pool.keys()].filter((id) => spec.qualifies(pool.get(id), week)).sort();
    if (!w || ids.length < 8) { summary[position] = { graded: 0, reason: w ? "cohort_too_small" : "no_weights" }; continue; }
    const raws = ids.map((id) => spec.raw(pool.get(id)));
    const features = {};
    for (const c of spec.components) {
      const totalN = raws.reduce((s, r) => s + r[c.key].n, 0);
      const prior = totalN > 0 ? raws.reduce((s, r) => s + r[c.key].sum, 0) / totalN : 0;
      const shrunk = raws.map((r) => (r[c.key].raw == null || r[c.key].n === 0 ? prior : (r[c.key].n * r[c.key].raw + c.shrinkK * prior) / (r[c.key].n + c.shrinkK)));
      const m = mean(shrunk); const s = sd(shrunk);
      features[c.key] = shrunk.map((v) => (s > 1e-9 ? c.sign * (v - m) / s : 0));
    }
    const prod = ids.map((id) => spec.production(pool.get(id)));
    const pm = mean(prod); const ps = sd(prod);
    features.production_ppg = prod.map((v) => (ps > 1e-9 ? (v - pm) / ps : 0));
    const ctxKey = position === "K" ? "implied_team_total" : "opponent_implied_total";
    const ctx = ids.map((id) => {
      const team = position === "K" ? kickerTeamByWeek(id, week) : id;
      const g = team ? next.get(`${week + 1}|${team}`) : null;
      return g ? (position === "K" ? g.own : g.oppImplied) : null;
    });
    const cv = ctx.filter((v) => v != null); const cm = cv.length ? mean(cv) : 0; const cs = cv.length ? sd(cv) : 0;
    features[ctxKey] = ctx.map((v) => (v == null || cs <= 1e-9 ? 0 : (v - cm) / cs));
    const points = ids.map((_, i) => w.intercept + Object.entries(w.weights).reduce((s, [k, b]) => s + b * (features[k]?.[i] ?? 0), 0));
    const m = mean(points); const s = sd(points);
    ids.forEach((id, i) => {
      values.push({
        entityType: spec.entityType,
        entityId: id,
        value: r4(points[i]),
        components: {
          metric: "SIGHT", version: "v2", position, phase,
          grade: r4(Math.min(100, Math.max(0, 50 + 10 * (s > 1e-9 ? (points[i] - m) / s : 0)))),
          sight_points: r4(points[i]), production_ppg: r4(prod[i]), intercept: w.intercept,
          weights_season: w.season, weights_fitted_on: w.fitted_on,
          // Kicker weeks are close to random; Sight says so instead of implying precision.
          confidence: position === "K" ? "low" : "normal",
          contributions: Object.fromEntries(Object.entries(w.weights).map(([k, b]) => [k, { weight: b, z: r4(features[k]?.[i] ?? 0), points: r4(b * (features[k]?.[i] ?? 0)) }])),
        },
      });
    });
    summary[position] = { graded: ids.length, weights_season: w.season };
  }
  return { values, summary };
}

module.exports.computeKdefSight = computeKdefSight;
module.exports.nextGames = nextGames;
