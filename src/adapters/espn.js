"use strict";

/**
 * ESPN platform adapter.
 *
 * Normalizes ESPN roster data into the platform-agnostic roster shape used by
 * src/services/roster.js. ESPN data is cookie/session scoped, so caching is
 * intentionally deferred.
 */

const { Client } = require("espn-fantasy-football-api/node");

const LINEUP_SLOT_MAP = {
  0: "QB",
  2: "RB",
  4: "WR",
  6: "TE",
  16: "DEF",
  17: "K",
  20: "BN",
  21: "IR",
  23: "FLEX",
  24: "FLEX",
};

const POSITION_ID_MAP = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

const INJURY_STATUS_MAP = {
  ACTIVE: null,
  QUESTIONABLE: "Q",
  DOUBTFUL: "D",
  OUT: "O",
  INJURED_RESERVE: "IR",
  SUSPENDED: "SUSP",
};

function currentSeason() {
  return new Date().getFullYear();
}

function normalizeSwid(swid) {
  return String(swid || "").replace(/[{}]/g, "").toLowerCase();
}

function slotFromId(slotId) {
  return LINEUP_SLOT_MAP[Number(slotId)] || "UNK";
}

function positionFrom(value) {
  if (typeof value === "string" && value) {
    if (value === "D/ST") return "DEF";
    return value;
  }
  return POSITION_ID_MAP[Number(value)] || "UNK";
}

function statusFrom(value) {
  if (value == null || value === "") return null;
  return Object.prototype.hasOwnProperty.call(INJURY_STATUS_MAP, value)
    ? INJURY_STATUS_MAP[value]
    : value;
}

function firstFinite(...values) {
  for (const value of values) {
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function possibleOwnerIds(team) {
  return [
    team?.ownerId,
    team?.primaryOwner,
    team?.owner?.id,
    team?.owner?.userId,
    team?.owner?.uuid,
    ...(Array.isArray(team?.owners) ? team.owners : []),
  ]
    .filter(Boolean)
    .map((value) => normalizeSwid(value));
}

function findUserTeam(teams, swid, opts = {}) {
  if (!Array.isArray(teams)) return null;
  const requestedTeamId = opts.teamId != null ? String(opts.teamId) : null;
  if (requestedTeamId) {
    return teams.find((team) => String(team?.id) === requestedTeamId || String(team?.teamId) === requestedTeamId) || null;
  }

  const targetSwid = normalizeSwid(swid);
  return teams.find((team) => possibleOwnerIds(team).includes(targetSwid))
    || (teams.length === 1 ? teams[0] : null);
}

function rosterEntries(team) {
  if (Array.isArray(team?.roster)) return team.roster;
  if (Array.isArray(team?.players)) return team.players;
  if (Array.isArray(team?.roster?.entries)) return team.roster.entries;
  return [];
}

function unwrapPlayer(entry) {
  return entry?.player || entry?.playerPoolEntry?.player || entry?.playerPoolEntry || entry || {};
}

function playerId(entry, player) {
  return String(
    player?.id
    || player?.playerId
    || player?.player_id
    || entry?.playerId
    || entry?.id
    || "unknown"
  );
}

function playerName(player, id) {
  return player?.fullName
    || player?.full_name
    || player?.name
    || `${player?.firstName || ""} ${player?.lastName || ""}`.trim()
    || id
    || "Unknown";
}

function eligiblePositions(player, primaryPosition) {
  const positions = Array.isArray(player?.eligiblePositions)
    ? player.eligiblePositions.map(positionFrom).filter(Boolean)
    : [];
  if (positions.length) return [...new Set(positions)];
  return primaryPosition === "UNK" ? [] : [primaryPosition];
}

function normalizePlayer(entry) {
  const player = unwrapPlayer(entry);
  const id = playerId(entry, player);
  const selectedPosition = slotFromId(entry?.lineupSlotId ?? entry?.lineupSlot ?? entry?.slotId);
  const primaryPosition = positionFrom(player?.defaultPosition || player?.defaultPositionId || player?.position);
  const isStarter = selectedPosition !== "BN" && selectedPosition !== "IR";

  return {
    player_key: `espn:${id}`,
    player_id: id,
    name: playerName(player, id),
    position: primaryPosition,
    eligible_positions: eligiblePositions(player, primaryPosition),
    selected_position: selectedPosition,
    team: player?.proTeamAbbreviation || player?.teamAbbrev || player?.team || null,
    opponent: null,
    status: statusFrom(player?.injuryStatus || player?.injury_status || player?.status),
    projected_points: firstFinite(
      entry?.projectedPoints,
      entry?.projected_points,
      player?.projectedPoints,
      player?.projected_points,
      player?.projectedRawStatsForScoringPeriod?.appliedTotal,
      player?.projectedStats?.appliedTotal
    ),
    actual_points: firstFinite(entry?.totalPoints, entry?.actualPoints, player?.totalPoints, player?.actual_points),
    image_url: player?.headshotUrl || player?.imageUrl || null,
    is_starter: isStarter,
    espn_id: id,
    yahoo_id: null,
    gsis_id: null,
  };
}

async function buildNormalizedRoster(leagueId, espn_s2, swid, week, opts = {}) {
  const seasonId = Number(opts.seasonId || currentSeason());
  const scoringPeriodId = Number(week);
  const client = new Client({ leagueId, espnS2: espn_s2, SWID: swid });

  // TODO: Add short-lived session-scoped caching around this ESPN fetch once
  // we have a secure cookie handling path that does not place cookies in logs.
  const teams = await client.getTeamsAtWeek({ seasonId, scoringPeriodId });
  const team = findUserTeam(teams, swid, opts);
  if (!team) {
    const err = new Error("ESPN team not found in this league");
    err.status = 404;
    throw err;
  }

  const slots = { starters: [], bench: [], ir: [] };
  for (const entry of rosterEntries(team)) {
    const normalized = normalizePlayer(entry);
    if (normalized.selected_position === "IR") slots.ir.push(normalized);
    else if (normalized.selected_position === "BN") slots.bench.push(normalized);
    else slots.starters.push(normalized);
  }

  return {
    week: scoringPeriodId,
    league_key: String(leagueId),
    team_key: String(team.id || team.teamId || ""),
    slots,
    source: "espn",
  };
}

module.exports = {
  buildNormalizedRoster,
};
