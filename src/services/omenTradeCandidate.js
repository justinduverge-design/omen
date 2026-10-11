"use strict";

/**
 * The Omen call's trade candidate, for every provider that can support one.
 *
 * Sleeper was the only provider with a trade candidate: its public league read returns every
 * roster with projections. ESPN and Yahoo reads exist for the Trade screens
 * (`GET /api/trade/roster`: `fetchEspnLeagueRosters`, `fetchYahooLeagueRosters`) but the Omen call
 * never used them. This module is the one place that decides, per provider, whether a trade can be
 * weighed and says why not when it cannot.
 *
 * Honesty rules:
 *   - A candidate needs a projection for every player it moves. Yahoo publishes none, so Yahoo
 *     rosters carry projections only when `yahooProjections.js` could build them (Sleeper's public
 *     stat line scored with the league's own rules). When it could not (scoring unreadable, no id
 *     match, timeout), the league gets an explicit `projections_unavailable` result and no
 *     provider call is made. It never gets a guessed trade.
 *   - The league's starting-slot layout comes from the user's own roster (the starter slots as the
 *     provider reports them). ESPN and Yahoo league reads do not return `roster_positions`, and a
 *     lineup solve with no slots scores every lineup at zero.
 *   - Display names the provider omitted (ESPN falls back to the numeric id) are filled from the
 *     warehouse identity crosswalk (PR #611). The crosswalk supplies identity only, never a
 *     projection, so it cannot change which trade is chosen.
 *
 * The result is `{ status, reason, teams_checked, candidate }`:
 *   status "candidate"   a trade cleared both lineups and the fairness guard
 *   status "none_found"  rosters were read and searched; nothing cleared
 *   status "unavailable" the trade could not be weighed; `reason` is a stable code
 */

const { findTradeCandidate, createSearchBudget } = require("./tradeLineup");
const { compareTrade } = require("./tradeValue");
const { normalizePosition } = require("./playerSearch");

// A weekly-lineup gain may justify only a bounded loss in season-long VORP (same policy the
// Sleeper path has always used).
const MAX_VORP_LOSS_PER_WEEKLY_POINT = 1;

// The extra league-wide read must never hold the Omen call. If it does not finish in time the call
// reports "timed out" as the reason; it does not wait.
const TRADE_READ_BUDGET_MS = 1500;
// The lineup search runs on the event loop, so the Omen call caps it well under the 2 s the Trade
// screens allow (a 16-team league with deep rosters measured 203 ms).
const TRADE_SEARCH_BUDGET_MS = 1200;

const UNAVAILABLE_COPY = Object.freeze({
  projections_unavailable: (label) => `${label} does not give Omen weekly projections, so a trade cannot be weighed.`,
  rosters_unreadable: (label) => `Omen could not read the other ${label} rosters in this league.`,
  league_not_active: () => "This league has not finished drafting, so there are no rosters to trade from.",
  own_team_not_found: (label) => `Omen could not find your team in the ${label} league rosters.`,
  no_starting_slots: () => "Omen could not read this league's starting lineup slots.",
  reauth_required: (label) => `${label} needs to be reconnected before Omen can read the other rosters.`,
  search_budget_exceeded: () => "The trade search ran out of time, so Omen is not guessing at one.",
  timed_out: (label) => `${label} did not return the other rosters in time.`,
  provider_error: (label) => `${label} did not return the other rosters.`,
});

function unavailableMessage(reason, label) {
  const copy = UNAVAILABLE_COPY[reason] || UNAVAILABLE_COPY.provider_error;
  return copy(label);
}

function finiteProjection(player) {
  const raw = player?.projected_points;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function rosterPlayers(roster) {
  return [
    ...(Array.isArray(roster?.slots?.starters) ? roster.slots.starters : []),
    ...(Array.isArray(roster?.slots?.bench) ? roster.slots.bench : []),
  ];
}

/** How many of the user's own players carry a real (possibly zero) projection. */
function projectionCoverage(roster) {
  const players = rosterPlayers(roster);
  const withProjection = players.filter((player) => finiteProjection(player) !== null).length;
  return { total: players.length, with_projection: withProjection };
}

/**
 * Starting slots as the provider reports them for the user's own lineup. Unknown slots ("UNK",
 * the provider's IDP and specialist slots) are dropped: a slot Omen cannot name cannot be filled
 * by a name it recognises, and every team in the league is solved against the same list.
 */
function rosterPositionsFromRoster(roster) {
  const starters = Array.isArray(roster?.slots?.starters) ? roster.slots.starters : [];
  return starters
    .map((player) => String(player?.selected_position || player?.position || "").toUpperCase())
    .filter((slot) => slot && slot !== "UNK");
}

function looksLikeMissingName(name) {
  const text = String(name ?? "").trim();
  return !text || text === "Unknown" || /^\d+$/.test(text);
}

async function fillDisplayNames(players, { getRuntime, logger } = {}) {
  const wanted = players.filter((player) => looksLikeMissingName(player?.name) && /^(espn|yahoo|sleeper):/.test(String(player?.player_key || "")));
  if (!wanted.length) return players;
  let runtime = null;
  try { runtime = typeof getRuntime === "function" ? getRuntime() : null; } catch { runtime = null; }
  if (!runtime?.enabled || !runtime.identityRepository || runtime.mode === "supabase") return players;
  try {
    const keys = wanted.map((player) => {
      const [provider, providerId] = String(player.player_key).split(":");
      return { provider, providerId };
    });
    const found = await runtime.identityRepository.readPlayersByProviderIds({ keys });
    return players.map((player) => {
      if (!wanted.includes(player)) return player;
      const hit = found?.get?.(String(player.player_key));
      if (!hit?.name) return player;
      const position = normalizePosition(hit.position) || player.position;
      return { ...player, name: hit.name, position, team: player.team || hit.team || null };
    });
  } catch {
    try { logger?.info?.("Omen trade identity fallback unavailable", { event: "omen_trade_identity", outcome: "unavailable" }); } catch { /* never throws */ }
    return players;
  }
}

function leagueTeamsFromEspn(rosters) {
  return (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => ({
    team_id: String(team?.team_id || ""),
    team_name: team?.team_name || null,
    players: Array.isArray(team?.players) ? team.players : [],
  }));
}

async function readSleeper({ connection, roster, adapters }) {
  const leagueRosters = await adapters.sleeper.fetchSleeperLeagueRosters(
    connection.league_id,
    roster.week,
    String(new Date().getFullYear())
  );
  const status = String(leagueRosters?.league_status || "").toLowerCase();
  if (status === "pre_draft" || status === "drafting") return { unavailable: "league_not_active" };
  const teams = (Array.isArray(leagueRosters?.teams) ? leagueRosters.teams : []).map((team) => ({
    ...team,
    team_id: String(team?.roster_id ?? ""),
  }));
  return { teams, rosterPositions: leagueRosters.roster_positions, ownTeamId: String(roster?.team_key ?? "") };
}

async function readEspn({ connection, roster, credentials, adapters }) {
  if (!credentials?.espnS2 || !credentials?.swid) return { unavailable: "reauth_required" };
  const rosters = await adapters.espn.fetchEspnLeagueRosters(
    connection.league_id,
    credentials.espnS2,
    credentials.swid,
    { week: roster.week }
  );
  const teams = leagueTeamsFromEspn(rosters);
  return {
    teams,
    rosterPositions: Array.isArray(rosters?.roster_positions) && rosters.roster_positions.length
      ? rosters.roster_positions
      : rosterPositionsFromRoster(roster),
    ownTeamId: String(roster?.team_key ?? connection.espn_team_id ?? ""),
  };
}

async function readYahoo({ connection, roster, yahooAuth, adapters }) {
  const accessToken = yahooAuth?.accessToken;
  if (!accessToken) return { unavailable: "reauth_required" };
  const rosters = await adapters.yahoo.fetchYahooLeagueRosters(connection.league_id, accessToken, roster.week);
  const teams = (Array.isArray(rosters?.teams) ? rosters.teams : []).map((team) => ({
    team_id: team?.team_id ? String(team.team_id) : "",
    team_name: team?.team_name || null,
    players: Array.isArray(team?.players) ? team.players : [],
  }));
  return {
    teams,
    rosterPositions: Array.isArray(rosters?.roster_positions) && rosters.roster_positions.length
      ? rosters.roster_positions
      : rosterPositionsFromRoster(roster),
    ownTeamId: String(roster?.team_key ?? ""),
  };
}

const READERS = Object.freeze({ sleeper: readSleeper, espn: readEspn, yahoo: readYahoo });

/**
 * Weigh a trade for one connection.
 *
 * `deps` is injectable for tests: { adapters: {sleeper, espn, yahoo}, credentials, yahooAuth,
 * getRuntime, logger, withinBudget, onBudgetExceeded }.
 */
async function evaluateTradeForConnection({ connection, roster, platformLabel, deps = {} }) {
  const label = platformLabel || connection.platform;
  const unavailable = (reason) => ({
    status: "unavailable",
    reason,
    message: unavailableMessage(reason, label),
    teams_checked: 0,
    candidate: null,
  });

  const read = READERS[connection.platform];
  if (!read) return unavailable("provider_error");

  // Without the user's own projections no lineup can be scored, whatever the other rosters say.
  // This is the Yahoo case today, and it avoids a league-wide provider read that cannot help.
  const coverage = projectionCoverage(roster);
  if (coverage.with_projection === 0) return unavailable("projections_unavailable");

  const withinBudget = deps.withinBudget || (async (fn) => fn());
  let leagueRead;
  try {
    leagueRead = await withinBudget(() => read({
      connection,
      roster,
      credentials: deps.credentials,
      yahooAuth: deps.yahooAuth,
      adapters: deps.adapters,
    }));
  } catch (error) {
    return unavailable(error?.code === "latency_budget_exceeded" ? "timed_out" : "rosters_unreadable");
  }
  if (leagueRead.unavailable) return unavailable(leagueRead.unavailable);

  const teams = leagueRead.teams;
  const ownTeam = teams.find((team) => team.team_id === leagueRead.ownTeamId);
  if (!ownTeam) return unavailable("own_team_not_found");
  const rosterPositions = leagueRead.rosterPositions;
  if (!Array.isArray(rosterPositions) || rosterPositions.length === 0) return unavailable("no_starting_slots");

  // Another manager whose roster the provider did not disclose is skipped, never assumed empty.
  const opponents = teams.filter((team) => team.team_id !== ownTeam.team_id && Array.isArray(team.players) && team.players.length > 0);
  if (!opponents.length) return unavailable("rosters_unreadable");

  let budgetTripped = false;
  const candidate = findTradeCandidate({
    ownTeam: { ...ownTeam, roster_id: ownTeam.team_id },
    opponentTeams: opponents.map((team) => ({ ...team, roster_id: team.team_id })),
    rosterPositions,
    budget: createSearchBudget({ budgetMs: TRADE_SEARCH_BUDGET_MS }),
    onBudgetExceeded: (stats) => {
      budgetTripped = true;
      if (deps.onBudgetExceeded) deps.onBudgetExceeded(stats, { opponents: teams.length, own_players: ownTeam.players.length });
    },
    fairnessGuard: ({ give, receive, userDelta }) => {
      const valuation = compareTrade({ send: [give], receive: [receive] });
      return Number.isFinite(valuation.net_value)
        && valuation.net_value >= -(userDelta * MAX_VORP_LOSS_PER_WEEKLY_POINT);
    },
  });

  if (!candidate) {
    return budgetTripped
      ? unavailable("search_budget_exceeded")
      : { status: "none_found", reason: null, message: null, teams_checked: opponents.length, candidate: null };
  }

  const [give, receive] = await fillDisplayNames([candidate.give, candidate.receive], deps);
  return {
    status: "candidate",
    reason: null,
    message: null,
    teams_checked: opponents.length,
    candidate: { ...candidate, give, receive },
  };
}

module.exports = {
  MAX_VORP_LOSS_PER_WEEKLY_POINT,
  TRADE_READ_BUDGET_MS,
  evaluateTradeForConnection,
  projectionCoverage,
  rosterPositionsFromRoster,
  unavailableMessage,
};
