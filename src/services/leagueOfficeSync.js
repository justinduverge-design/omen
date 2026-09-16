"use strict";

const espnAdapter = require("../adapters/espn");

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function teamId(side) {
  const source = side?.team || side;
  const id = source?.teamId ?? source?.id ?? source?.team_id;
  return id == null ? null : String(id);
}

function teamNameMap(data) {
  const map = new Map();
  for (const team of Array.isArray(data?.teams) ? data.teams : []) {
    const id = teamId(team);
    if (!id) continue;
    const location = String(team?.location || "").trim();
    const nickname = String(team?.nickname || "").trim();
    const name = String(team?.name || team?.teamName || [location, nickname].filter(Boolean).join(" ")).trim();
    map.set(id, name || null);
  }
  return map;
}

function ownerNameMap(data) {
  const members = new Map(
    (Array.isArray(data?.members) ? data.members : [])
      .map((member) => [String(member?.id || ""), member?.displayName || member?.firstName || null])
      .filter(([id]) => id)
  );
  const map = new Map();
  for (const team of Array.isArray(data?.teams) ? data.teams : []) {
    const id = teamId(team);
    if (!id) continue;
    const owners = Array.isArray(team?.owners) ? team.owners : [];
    const names = owners.map((ownerId) => members.get(String(ownerId))).filter(Boolean);
    map.set(id, names.join(" / ") || null);
  }
  return map;
}

function sideProjected(side) {
  return finiteOrNull(
    side?.totalProjectedPoints
      ?? side?.team?.totalProjectedPoints
      ?? side?.totalProjectedPointsLive
      ?? side?.team?.totalProjectedPointsLive
  );
}

function sidePoints(side) {
  return finiteOrNull(
    side?.totalPoints
      ?? side?.points
      ?? side?.team?.totalPoints
      ?? side?.team?.points
  );
}

function normalizeEspnWeekMatchups(data, { leagueId, season, week } = {}) {
  const names = teamNameMap(data);
  const owners = ownerNameMap(data);
  const games = Array.isArray(data?.schedule) ? data.schedule : [];
  const targetWeek = Number(week);

  return games.flatMap((game) => {
    const period = Number(game?.matchupPeriodId ?? game?.scoringPeriodId);
    if (Number.isFinite(targetWeek) && period !== targetWeek) return [];

    const home = game?.home;
    const away = game?.away;
    const homeId = teamId(home);
    const awayId = teamId(away);
    if (!homeId || !awayId) return [];

    const winner = String(game?.winner || "").toUpperCase();
    const winnerTeamId = winner === "HOME" ? homeId : winner === "AWAY" ? awayId : null;
    const homeScore = sidePoints(home);
    const awayScore = sidePoints(away);
    const status = winnerTeamId
      ? "final"
      : ((homeScore ?? 0) === 0 && (awayScore ?? 0) === 0 ? "pregame" : "live");

    return [{
      platform: "espn",
      league_id: String(leagueId),
      season: Number(season),
      week: targetWeek,
      game_id: game?.id ? String(game.id) : `${leagueId}:${targetWeek}:${homeId}:${awayId}`,
      home_team_id: homeId,
      home_team_name: names.get(homeId) || null,
      home_owner_name: owners.get(homeId) || null,
      home_score: homeScore,
      home_projected: sideProjected(home),
      away_team_id: awayId,
      away_team_name: names.get(awayId) || null,
      away_owner_name: owners.get(awayId) || null,
      away_score: awayScore,
      away_projected: sideProjected(away),
      status,
      winner_team_id: winnerTeamId,
      source_verified: true,
      synced_at: new Date().toISOString(),
    }];
  });
}

async function fetchEspnWeekMatchups(leagueId, espn_s2, swid, { season, week } = {}) {
  const data = await espnAdapter.fetchEspnApi(
    leagueId,
    espn_s2,
    swid,
    ["mTeam", "mMatchup", "mMatchupScore"],
    Number(week),
    { seasonId: Number(season) }
  );
  return normalizeEspnWeekMatchups(data, { leagueId, season, week });
}

module.exports = {
  normalizeEspnWeekMatchups,
  fetchEspnWeekMatchups,
};
