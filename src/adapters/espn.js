"use strict";

/**
 * ESPN platform adapter.
 *
 * Normalizes ESPN roster data into the platform-agnostic roster shape used by
 * src/services/roster.js. ESPN data is cookie/session scoped, so caching is
 * intentionally deferred.
 *
 * Uses Node's built-in https module with browser-like headers instead of the
 * espn-fantasy-football-api library, which bundles its own axios and sends
 * User-Agent: axios/VERSION — rejected by ESPN's API.
 */

const https = require("https");
const { logger } = require("../middleware/logging");
const { buildEspnDraftId } = require("../services/espnDraft");

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

function activeSeason() {
  const now = new Date();
  // ESPN seasons are named for the NFL year. New season data begins in August.
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
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

function finiteOrZero(...values) {
  return firstFinite(...values) ?? 0;
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
  return teams.find((team) => possibleOwnerIds(team).includes(targetSwid)) || null;
}

function rosterEntries(team) {
  if (Array.isArray(team?.roster)) return team.roster;
  if (Array.isArray(team?.players)) return team.players;
  if (Array.isArray(team?.roster?.entries)) return team.roster.entries;
  return [];
}

function teamId(team) {
  const id = team?.id ?? team?.teamId ?? team?.team_id;
  return id == null ? null : String(id);
}

function teamName(team) {
  const combined = `${team?.location || ""} ${team?.nickname || ""}`.trim();
  return team?.name
    || team?.teamName
    || combined
    || team?.abbrev
    || team?.abbreviation
    || "Unknown";
}

function teamWins(team) {
  return finiteOrZero(
    team?.wins,
    team?.record?.overall?.wins,
    team?.record?.wins,
    team?.overallRecord?.wins
  );
}

function teamLosses(team) {
  return finiteOrZero(
    team?.losses,
    team?.record?.overall?.losses,
    team?.record?.losses,
    team?.overallRecord?.losses
  );
}

function teamPointsFor(team) {
  return finiteOrZero(
    team?.regularSeasonPointsFor,
    team?.pointsFor,
    team?.totalPointsScored,
    team?.totalPoints,
    team?.record?.overall?.pointsFor
  );
}

function teamPointsAgainst(team) {
  return finiteOrZero(
    team?.regularSeasonPointsAgainst,
    team?.pointsAgainst,
    team?.record?.overall?.pointsAgainst
  );
}

function rankingHint(team) {
  return firstFinite(team?.finalStandingsPosition, team?.playoffSeed, team?.rankCalculatedFinal);
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

function swidWithBraces(swid) {
  const s = String(swid || "").trim();
  if (s.startsWith("{")) return s;
  return `{${s}}`;
}

function makeEspnHeaders(espn_s2, swid) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://fantasy.espn.com/",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": `espn_s2=${espn_s2}; SWID=${swidWithBraces(swid)}`,
  };
}

function doEspnRequest(hostname, path, espn_s2, swid, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: "GET", headers: makeEspnHeaders(espn_s2, swid) },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          try {
            const loc = new URL(res.headers.location, `https://${hostname}`);
            doEspnRequest(loc.hostname, loc.pathname + loc.search, espn_s2, swid, redirectsLeft - 1)
              .then(resolve, reject);
          } catch {
            const err = new Error("ESPN API returned an invalid redirect");
            err.status = 502;
            reject(err);
          }
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          logger.info(`[espn] ${hostname}${path.split("?")[0]} -> HTTP ${res.statusCode}`);
          if (res.statusCode === 401 || res.statusCode === 403) {
            const err = new Error("ESPN rejected the request — cookies may be invalid or expired");
            err.status = 401;
            return reject(err);
          }
          if (res.statusCode !== 200) {
            const err = new Error(`ESPN API returned HTTP ${res.statusCode}`);
            err.status = res.statusCode >= 500 ? 502 : res.statusCode;
            return reject(err);
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            const err = new Error("ESPN API returned non-JSON response");
            err.status = 502;
            reject(err);
          }
        });
      }
    );
    req.on("error", (err) => {
      err.status = 502;
      reject(err);
    });
    req.end();
  });
}

function fetchEspnApi(leagueId, espn_s2, swid, views, scoringPeriodId, opts = {}) {
  const season = opts.seasonId || activeSeason();
  const viewParams = (Array.isArray(views) ? views : [views]).map((v) => `view=${v}`).join("&");
  const periodParam = scoringPeriodId != null ? `&scoringPeriodId=${scoringPeriodId}` : "";
  const path = `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?${viewParams}${periodParam}`;
  return doEspnRequest("fantasy.espn.com", path, espn_s2, swid, 3);
}

async function buildLeagueStandings(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mSettings"], scoringPeriodId, opts);
  const teams = data?.teams || [];
  const currentTeam = findUserTeam(teams, swid, opts);
  const currentTeamId = teamId(currentTeam);

  return (Array.isArray(teams) ? teams : [])
    .map((team) => ({
      rank: rankingHint(team),
      team_id: teamId(team),
      team_name: teamName(team),
      is_current_user: currentTeamId != null && teamId(team) === currentTeamId,
      wins: teamWins(team),
      losses: teamLosses(team),
      points_for: teamPointsFor(team),
      points_against: teamPointsAgainst(team),
    }))
    .sort((a, b) => (
      (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER)
      || b.wins - a.wins
      || b.points_for - a.points_for
      || String(a.team_id || "").localeCompare(String(b.team_id || ""))
    ))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

async function verifyLeagueAccess(leagueId, espn_s2, swid, espnTeamId) {
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam"]);
  const teams = data?.teams || [];
  const opts = espnTeamId != null ? { teamId: espnTeamId } : {};
  const team = findUserTeam(teams, swid, opts);
  if (!team) {
    const err = new Error("ESPN team not found in this league");
    err.status = 404;
    throw err;
  }
  return { team_id: teamId(team), team_name: teamName(team) };
}

async function buildNormalizedRoster(leagueId, espn_s2, swid, week, opts = {}) {
  const scoringPeriodId = Number(week);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mTeam", "mRoster"], scoringPeriodId, opts);
  const teams = data?.teams || [];
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

function normalizeLastResult({ result, gameId, kickoff = null } = {}) {
  return {
    lastResult: result === "W" || result === "L" ? result : null,
    lastGameId: gameId ? String(gameId) : null,
    lastGameKickoff: kickoff || null,
  };
}

function normalizeHistoricalSummary({ result, gameId, kickoff = null, currentWinStreak = null } = {}) {
  return {
    ...normalizeLastResult({ result, gameId, kickoff }),
    currentWinStreak: Number.isInteger(currentWinStreak) && currentWinStreak >= 0
      ? currentWinStreak
      : null,
  };
}

function safePlayerMap(source) {
  const map = new Map();
  if (Array.isArray(source)) {
    for (const player of source) {
      const id = firstFinite(player?.id, player?.playerId, player?.player_id);
      if (id != null) map.set(String(id), player);
    }
    return map;
  }

  if (!source || typeof source !== "object") return map;
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const player of value) {
        const id = firstFinite(player?.id, player?.playerId, player?.player_id) ?? key;
        if (id != null) map.set(String(id), player);
      }
      continue;
    }

    const player = value?.player || value;
    const id = firstFinite(player?.id, player?.playerId, player?.player_id) ?? key;
    if (id != null) map.set(String(id), player);
  }
  return map;
}

function draftTypeFrom(rawType) {
  const normalized = String(rawType || "").toLowerCase();
  if (normalized.includes("auction")) return "auction";
  if (normalized.includes("snake")) return "snake";
  return "snake";
}

function normalizeDraftStatus(detail, totalPicks, totalSlots) {
  const rawStatus = String(
    detail?.status
    || detail?.draftStatus
    || detail?.state
    || ""
  ).toLowerCase();

  if (
    detail?.complete === true
    || detail?.isComplete === true
    || detail?.completeDate
    || detail?.completeTime
    || rawStatus.includes("complete")
    || (totalSlots > 0 && totalPicks >= totalSlots)
  ) {
    return "complete";
  }
  if (detail?.paused === true || detail?.isPaused === true || rawStatus.includes("pause")) {
    return "paused";
  }
  if (
    detail?.inProgress === true
    || detail?.isInProgress === true
    || detail?.currentPickNumber != null
    || detail?.currentRound != null
    || rawStatus.includes("progress")
    || rawStatus.includes("draft")
    || totalPicks > 0
  ) {
    return "drafting";
  }
  if (detail?.drafted === false || rawStatus.includes("not_started") || rawStatus.includes("predraft")) {
    return "pre_draft";
  }
  return "pre_draft";
}

function draftSettingsFromData(data) {
  const teams = firstFinite(
    data?.settings?.size,
    data?.settings?.teamCount,
    data?.settings?.draftSettings?.teamCount,
    data?.teams?.length
  ) ?? 0;
  const rounds = firstFinite(
    data?.settings?.draftSettings?.roundCount,
    data?.settings?.draftSettings?.rounds,
    data?.settings?.draftSettings?.roundLimit
  ) ?? 0;
  const pickTimer = firstFinite(
    data?.settings?.draftSettings?.timePerSelection,
    data?.settings?.draftSettings?.pickTimeSeconds,
    data?.settings?.draftSettings?.timerSeconds
  ) ?? 0;
  return {
    teams,
    rounds,
    pick_timer: pickTimer,
  };
}

function rawDraftStartTime(data) {
  return firstFinite(
    data?.settings?.draftSettings?.date,
    data?.settings?.draftSettings?.scheduledDate,
    data?.settings?.draftSettings?.draftDate,
    data?.draftDetail?.draftDate,
    data?.draftDetail?.scheduledDate
  );
}

function draftSlotFromPick(rawPick, teams, type) {
  const direct = firstFinite(
    rawPick?.draftSlot,
    rawPick?.draftPosition,
    rawPick?.slot,
    rawPick?.teamDraftSlot
  );
  if (direct != null) return direct;

  const round = firstFinite(rawPick?.roundId, rawPick?.round, rawPick?.roundNumber);
  const roundPick = firstFinite(
    rawPick?.roundPickNumber,
    rawPick?.pickWithinRound,
    rawPick?.roundPick
  );
  if (round == null || roundPick == null) return roundPick;
  if (String(type || "").toLowerCase() === "auction") return roundPick;
  if (!teams) return roundPick;
  return round % 2 === 0 ? teams - roundPick + 1 : roundPick;
}

function slotToRosterIdFromOrder(rawOrder) {
  if (!rawOrder) return null;
  const slotMap = {};

  if (Array.isArray(rawOrder)) {
    rawOrder.forEach((entry, index) => {
      const rosterId = entry?.teamId ?? entry?.rosterId ?? entry?.id ?? entry;
      if (rosterId != null) slotMap[String(index + 1)] = String(rosterId);
    });
    return Object.keys(slotMap).length ? slotMap : null;
  }

  if (typeof rawOrder !== "object") return null;
  for (const [slot, entry] of Object.entries(rawOrder)) {
    const rosterId = entry?.teamId ?? entry?.rosterId ?? entry?.id ?? entry;
    if (rosterId != null) slotMap[String(slot)] = String(rosterId);
  }
  return Object.keys(slotMap).length ? slotMap : null;
}

function slotToRosterIdFromPicks(picks) {
  const slotMap = {};
  for (const pick of picks) {
    if (!pick?.draft_slot || !pick?.roster_id) continue;
    const key = String(pick.draft_slot);
    if (!slotMap[key]) slotMap[key] = String(pick.roster_id);
  }
  return Object.keys(slotMap).length ? slotMap : null;
}

function playerMetadataFrom(player = {}) {
  const position = positionFrom(
    player?.defaultPosition
    || player?.defaultPositionId
    || player?.position
    || player?.player?.defaultPosition
  );
  return {
    first_name: player?.firstName || player?.first_name || null,
    last_name: player?.lastName || player?.last_name || null,
    team: player?.proTeamAbbreviation || player?.teamAbbrev || player?.team || null,
    position: position === "UNK" ? null : position,
    status: statusFrom(player?.status),
    injury_status: statusFrom(player?.injuryStatus || player?.injury_status),
    years_exp: firstFinite(player?.yearsExp, player?.years_exp),
  };
}

function normalizeDraftPick(rawPick, playerMap, opts = {}) {
  const playerId = firstFinite(
    rawPick?.playerId,
    rawPick?.player?.id,
    rawPick?.player?.playerId
  );
  const rosterId = firstFinite(
    rawPick?.teamId,
    rawPick?.rosterId,
    rawPick?.team?.id,
    rawPick?.team?.teamId
  );
  const round = firstFinite(rawPick?.roundId, rawPick?.round, rawPick?.roundNumber) ?? 0;
  const pickNo = firstFinite(
    rawPick?.overallPickNumber,
    rawPick?.pickNumber,
    rawPick?.overallPick,
    rawPick?.id
  ) ?? 0;
  const player = playerMap.get(String(playerId)) || rawPick?.player || rawPick?.playerPoolEntry?.player || {};
  const draftSlot = draftSlotFromPick(rawPick, opts.teams, opts.type) ?? 0;

  return {
    pick_no: pickNo,
    round,
    draft_slot: draftSlot,
    roster_id: rosterId == null ? null : String(rosterId),
    player_id: playerId == null ? null : String(playerId),
    is_user_pick: opts.userTeamId != null && String(rosterId) === String(opts.userTeamId),
    is_keeper: rawPick?.keeper === true || rawPick?.isKeeper === true,
    metadata: playerMetadataFrom(player),
  };
}

async function fetchEspnDraft(leagueId, espn_s2, swid, opts = {}) {
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mDraftDetail", "mSettings", "mTeam"], null, opts);
  const settings = draftSettingsFromData(data);
  const type = draftTypeFrom(data?.settings?.draftSettings?.type || data?.draftDetail?.type);
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  const currentTeam = findUserTeam(teams, swid, opts);
  const currentTeamId = opts.teamId != null
    ? String(opts.teamId)
    : teamId(currentTeam);
  const playerMap = safePlayerMap(
    data?.players
    || data?.playerPool
    || data?.draftDetail?.players
    || data?.draftDetail?.playerPool
  );
  const rawPicks = Array.isArray(data?.draftDetail?.picks) ? data.draftDetail.picks : [];
  const picks = rawPicks
    .map((pick) => normalizeDraftPick(pick, playerMap, {
      teams: settings.teams,
      type,
      userTeamId: currentTeamId,
    }))
    .filter((pick) => pick.pick_no > 0)
    .sort((a, b) => a.pick_no - b.pick_no);
  const slotToRosterId = slotToRosterIdFromOrder(
    data?.settings?.draftSettings?.pickOrder
    || data?.draftDetail?.pickOrder
  ) || slotToRosterIdFromPicks(picks);
  const userDraftSlot = slotToRosterId
    ? Object.entries(slotToRosterId).find(([, rosterId]) => currentTeamId != null && String(rosterId) === String(currentTeamId))?.[0] ?? null
    : null;
  const totalSlots = settings.teams * settings.rounds;

  return {
    league_id: String(leagueId),
    draft_id: buildEspnDraftId(leagueId),
    status: normalizeDraftStatus(data?.draftDetail, picks.length, totalSlots),
    type,
    sport: "nfl",
    season: String(opts.seasonId || activeSeason()),
    season_type: "regular",
    settings,
    start_time: rawDraftStartTime(data),
    created: null,
    user_draft_slot: userDraftSlot == null ? null : Number(userDraftSlot),
    slot_to_roster_id: slotToRosterId,
    picks,
  };
}

function espnMatchupTeamId(side) {
  const source = side?.team || side;
  const id = source?.teamId ?? source?.id ?? source?.team_id;
  return id == null ? null : String(id);
}

function espnMatchupPoints(side) {
  const value = side?.totalPoints
    ?? side?.points
    ?? side?.team?.totalPoints
    ?? side?.team?.points;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function matchupOutcomeFromEspnSchedule({ leagueId, week, teamId: requestedTeamId, schedule }) {
  const games = Array.isArray(schedule) ? schedule : [];
  const targetTeamId = requestedTeamId == null ? null : String(requestedTeamId);

  for (const game of games) {
    const scoringPeriod = Number(game?.matchupPeriodId ?? game?.scoringPeriodId);
    if (Number.isFinite(Number(week)) && Number.isFinite(scoringPeriod) && scoringPeriod !== Number(week)) {
      continue;
    }

    const home = game?.home || null;
    const away = game?.away || null;
    const homeId = espnMatchupTeamId(home);
    const awayId = espnMatchupTeamId(away);
    if (!homeId || !awayId) continue;

    const mine = targetTeamId
      ? (homeId === targetTeamId ? home : awayId === targetTeamId ? away : null)
      : null;
    if (!mine) continue;

    const opponent = mine === home ? away : home;
    const gameId = game?.id || `${leagueId}:${week}:${homeId}:${awayId}`;
    const winner = game?.winner;
    if (winner === "HOME" || winner === "AWAY") {
      const userWon = (winner === "HOME" && mine === home) || (winner === "AWAY" && mine === away);
      return { outcome: userWon ? "W" : "L", gameId, kickoff: null };
    }

    const myPoints = espnMatchupPoints(mine);
    const opponentPoints = espnMatchupPoints(opponent);
    if (myPoints == null || opponentPoints == null) return { outcome: null, gameId, kickoff: null };
    if (myPoints === opponentPoints) return { outcome: "T", gameId, kickoff: null };

    return {
      outcome: myPoints > opponentPoints ? "W" : "L",
      gameId,
      kickoff: null,
    };
  }

  return { outcome: null, gameId: null, kickoff: null };
}

function lastResultFromEspnSchedule(args) {
  const outcome = matchupOutcomeFromEspnSchedule(args);
  return normalizeLastResult({
    result: outcome.outcome,
    gameId: outcome.gameId,
    kickoff: outcome.kickoff,
  });
}

async function fetchEspnLastResult(leagueId, espn_s2, swid, opts = {}) {
  const scoringPeriodId = Number(opts.week || opts.scoringPeriodId || 1);
  const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mMatchup"], scoringPeriodId, opts);
  return lastResultFromEspnSchedule({
    leagueId,
    week: scoringPeriodId,
    teamId: opts.teamId,
    schedule: data?.schedule,
  });
}

async function fetchEspnHistoricalSummary(leagueId, espn_s2, swid, opts = {}) {
  const targetWeek = Number(opts.week || opts.scoringPeriodId || 1);
  if (!leagueId || !espn_s2 || !swid || !Number.isInteger(targetWeek) || targetWeek < 1) {
    return normalizeHistoricalSummary();
  }

  let latestOutcome = { outcome: null, gameId: null, kickoff: null };
  let streak = 0;

  for (let currentWeek = targetWeek; currentWeek >= 1; currentWeek -= 1) {
    const data = await fetchEspnApi(leagueId, espn_s2, swid, ["mMatchup"], currentWeek, {
      ...opts,
      week: currentWeek,
      scoringPeriodId: currentWeek,
    });
    const outcome = matchupOutcomeFromEspnSchedule({
      leagueId,
      week: currentWeek,
      teamId: opts.teamId,
      schedule: data?.schedule,
    });
    if (currentWeek === targetWeek) latestOutcome = outcome;

    if (outcome.outcome === "W") {
      streak += 1;
      continue;
    }

    if (outcome.outcome === "L" || outcome.outcome === "T") {
      return normalizeHistoricalSummary({
        result: latestOutcome.outcome,
        gameId: latestOutcome.gameId,
        kickoff: latestOutcome.kickoff,
        currentWinStreak: streak,
      });
    }

    return normalizeHistoricalSummary({
      result: latestOutcome.outcome,
      gameId: latestOutcome.gameId,
      kickoff: latestOutcome.kickoff,
      currentWinStreak: latestOutcome.outcome === "W" ? null : null,
    });
  }

  return normalizeHistoricalSummary({
    result: latestOutcome.outcome,
    gameId: latestOutcome.gameId,
    kickoff: latestOutcome.kickoff,
    currentWinStreak: streak > 0 ? streak : null,
  });
}

module.exports = {
  buildLeagueStandings,
  buildNormalizedRoster,
  fetchEspnDraft,
  fetchEspnHistoricalSummary,
  fetchEspnLastResult,
  verifyLeagueAccess,
  lastResultFromEspnSchedule,
};
