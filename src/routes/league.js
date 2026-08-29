"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { logger } = require("../middleware/logging");
const { getCurrentNflWeekContext, suppressLiveFootballData } = require("../services/nflSchedule");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const VALID_PLATFORMS = new Set(["yahoo", "sleeper", "espn"]);
// Providers are peers - no platform is preferred over another. This order is a
// deterministic tie-break for which usable connection is attempted first; every
// candidate is tried before the request is allowed to fail, so one dead provider
// can never take down a user who has a healthy connection elsewhere.
const PLATFORM_ORDER = ["espn", "sleeper", "yahoo"];
const {
  SELECTION_COLUMN,
  readConnectionsWithSelection,
} = require("../services/activeSelection");
const ERROR_COPY = Object.freeze({
  invalid_platform: {
    error: "Invalid platform",
    message: "League standings only supports Yahoo, Sleeper, or ESPN.",
    action: "choose_supported_platform",
  },
  league_not_connected: {
    error: "No connected league found",
    message: "Connect a Yahoo, Sleeper, or ESPN league before viewing standings.",
    action: "connect_league",
  },
  reconnect_required: {
    error: "League provider reconnect required",
    message: "Omen needs a fresh connection before it can load these standings.",
    action: "reconnect_platform",
  },
  provider_failed: {
    error: "League standings provider failed",
    message: "Omen could not load standings from the league provider right now.",
    action: "retry_later",
  },
});

function nowIso() {
  return new Date().toISOString();
}

function normalizePlatform(value) {
  return value == null || value === "" ? null : String(value).trim().toLowerCase();
}

function normalizeLeagueId(value) {
  return value == null || value === "" ? null : String(value).trim();
}

function connectionUsable(row) {
  if (!row?.is_active || !row?.league_id) return false;
  if (row.platform === "yahoo") return Boolean(row.token_secret_id);
  if (row.platform === "sleeper") return Boolean(row.platform_username || row.platform_user_id);
  if (row.platform === "espn") return Boolean(row.espn_secret_id && row.swid_secret_id);
  return false;
}

/** Every usable connection, ordered. Callers should try these in sequence. */
function selectConnections(rows, { platform, leagueId }) {
  return (rows || [])
    .filter(connectionUsable)
    .filter((row) => !platform || row.platform === platform)
    .filter((row) => !leagueId || String(row.league_id) === String(leagueId))
    .sort((a, b) => {
      // The user's switcher choice (visual briefs §10.3) wins; PLATFORM_ORDER
      // stays the tie-break for everyone who has not chosen one.
      const selected = Number(Boolean(b?.[SELECTION_COLUMN])) - Number(Boolean(a?.[SELECTION_COLUMN]));
      if (selected !== 0) return selected;
      return PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform);
    });
}

function selectConnection(rows, options) {
  return selectConnections(rows, options)[0] || null;
}

async function getConnectionRows(userId) {
  const { rows } = await readConnectionsWithSelection(
    supabase,
    userId,
    "platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,refresh_secret_id,espn_secret_id,swid_secret_id,espn_team_id"
  );
  return rows;
}

function baseEnvelope(connection, context, extra = {}) {
  return {
    contract_version: "league-standings.v1",
    generated_at: nowIso(),
    platform: connection.platform,
    league_id: String(connection.league_id),
    league_name: extra.league_name || null,
    season: Number(extra.season || context.season),
    week: Number(extra.week || context.week),
    standings: extra.standings || [],
  };
}

async function yahooStandings(connection, userId, context) {
  const { client } = await getAuthenticatedYahooClient(userId);
  const [metadata, myTeamKey] = await Promise.all([
    client.getLeagueMetadata(connection.league_id).catch(() => ({})),
    client.getMyTeamKey(connection.league_id).catch(() => null),
  ]);
  const standings = await client.getLeagueStandings(connection.league_id, myTeamKey);
  return baseEnvelope(connection, context, {
    league_name: metadata.league_name,
    season: metadata.season,
    week: metadata.week,
    standings,
  });
}

async function sleeperStandings(connection, context) {
  const sleeperUserId = connection.platform_user_id
    || (connection.platform_username
      ? (await sleeperAdapter.fetchSleeperUser(connection.platform_username)).user_id
      : null);

  if (!sleeperUserId) {
    const err = new Error("Sleeper connection is missing user context");
    err.status = 404;
    throw err;
  }

  const [league, standings] = await Promise.all([
    sleeperAdapter.fetchSleeperLeague(connection.league_id),
    sleeperAdapter.fetchSleeperStandings(connection.league_id, sleeperUserId),
  ]);

  return baseEnvelope(connection, context, {
    league_name: league?.name || null,
    season: Number(league?.season) || context.season,
    standings,
  });
}

async function espnStandings(connection, userId, context) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const standings = await espnAdapter.buildLeagueStandings(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    {
      seasonId: context.season,
      week: context.week,
      teamId: connection.espn_team_id,
    }
  );

  return baseEnvelope(connection, context, { standings });
}

/** Dispatch to the right adapter. Unknown platforms reject rather than return null. */
function fetchStandings(connection, userId, context) {
  if (connection.platform === "yahoo") return yahooStandings(connection, userId, context);
  if (connection.platform === "sleeper") return sleeperStandings(connection, context);
  if (connection.platform === "espn") return espnStandings(connection, userId, context);
  const err = new Error(`Unsupported platform: ${connection.platform}`);
  err.status = 400;
  return Promise.reject(err);
}

function providerAuthCode(platform) {
  return `${platform}_reconnect_required`;
}

function errorEnvelope({ code, status, platform = null }) {
  const copy = ERROR_COPY[code]
    || (code?.endsWith("_reconnect_required") ? ERROR_COPY.reconnect_required : null)
    || ERROR_COPY.provider_failed;
  return {
    status,
    body: {
      contract_version: "league-standings-error.v1",
      error: copy.error,
      code,
      message: copy.message,
      action: copy.action,
      ...(platform ? { platform } : {}),
    },
  };
}

router.get("/standings", requireAuth, async (req, res, next) => {
  const platform = normalizePlatform(req.query.platform);
  const leagueId = normalizeLeagueId(req.query.leagueId);

  if (platform && !VALID_PLATFORMS.has(platform)) {
    const result = errorEnvelope({ code: "invalid_platform", status: 400 });
    return res.status(result.status).json(result.body);
  }

  try {
    const context = getCurrentNflWeekContext();
    const rows = await getConnectionRows(req.user.id);
    const candidates = selectConnections(rows, { platform, leagueId });

    if (!candidates.length) {
      const result = errorEnvelope({ code: "league_not_connected", status: 404 });
      return res.status(result.status).json(result.body);
    }

    if (suppressLiveFootballData()) {
      return res.json(baseEnvelope(candidates[0], context));
    }

    // Try every usable connection. A provider that is down, rate-limited, or
    // not yet provisioned must not block a user whose other league still works.
    const failures = [];
    for (const connection of candidates) {
      try {
        return res.json(await fetchStandings(connection, req.user.id, context));
      } catch (e) {
        failures.push({
          platform: connection.platform,
          status: typeof e?.status === "number" ? e.status : null,
        });
        logger.warn("League standings provider failed, trying next", {
          err: e.message,
          platform: connection.platform,
        });
      }
    }

    logger.error("All league standings providers failed", {
      attempted: failures.map((f) => `${f.platform}:${f.status || "error"}`).join(","),
    });

    // Only ask the user to reconnect when that is genuinely the blocker.
    const authFailure = failures.find((f) => f.status === 401 || f.status === 404);
    if (authFailure) {
      const result = errorEnvelope({
        code: providerAuthCode(authFailure.platform),
        status: authFailure.status,
        platform: authFailure.platform,
      });
      return res.status(result.status).json(result.body);
    }

    const result = errorEnvelope({
      code: "league_standings_provider_failed",
      status: 502,
      platform: failures[0]?.platform || null,
    });
    return res.status(result.status).json(result.body);
  } catch (e) {
    return next(e);
  }
});


// ---------------------------------------------------------------------------
// GET /api/league/overview  ->  league-overview.v1
//
// Additive. `/standings` is untouched: the Command Center context strip (M5 slice C) consumes
// it and must not be disturbed.
//
// Steps 1-2 of `m1-league-screen-data-plan-v1.md` §4. Step 3 (deadline signals) and step 4
// (waiver/trade transaction signals) are deliberately NOT built here — but the shape they will
// fill is, so they land later without a contract change or a client change:
//   - `activity.status` already carries "empty"
//   - `activity.unavailable_families` already names "transactions"
// ---------------------------------------------------------------------------

/** Sections fail independently. One dead provider call must never blank the destination. */
function overviewEnvelope(connection, context, sections = {}) {
  return {
    contract_version: "league-overview.v1",
    generated_at: nowIso(),
    platform: connection.platform,
    league_id: String(connection.league_id),
    league_name: sections.league_name || null,
    season: Number(sections.season || context.season),
    week: Number(sections.week || context.week),
    matchup: sections.matchup || { status: "unavailable", you: null, opponent: null, unavailable_reason: "not_read" },
    standings: sections.standings || { status: "unavailable", playoff_picture: null, teams: [] },
    activity: sections.activity || emptyActivity(),
  };
}

/**
 * v1 ships no activity signals. This is the honest shape, not a placeholder: `status` is
 * explicit and the missing family is NAMED, so a client can say which half is unavailable
 * rather than silently rendering nothing.
 *
 * Step 4 replaces `items` and flips `status`; nothing else about this contract changes.
 */
function emptyActivity() {
  return {
    status: "empty",
    unavailable_families: ["transactions"],
    items: [],
  };
}

/**
 * Playoff position, stated only as far as the payload supports it.
 *
 * `cut_line_note` stays null and `settings_known` stays false because neither provider path
 * below reads playoff settings yet. Per the data plan, likelihood and clinch/elimination
 * scenarios are explicitly out of v1 — this carries verified current position and nothing more.
 */
function playoffPicture(teams) {
  const mine = (teams || []).find((team) => team?.is_current_user);
  if (!mine || !Number.isFinite(Number(mine.rank)) || Number(mine.rank) < 1) return null;

  const rank = Number(mine.rank);
  const total = teams.length;
  return {
    rank,
    team_count: total,
    line: `${ordinal(rank)} of ${total}`,
    cut_line_note: null,
    settings_known: false,
  };
}

function ordinal(n) {
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? "th"
    : n % 10 === 1 ? "st"
      : n % 10 === 2 ? "nd"
        : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

async function sleeperOverview(connection, context) {
  const sleeperUserId = connection.platform_user_id
    || (connection.platform_username
      ? (await sleeperAdapter.fetchSleeperUser(connection.platform_username)).user_id
      : null);

  if (!sleeperUserId) {
    const err = new Error("Sleeper connection is missing user context");
    err.status = 404;
    throw err;
  }

  const [league, standings] = await Promise.all([
    sleeperAdapter.fetchSleeperLeague(connection.league_id),
    sleeperAdapter.fetchSleeperStandings(connection.league_id, sleeperUserId),
  ]);

  // The matchup is a SEPARATE failure domain from standings. A dead matchup read returns
  // `status: "unavailable"` beside live standings rather than failing the request.
  let matchup = { status: "unavailable", you: null, opponent: null, unavailable_reason: "provider_failed" };
  try {
    const [roster, matchups] = await Promise.all([
      sleeperAdapter.fetchSleeperRoster(connection.league_id, sleeperUserId),
      sleeperAdapter.fetchSleeperMatchups(connection.league_id, context.week),
    ]);
    matchup = sleeperAdapter.matchupFromMatchups({
      leagueId: connection.league_id,
      week: context.week,
      rosterId: roster?.roster_id,
      matchups,
      standings,
      isPastWeek: false,
    });
  } catch (e) {
    logger.warn("League overview matchup read failed", { err: e.message, platform: "sleeper" });
  }

  return overviewEnvelope(connection, context, {
    league_name: league?.name || null,
    season: Number(league?.season) || context.season,
    matchup,
    standings: {
      status: standings.length ? "available" : "off_season",
      playoff_picture: playoffPicture(standings),
      teams: standings,
    },
  });
}

async function espnOverview(connection, userId, context) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const standings = await espnAdapter.buildLeagueStandings(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    { seasonId: context.season, week: context.week, teamId: connection.espn_team_id }
  );

  let matchup = { status: "unavailable", you: null, opponent: null, unavailable_reason: "provider_failed" };
  try {
    matchup = await espnAdapter.fetchEspnMatchup(
      connection.league_id,
      credentials.espn_s2,
      credentials.swid,
      { seasonId: context.season, week: context.week, teamId: connection.espn_team_id, standings }
    );
  } catch (e) {
    logger.warn("League overview matchup read failed", { err: e.message, platform: "espn" });
  }

  return overviewEnvelope(connection, context, {
    matchup,
    standings: {
      status: standings.length ? "available" : "off_season",
      playoff_picture: playoffPicture(standings),
      teams: standings,
    },
  });
}

/**
 * Yahoo is not a degraded provider on this screen — it is an unavailable one while its
 * entitlement story is unsettled. It returns standings through the existing path and an
 * explicitly unavailable matchup rather than a fabricated one.
 */
async function yahooOverview(connection, userId, context) {
  const standingsEnvelope = await yahooStandings(connection, userId, context);
  return overviewEnvelope(connection, context, {
    league_name: standingsEnvelope.league_name,
    season: standingsEnvelope.season,
    week: standingsEnvelope.week,
    matchup: {
      status: "unavailable",
      you: null,
      opponent: null,
      unavailable_reason: "provider_unsupported",
    },
    standings: {
      status: standingsEnvelope.standings.length ? "available" : "off_season",
      playoff_picture: playoffPicture(standingsEnvelope.standings),
      teams: standingsEnvelope.standings,
    },
  });
}

function fetchOverview(connection, userId, context) {
  if (connection.platform === "sleeper") return sleeperOverview(connection, context);
  if (connection.platform === "espn") return espnOverview(connection, userId, context);
  if (connection.platform === "yahoo") return yahooOverview(connection, userId, context);
  const err = new Error(`Unsupported platform: ${connection.platform}`);
  err.status = 400;
  return Promise.reject(err);
}

router.get("/overview", requireAuth, async (req, res, next) => {
  const platform = normalizePlatform(req.query.platform);
  const leagueId = normalizeLeagueId(req.query.leagueId);

  if (platform && !VALID_PLATFORMS.has(platform)) {
    const result = errorEnvelope({ code: "invalid_platform", status: 400 });
    return res.status(result.status).json(result.body);
  }

  try {
    const context = getCurrentNflWeekContext();
    const rows = await getConnectionRows(req.user.id);
    const candidates = selectConnections(rows, { platform, leagueId });

    if (!candidates.length) {
      const result = errorEnvelope({ code: "league_not_connected", status: 404 });
      return res.status(result.status).json(result.body);
    }

    if (suppressLiveFootballData()) {
      return res.json(overviewEnvelope(candidates[0], context, {
        matchup: { status: "unavailable", you: null, opponent: null, unavailable_reason: "off_season" },
        standings: { status: "off_season", playoff_picture: null, teams: [] },
      }));
    }

    const failures = [];
    for (const connection of candidates) {
      try {
        return res.json(await fetchOverview(connection, req.user.id, context));
      } catch (e) {
        failures.push({
          platform: connection.platform,
          status: typeof e?.status === "number" ? e.status : null,
        });
        logger.warn("League overview provider failed, trying next", {
          err: e.message,
          platform: connection.platform,
        });
      }
    }

    logger.error("All league overview providers failed", {
      attempted: failures.map((f) => `${f.platform}:${f.status || "error"}`).join(","),
    });

    const authFailure = failures.find((f) => f.status === 401 || f.status === 404);
    if (authFailure) {
      const result = errorEnvelope({
        code: providerAuthCode(authFailure.platform),
        status: authFailure.status,
        platform: authFailure.platform,
      });
      return res.status(result.status).json(result.body);
    }

    const result = errorEnvelope({
      code: "league_standings_provider_failed",
      status: 502,
      platform: failures[0]?.platform || null,
    });
    return res.status(result.status).json(result.body);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.selectConnection = selectConnection;
module.exports.selectConnections = selectConnections;
module.exports.connectionUsable = connectionUsable;
module.exports.errorEnvelope = errorEnvelope;
module.exports.playoffPicture = playoffPicture;
module.exports.emptyActivity = emptyActivity;
module.exports.ordinal = ordinal;
