"use strict";

/**
 * Every team's roster for a league, in the one shape Trade and the League overview share.
 *
 * `GET /api/trade/roster` used to carry three private normalizers. They live here now so the League
 * overview's "trade targets" section can reuse the exact same reads and the exact same cache
 * (`tradeFindCache`, keyed per user, 15 minutes) instead of inventing a second path to the provider.
 *
 * Nothing in this module calls a provider: the normalizers are pure and the warm step takes its
 * fetchers as arguments. The caller decides whether a provider call is allowed on its path.
 */

/** The cache key `src/routes/trade.js` uses for the same bundle. Keep the two identical. */
function bundleCacheKey({ userId, platform, leagueId, week }) {
  return `${userId}:${platform}:${leagueId}:${week}`;
}

function positionsOf(source) {
  return Array.isArray(source?.roster_positions) ? source.roster_positions : [];
}

/**
 * Where the league's starting slots came from. `provider_settings` means the provider returned them;
 * `null` means the list is empty and any consumer that needs slots must say so rather than borrow
 * the user's own lineup without telling anyone.
 */
function positionsSource(source) {
  return positionsOf(source).length ? "provider_settings" : null;
}

function normalizeSleeperRosters(leagueRosters, week) {
  const status = String(leagueRosters?.league_status || "").toLowerCase();
  if (status === "pre_draft" || status === "drafting") {
    return { status: "unavailable", reason: "league_not_active" };
  }
  const teams = (Array.isArray(leagueRosters?.teams) ? leagueRosters.teams : []).map((team) => ({
    team_id: String(team?.roster_id || ""),
    team_name: team?.team_name || null,
    players: Array.isArray(team?.players) ? team.players : [],
  }));
  return {
    status: "ok",
    week,
    roster_positions: positionsOf(leagueRosters),
    roster_positions_source: positionsSource(leagueRosters),
    teams,
  };
}

function normalizeEspnRosters(rosters, week) {
  const teams = (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => ({
    team_id: String(team?.team_id || ""),
    team_name: team?.team_name || null,
    players: Array.isArray(team?.players) ? team.players : [],
  }));
  return {
    status: "ok",
    week,
    roster_positions: positionsOf(rosters),
    roster_positions_source: positionsSource(rosters),
    teams,
  };
}

function normalizeYahooRosters(rosters, week) {
  const teams = (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => {
    const normalized = {
      team_id: team?.team_id ? String(team.team_id) : "",
      team_name: team?.team_name || null,
      players: Array.isArray(team?.players) ? team.players : [],
    };
    // G8: a per-team read that failed is flagged, never passed off as a team with no players.
    if (team?.read_failed) {
      normalized.read_failed = true;
      normalized.read_failed_reason = team.read_failed_reason || "provider_error";
    }
    return normalized;
  });
  return {
    status: "ok",
    week: rosters?.week || week,
    roster_positions: positionsOf(rosters),
    roster_positions_source: positionsSource(rosters),
    teams,
  };
}

/** Teams whose roster read failed, as `[{team_id, team_name, reason}]`. */
function failedTeams(teams) {
  return (Array.isArray(teams) ? teams : [])
    .filter((team) => team?.read_failed)
    .map((team) => ({
      team_id: team.team_id ?? null,
      team_name: team.team_name ?? null,
      reason: team.read_failed_reason || "provider_error",
    }));
}

module.exports = {
  bundleCacheKey,
  failedTeams,
  normalizeEspnRosters,
  normalizeSleeperRosters,
  normalizeYahooRosters,
};
