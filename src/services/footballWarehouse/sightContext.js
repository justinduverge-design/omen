"use strict";

// Game context for Sight v2, shared by the fitting script and the daily run so both compute it identically.
// For a player through week W, about the game he plays in week W+1:
//   implied   his team's implied points from the Vegas total and spread (nflverse: positive spread = home favored)
//   oppAllowed PPR points per game that opponent has allowed to his position through week W
// A missing piece (no line yet, bye, no team) is null, and Sight treats null as neutral.

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;

/** Bad weather for football: outdoors and cold (< 40F), windy (>= 15 mph) or wet (>= 0.1 in). Null when unknown. */
function isBadWeather({ dome, wind, temp, precip }) {
  if (dome) return false;
  if (wind == null && temp == null && precip == null) return null;
  return (temp != null && temp < 40) || (wind != null && wind >= 15) || (precip != null && precip >= 0.1);
}

const ELEMENTS_SHRINK = 150; // plays: a team with few bad-weather snaps is pulled toward no gap

/**
 * Each offense's elements gap from prior seasons' plays: EPA per play in bad-weather games minus elsewhere,
 * shrunk toward zero by the bad-weather sample. playRows: [{ posteamId, gameId, epa }]; badGame: game_id -> bool.
 */
function elementsGaps(playRows, badGame) {
  const t = new Map();
  for (const p of playRows) {
    const bad = badGame.get(p.gameId);
    const epa = p.epa == null ? null : Number(p.epa);
    if (bad == null || epa == null || !Number.isFinite(epa) || !p.posteamId) continue;
    const r = t.get(p.posteamId) || { badSum: 0, badN: 0, goodSum: 0, goodN: 0 };
    if (bad) {
      r.badSum += epa;
      r.badN += 1;
    } else {
      r.goodSum += epa;
      r.goodN += 1;
    }
    t.set(p.posteamId, r);
  }
  const out = new Map();
  for (const [team, r] of t) {
    if (!r.badN || !r.goodN) continue;
    const gap = r.badSum / r.badN - r.goodSum / r.goodN;
    out.set(team, gap * (r.badN / (r.badN + ELEMENTS_SHRINK)));
  }
  return out;
}

/** Per-season context: a player's team by week, each team's next game, and points allowed by position. */
function buildContext(statRows, gameRows, elementsGap = null) {
  const teamByWeek = new Map(); // player -> [[week, team]]
  const allowed = new Map(); // `${opp}|${pos}` -> Map(week -> points)
  for (const r of statRows) {
    if (!teamByWeek.has(r.player_id)) teamByWeek.set(r.player_id, []);
    if (r.team_id) teamByWeek.get(r.player_id).push([r.week, r.team_id]);
    const pos = r.football_position === "FB" ? "RB" : r.football_position;
    if (r.opponent_team_id && pos) {
      const key = `${r.opponent_team_id}|${pos}`;
      if (!allowed.has(key)) allowed.set(key, new Map());
      const byWeek = allowed.get(key);
      byWeek.set(r.week, (byWeek.get(r.week) || 0) + Number(r.fantasy_points_ppr || 0));
    }
  }
  // A team's home climate: warm if it plays home games in a dome or south of about 34 degrees N (Miami,
  // Tampa, Jacksonville, Houston, the LA and Arizona teams). Cold for a warm team is a different event.
  const warmTeam = new Map();
  for (const g of gameRows) {
    if (g.home_lat == null && g.home_roof == null) continue;
    const warm = g.home_roof === "dome" || g.home_roof === "closed" || (g.home_lat != null && Number(g.home_lat) < 34);
    warmTeam.set(g.home_team_id, warm);
  }
  const game = new Map(); // `${week}|${team}` -> { opp, implied, wind, cold, dome }
  for (const g of gameRows) {
    // Weather: indoor games have none. Wind and cold matter for passing and kicking; null means unknown.
    const dome = g.roof === "dome" || g.roof === "closed";
    const wind = dome ? 0 : g.wind_mph == null ? null : Number(g.wind_mph);
    const temp = dome ? 70 : g.temperature_f == null ? null : Number(g.temperature_f);
    const cold = temp == null ? null : Math.max(0, 40 - temp);
    const total = g.total_line == null ? null : Number(g.total_line);
    const spread = g.spread_line == null ? null : Number(g.spread_line); // nflverse: positive = home favored
    const home = total != null && spread != null ? total / 2 + spread / 2 : null;
    const away = total != null && spread != null ? total / 2 - spread / 2 : null;
    const coldFor = (team) => (cold == null ? null : cold * (warmTeam.get(team) ? 1 : 0));
    const precip = dome ? 0 : g.precip_in == null ? null : Number(g.precip_in);
    const bad = isBadWeather({ dome, wind, temp, precip });
    game.set(`${g.week}|${g.home_team_id}`, {
      opp: g.away_team_id,
      implied: home,
      wind,
      cold,
      precip,
      bad,
      coldForWarmTeam: coldFor(g.home_team_id),
    });
    game.set(`${g.week}|${g.away_team_id}`, {
      opp: g.home_team_id,
      implied: away,
      wind,
      cold,
      precip,
      bad,
      coldForWarmTeam: coldFor(g.away_team_id),
    });
  }
  return {
    contextFor(playerId, position, week) {
      const stints = (teamByWeek.get(playerId) || []).filter(([w]) => w <= week).sort((a, b) => b[0] - a[0]);
      const team = stints[0]?.[1];
      if (!team) return null;
      const next = game.get(`${week + 1}|${team}`);
      if (!next) return null;
      const byWeek = allowed.get(`${next.opp}|${position}`);
      const weeks = byWeek ? [...byWeek].filter(([w]) => w <= week) : [];
      return {
        implied: next.implied,
        oppAllowed: weeks.length ? mean(weeks.map(([, v]) => v)) : null,
        wind: next.wind ?? null,
        cold: next.cold ?? null,
        precip: next.precip ?? null,
        coldForWarmTeam: next.coldForWarmTeam ?? null,
        // The team's elements gap (how much worse its offense plays in bad weather), applied only when the next
        // game is in bad weather; 0 in a dome or mild game, null when the weather is unknown.
        elements: next.bad == null ? null : next.bad ? (elementsGap?.get(team) ?? 0) : 0,
      };
    },
  };
}

module.exports = { buildContext, elementsGaps, isBadWeather };

// --- Role changes: usage trend and vacated opportunity -------------------------------------------------------

const OUT_STATUSES = new Set(["RES", "INA", "CUT", "TRD", "RET", "EXE", "TRT"]);

/** The share that drives each position's role: QB dropbacks, RB carries, WR/TE targets. */
function roleShare(position, a) {
  if (!a) return null;
  if (position === "QB") return a.teamDropbacks > 0 ? a.dropbacks / a.teamDropbacks : null;
  if (position === "RB")
    return a.teamRushAttempts > 0 ? (a.carries + a.targets) / (a.teamRushAttempts + a.teamPassAttempts) : null;
  return a.teamPassAttempts > 0 ? a.targets / a.teamPassAttempts : null;
}

/**
 * Role context for one player through week W.
 *   usage_trend     role share over the last three weeks minus the season-to-date share
 *   vacated_share   season target+carry share of teammates who are out for week W+1 (roster status), summed
 * seasonAgg / recentAgg: aggregateSkillPlays over weeks <= W and over W-2..W.
 * statusNext: Map(player id -> roster status in week W+1); teamOf: player id -> team id through W.
 */
function buildRoleContext({ seasonAgg, recentAgg, positions, statusNext, teamOf }) {
  const byTeam = new Map(); // team -> [{ id, share }]
  for (const [id, a] of seasonAgg) {
    const team = teamOf(id);
    if (!team) continue;
    const total = a.teamPassAttempts + a.teamRushAttempts;
    const share = total > 0 ? (a.targets + a.carries) / total : 0;
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team).push({ id, share });
  }
  return (id, position) => {
    const season = roleShare(position, seasonAgg.get(id));
    const recent = roleShare(position, recentAgg.get(id));
    const team = teamOf(id);
    let vacated = null;
    if (team && statusNext.size) {
      vacated = 0;
      for (const mate of byTeam.get(team) || []) {
        if (mate.id !== id && OUT_STATUSES.has(statusNext.get(mate.id))) vacated += mate.share;
      }
    }
    return { usageTrend: season != null && recent != null ? recent - season : null, vacated };
  };
}

module.exports.buildRoleContext = buildRoleContext;
module.exports.OUT_STATUSES = OUT_STATUSES;
