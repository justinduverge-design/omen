"use strict";

/**
 * Yahoo platform adapter.
 *
 * Produces the same normalized roster shape as Sleeper and ESPN while keeping
 * Yahoo OAuth/token plumbing in src/services/yahooAuth.js.
 */

const { Redis } = require("@upstash/redis");
const config = require("../config");
const YahooClient = require("../services/yahoo");
const { normalizeYahooRoster } = require("../services/roster");
const { buildYahooDraftId } = require("../services/yahooDraft");

const ROSTER_TTL_S = 300;

const redis = config.redisUrl
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

async function readCache(key) {
  if (!redis) return null;
  const cached = await redis.get(key).catch(() => null);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

async function writeCache(key, value, ttlSeconds) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds }).catch(() => {});
}

function cacheKeyFor(leagueKey, teamKey, effectiveWeek, opts = {}) {
  if (opts.cacheKey) return opts.cacheKey;
  const scope = opts.cacheScope || teamKey;
  return `ssff:roster:yahoo:${scope}:${leagueKey}:${effectiveWeek || "current"}`;
}

function rosterWeek(effectiveWeek) {
  const n = Number(effectiveWeek);
  return Number.isFinite(n) ? n : effectiveWeek;
}

function withYahooIds(player) {
  const playerId = player.player_id == null ? "" : String(player.player_id);

  return {
    ...player,
    player_key: `yahoo:${playerId}`,
    player_id: playerId,
    yahoo_id: playerId,
    espn_id: null,
    gsis_id: null,
    // TODO: Yahoo per-player projected stats require a separate stats sub-resource.
    projected_points: null,
  };
}

function normalizeSlots(slots) {
  return {
    starters: (slots?.starters || []).map(withYahooIds),
    bench: (slots?.bench || []).map(withYahooIds),
    ir: (slots?.ir || []).map(withYahooIds),
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

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function intOr(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function rosterPositions(settings = {}) {
  return Array.isArray(settings?.roster_positions) ? settings.roster_positions : [];
}

function yahooDraftType(settings = {}, draftResults = {}) {
  const rawValue = settings?.draft_type
    || (settings?.is_auction_draft === "1" ? "auction" : null)
    || draftResults?.draft_type
    || "";
  const raw = String(rawValue).toLowerCase();
  if (raw.includes("auction")) return "auction";
  return "snake";
}

function yahooDraftStatus(draftResults = {}, totalPicks = 0, totalSlots = 0) {
  const raw = String(draftResults?.draft_status || "").toLowerCase();
  if (raw.includes("post")) return "complete";
  if (raw.includes("pre")) return totalPicks > 0 ? "drafting" : "pre_draft";
  if (totalSlots > 0 && totalPicks >= totalSlots) return "complete";
  if (totalPicks > 0) return "drafting";
  return "pre_draft";
}

function yahooPickTimer(settings = {}) {
  return intOr(settings?.draft_pick_time) ?? intOr(settings?.pick_time) ?? intOr(settings?.time_per_pick) ?? 0;
}

function totalRounds(settings = {}, draftResults = {}) {
  const explicit = intOr(settings?.num_rounds) ?? intOr(settings?.rounds);
  if (explicit) return explicit;

  const positions = rosterPositions(settings);
  if (positions.length) {
    return positions.reduce((sum, position) => sum + (intOr(position?.count, 0) || 0), 0);
  }

  const roundsFromPicks = Array.isArray(draftResults?.draft_results)
    ? draftResults.draft_results.reduce((max, pick) => Math.max(max, intOr(pick?.round, 0) || 0), 0)
    : 0;
  return roundsFromPicks || 0;
}

function draftStartTime(settings = {}) {
  const raw = settings?.draft_time;
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : raw;
}

function playerMetadata(player = {}) {
  const eligible = toArray(player?.eligible_positions).map((entry) => entry?.position || entry).filter(Boolean);
  return {
    first_name: player?.name?.first || null,
    last_name: player?.name?.last || null,
    team: player?.editorial_team_abbr || null,
    position: player?.display_position || eligible[0] || null,
    status: player?.status || null,
    injury_status: player?.status || null,
    years_exp: null,
  };
}

function teamKeyFromPick(pick = {}) {
  return pick?.team_key ? String(pick.team_key) : null;
}

function playerIdentityKey(pick = {}) {
  if (pick?.player_key) return String(pick.player_key);
  if (pick?.player_id != null) return `player_id:${pick.player_id}`;
  return null;
}

function slotToRosterIdFromPicks(picks, teams, type) {
  if (!teams || String(type || "").toLowerCase() === "auction") return null;
  const firstRound = picks
    .filter((pick) => pick.round === 1 && pick.draft_slot > 0 && pick.roster_id)
    .sort((a, b) => a.pick_no - b.pick_no)
    .slice(0, teams);
  const slotMap = {};
  for (const pick of firstRound) {
    if (!slotMap[String(pick.draft_slot)]) slotMap[String(pick.draft_slot)] = String(pick.roster_id);
  }
  return Object.keys(slotMap).length ? slotMap : null;
}

async function fetchYahooDraft({ leagueKey, client, teamKey = null } = {}) {
  if (!client || !leagueKey) return null;

  const [draftResults, settings] = await Promise.all([
    client.getLeagueDraftResults(leagueKey),
    client.getLeagueSettings(leagueKey),
  ]);

  const rawPicks = Array.isArray(draftResults?.draft_results) ? draftResults.draft_results : [];
  const teams = intOr(settings?.num_teams) || intOr(draftResults?.num_teams) || 0;
  const rounds = totalRounds(settings, draftResults);
  const type = yahooDraftType(settings, draftResults);
  const currentTeamKey = teamKey || await client.getMyTeamKey(leagueKey);
  const playerKeys = [...new Set(rawPicks.map((pick) => playerIdentityKey(pick)).filter((key) => key && !key.startsWith("player_id:")))];
  const playerDetails = await client.getPlayerDetails(playerKeys);
  const playersByKey = new Map(
    (Array.isArray(playerDetails) ? playerDetails : [])
      .map((player) => [String(player.player_key || ""), player])
      .filter(([key]) => key)
  );

  const picks = rawPicks
    .map((pick) => {
      const pickNo = intOr(pick?.pick, 0) || 0;
      const round = intOr(pick?.round, 0) || 0;
      const draftSlot = teams ? ((pickNo - 1) % teams) + 1 : intOr(pick?.draft_slot, 0) || 0;
      const rosterId = teamKeyFromPick(pick);
      const playerKey = pick?.player_key ? String(pick.player_key) : null;
      const player = playerKey ? playersByKey.get(playerKey) : null;

      return {
        pick_no: pickNo,
        round,
        draft_slot: String(type).toLowerCase() === "auction"
          ? draftSlot
          : (teams && round % 2 === 0 ? teams - draftSlot + 1 : draftSlot),
        roster_id: rosterId,
        player_id: player?.player_id || (pick?.player_id == null ? null : String(pick.player_id)),
        is_user_pick: Boolean(currentTeamKey) && rosterId === String(currentTeamKey),
        is_keeper: false,
        metadata: playerMetadata(player || {}),
      };
    })
    .filter((pick) => pick.pick_no > 0)
    .sort((a, b) => a.pick_no - b.pick_no);

  const slotToRosterId = slotToRosterIdFromPicks(picks, teams, type);
  const userDraftSlot = slotToRosterId
    ? Object.entries(slotToRosterId).find(([, rosterId]) => currentTeamKey && String(rosterId) === String(currentTeamKey))?.[0] ?? null
    : null;
  const totalSlots = teams * rounds;

  return {
    league_key: String(leagueKey),
    draft_id: buildYahooDraftId(leagueKey),
    status: yahooDraftStatus(draftResults, picks.length, totalSlots),
    type,
    sport: "nfl",
    season: String(settings?.season || draftResults?.season || ""),
    season_type: "regular",
    settings: {
      teams,
      rounds,
      pick_timer: yahooPickTimer(settings),
    },
    start_time: draftStartTime(settings),
    created: null,
    user_draft_slot: userDraftSlot == null ? null : Number(userDraftSlot),
    slot_to_roster_id: slotToRosterId,
    picks,
  };
}

function objectValues(value) {
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter((entry) => entry && typeof entry === "object");
}

function yahooTeamKey(team) {
  if (team?.team_key) return team.team_key;
  const info = Array.isArray(team?.team) ? team.team[0] : team;
  if (Array.isArray(info)) {
    return info.find((entry) => entry?.team_key)?.team_key || null;
  }
  return info?.team_key || null;
}

function yahooTeamPoints(team) {
  if (Number.isFinite(Number(team?.team_points?.total))) return Number(team.team_points.total);
  if (Number.isFinite(Number(team?.points))) return Number(team.points);
  const details = Array.isArray(team?.team) ? team.team : [];
  for (const detail of details) {
    const points = detail?.team_points?.total ?? detail?.team_points?.points;
    if (Number.isFinite(Number(points))) return Number(points);
  }
  return null;
}

function teamsFromYahooMatchup(matchup) {
  if (Array.isArray(matchup?.teams)) return matchup.teams;
  const teams = matchup?.teams?.team ? matchup.teams.team : matchup?.teams;
  if (Array.isArray(teams)) return teams;
  return objectValues(teams).map((entry) => entry.team || entry).filter(Boolean);
}

function yahooMatchupsFromScoreboard(scoreboard) {
  const raw = scoreboard?.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups
    || scoreboard?.scoreboard?.matchups
    || scoreboard?.matchups;
  return objectValues(raw).map((entry) => entry.matchup || entry).filter(Boolean);
}

function matchupOutcomeFromYahooScoreboard({ leagueKey, week, teamKey, scoreboard }) {
  for (const matchup of yahooMatchupsFromScoreboard(scoreboard)) {
    const teams = teamsFromYahooMatchup(matchup);
    const mine = teams.find((team) => yahooTeamKey(team) === teamKey);
    if (!mine) continue;

    const opponent = teams.find((team) => yahooTeamKey(team) !== teamKey);
    const gameId = matchup?.matchup_id || matchup?.week || `${leagueKey}:${week}:${teamKey}`;
    if (!opponent) return { outcome: null, gameId, kickoff: null };

    const winnerTeamKey = matchup?.winner_team_key || null;
    if (winnerTeamKey) {
      return {
        outcome: winnerTeamKey === teamKey ? "W" : "L",
        gameId,
        kickoff: null,
      };
    }

    const myPoints = yahooTeamPoints(mine);
    const opponentPoints = yahooTeamPoints(opponent);
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

function lastResultFromYahooScoreboard(args) {
  const outcome = matchupOutcomeFromYahooScoreboard(args);
  return normalizeLastResult({
    result: outcome.outcome,
    gameId: outcome.gameId,
    kickoff: outcome.kickoff,
  });
}

async function fetchYahooLastResult({ client, leagueKey, teamKey, week, season } = {}) {
  void season;
  if (!client || !leagueKey || !teamKey || !week) return normalizeLastResult();
  const scoreboard = typeof client.getLeagueScoreboard === "function"
    ? await client.getLeagueScoreboard(leagueKey, week)
    : await client.get(`/league/${leagueKey}/scoreboard;week=${week}`);
  return lastResultFromYahooScoreboard({ leagueKey, week, teamKey, scoreboard });
}

async function fetchYahooHistoricalSummary({ client, leagueKey, teamKey, week, season } = {}) {
  void season;
  const targetWeek = Number(week);
  if (!client || !leagueKey || !teamKey || !Number.isInteger(targetWeek) || targetWeek < 1) {
    return normalizeHistoricalSummary();
  }

  let latestOutcome = { outcome: null, gameId: null, kickoff: null };
  let streak = 0;

  for (let currentWeek = targetWeek; currentWeek >= 1; currentWeek -= 1) {
    const scoreboard = typeof client.getLeagueScoreboard === "function"
      ? await client.getLeagueScoreboard(leagueKey, currentWeek)
      : await client.get(`/league/${leagueKey}/scoreboard;week=${currentWeek}`);
    const outcome = matchupOutcomeFromYahooScoreboard({
      leagueKey,
      week: currentWeek,
      teamKey,
      scoreboard,
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

async function buildNormalizedRoster(leagueKey, accessToken, week, opts = {}) {
  const client = new YahooClient(accessToken);
  const teamKey = await client.getMyTeamKey(leagueKey);
  if (!teamKey) {
    throw Object.assign(new Error("No Yahoo team found in this league"), { status: 404 });
  }

  const effectiveWeek = week || await client.getCurrentWeek(leagueKey);
  const cacheKey = cacheKeyFor(leagueKey, teamKey, effectiveWeek, opts);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const raw = await client.getRoster(teamKey, effectiveWeek);
  const teamProjected = await client.getProjectedStats(teamKey, effectiveWeek).catch(() => null);
  void teamProjected;

  const normalized = normalizeYahooRoster(raw, effectiveWeek);
  const roster = {
    week: rosterWeek(effectiveWeek),
    league_key: String(leagueKey),
    team_key: String(teamKey),
    slots: normalizeSlots(normalized.slots),
    source: "yahoo",
  };

  await writeCache(cacheKey, roster, ROSTER_TTL_S);
  return roster;
}

module.exports = {
  buildNormalizedRoster,
  fetchYahooDraft,
  fetchYahooHistoricalSummary,
  fetchYahooLastResult,
  lastResultFromYahooScoreboard,
};
