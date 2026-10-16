"use strict";

// Game context for Sight v2, shared by the fitting script and the daily run so both compute it identically.
// For a player through week W, about the game he plays in week W+1:
//   implied   his team's implied points from the Vegas total and spread (nflverse: positive spread = home favored)
//   oppAllowed PPR points per game that opponent has allowed to his position through week W
// A missing piece (no line yet, bye, no team) is null, and Sight treats null as neutral.

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;

/** Per-season context: a player's team by week, each team's next game, and points allowed by position. */
function buildContext(statRows, gameRows) {
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
  const game = new Map(); // `${week}|${team}` -> { opp, implied }
  for (const g of gameRows) {
    const total = g.total_line == null ? null : Number(g.total_line);
    const spread = g.spread_line == null ? null : Number(g.spread_line); // nflverse: positive = home favored
    const home = total != null && spread != null ? total / 2 + spread / 2 : null;
    const away = total != null && spread != null ? total / 2 - spread / 2 : null;
    game.set(`${g.week}|${g.home_team_id}`, { opp: g.away_team_id, implied: home });
    game.set(`${g.week}|${g.away_team_id}`, { opp: g.home_team_id, implied: away });
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
      return { implied: next.implied, oppAllowed: weeks.length ? mean(weeks.map(([, v]) => v)) : null };
    },
  };
}


module.exports = { buildContext };
