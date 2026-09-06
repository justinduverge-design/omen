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
const { connectionForLeague } = require("../services/leagueDiscovery");
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

/**
 * Candidates for a request, widened to leagues the user follows but has not bound.
 *
 * `selectConnections` filters on `row.league_id`, so it can only ever match the ONE
 * league bound on a connection. That was fine while a user had one league per provider.
 * The Command Center carousel swipes across every league the user follows, and asking
 * for the second one used to 404 — not because Omen could not read it, but because no
 * row named it. Provider credentials are per-account, so the adapters can read any
 * league the account belongs to.
 *
 * Only reached when the ordinary lookup found nothing AND the caller named a league, so
 * the common path costs no extra provider call. The widened lookup asks the provider to
 * confirm the league genuinely belongs to the account before serving it — a client id is
 * never trusted on its own.
 */
async function candidatesForRequest(rows, { platform, leagueId, userId, season }) {
  const bound = selectConnections(rows, { platform, leagueId });
  if (bound.length || !leagueId) return bound;

  const widened = await connectionForLeague(rows, {
    platform,
    leagueId,
    userId,
    season,
    isUsable: connectionUsable,
  });
  return widened ? [widened] : [];
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
  // `league_name` was omitted here while Sleeper and Yahoo both supplied it, so every ESPN
  // envelope reported a null league name. The name was already in the `mSettings` response
  // this call has always made; it was simply never read.
  const { league_name, standings } = await espnAdapter.buildLeagueContext(
    connection.league_id,
    credentials.espn_s2,
    credentials.swid,
    {
      seasonId: context.season,
      week: context.week,
      teamId: connection.espn_team_id,
    }
  );

  return baseEnvelope(connection, context, { league_name, standings });
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
    const candidates = await candidatesForRequest(rows, {
      platform, leagueId, userId: req.user.id, season: context.season,
    });

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
 * Step 2 — standings-derived activity signals.
 *
 * Every signal here is deterministic and checkable against the standings payload it came from.
 * Nothing is inferred, and no likelihood is stated: §2.1 keeps probability behind its own
 * evidence gate, so this reports position facts only.
 *
 * `playoffTeams` gates all of it. Until 2026-08-30 nothing read it, which is why
 * `settings_known` was hardcoded `false` and this panel could never populate — the data plan
 * sequenced these signals as needing no provider work while every one of them required a field
 * no provider path parsed. It was in the Sleeper league object all along (M11A).
 *
 * The **deadline** signal is deliberately absent. `settings.trade_deadline` is a WEEK NUMBER,
 * not a date, so "in 12 days" needs a week-to-date conversion through the NFL schedule. That is
 * step 3, and guessing it here would be exactly the invention this contract exists to prevent.
 */
function standingsActivity(teams, playoffTeams) {
  const rows = Array.isArray(teams) ? teams : [];
  const cut = Number(playoffTeams);
  if (!rows.length || !Number.isFinite(cut) || cut < 1 || cut >= rows.length) {
    return emptyActivity();
  }

  const items = [];
  const ranked = rows.filter((t) => Number.isFinite(Number(t?.rank)))
    .sort((a, b) => Number(a.rank) - Number(b.rank));

  const lastIn = ranked[cut - 1];
  const firstOut = ranked[cut];
  const record = (t) => (Number.isFinite(Number(t?.wins)) && Number.isFinite(Number(t?.losses))
    ? `${Number(t.wins)}-${Number(t.losses)}`
    : null);

  // Tied at the cut line — two or more teams with identical W-L across the boundary.
  const lastInRecord = record(lastIn);
  if (lastInRecord && lastInRecord === record(firstOut)) {
    items.push({
      category: "standings",
      text: "Two teams are tied for the final playoff spot.",
      source: "derived_standings",
    });
  }

  // Cut-line proximity — the caller's own team within one game of the boundary, either side.
  const mine = rows.find((t) => t?.is_current_user);
  const myRank = Number(mine?.rank);
  if (mine && Number.isFinite(myRank)) {
    const inside = myRank <= cut;
    const boundary = inside ? firstOut : lastIn;
    const myWins = Number(mine.wins);
    const theirWins = Number(boundary?.wins);
    if (Number.isFinite(myWins) && Number.isFinite(theirWins)) {
      const games = Math.abs(myWins - theirWins);
      if (games <= 1) {
        items.push({
          category: "standings",
          text: inside
            ? "You are one game from the playoff cut line."
            : "You are one game out of the playoff cut line.",
          source: "derived_standings",
        });
      }
    }
  }

  if (!items.length) return emptyActivity();

  return {
    // `partial`, not `available`: standings signals are live and the transactions family is
    // still missing. The contract requires `unavailable_families` whenever status is partial,
    // so the screen can name which half is absent rather than implying full coverage.
    status: "partial",
    unavailable_families: ["transactions"],
    // §14.2 caps items at three and the SERVER enforces it; the client never trims.
    items: items.slice(0, 3),
  };
}

/**
 * Playoff position, stated only as far as the payload supports it.
 *
 * `playoffTeams` is the league's own playoff-team count when the provider supplies it. Absent
 * it, `settings_known` stays `false` and `cut_line_note` stays null — position without a
 * boundary is still a true statement, and inventing the boundary is not.
 *
 * Likelihood, clinch, and elimination stay out per §2.1. This reports where the team sits and,
 * when the league says where the line is, how far it is from that line. Nothing more.
 */
function playoffPicture(teams, playoffTeams) {
  const mine = (teams || []).find((team) => team?.is_current_user);
  if (!mine || !Number.isFinite(Number(mine.rank)) || Number(mine.rank) < 1) return null;

  const rank = Number(mine.rank);
  const total = teams.length;
  const cut = Number(playoffTeams);
  const known = Number.isFinite(cut) && cut >= 1 && cut < total;

  return {
    rank,
    team_count: total,
    line: known
      ? `${ordinal(rank)} of ${total} · ${rank <= cut ? "in a playoff spot" : "outside the cut line"}`
      : `${ordinal(rank)} of ${total}`,
    cut_line_note: known ? cutLineNote(teams, rank, cut) : null,
    settings_known: known,
  };
}

/** Games clear of, or back from, the playoff boundary. Null unless both records are present. */
function cutLineNote(teams, rank, cut) {
  const ranked = (teams || []).filter((t) => Number.isFinite(Number(t?.rank)))
    .sort((a, b) => Number(a.rank) - Number(b.rank));
  const mine = ranked.find((t) => Number(t.rank) === rank);
  const inside = rank <= cut;
  const boundary = inside ? ranked[cut] : ranked[cut - 1];

  const myWins = Number(mine?.wins);
  const theirWins = Number(boundary?.wins);
  if (!Number.isFinite(myWins) || !Number.isFinite(theirWins)) return null;

  const games = Math.abs(myWins - theirWins);
  if (games === 0) return inside ? "Level with the cut line" : "Level with the cut line";
  const plural = games === 1 ? "game" : "games";
  return inside ? `${games} ${plural} clear of the cut line` : `${games} ${plural} back of the cut line`;
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

  // M11A proved this field arrives on a live Sleeper league: `settings.playoff_teams`, an int.
  // Nothing read it before 2026-08-30, which is the whole reason `settings_known` was false and
  // the activity panel could never populate.
  const playoffTeams = Number(league?.settings?.playoff_teams);

  return overviewEnvelope(connection, context, {
    league_name: league?.name || null,
    season: Number(league?.season) || context.season,
    matchup,
    standings: {
      status: standings.length ? "available" : "off_season",
      playoff_picture: playoffPicture(standings, playoffTeams),
      teams: standings,
    },
    activity: standingsActivity(standings, playoffTeams),
  });
}

async function espnOverview(connection, userId, context) {
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const { league_name: espnLeagueName, standings } = await espnAdapter.buildLeagueContext(
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
    league_name: espnLeagueName,
    matchup,
    standings: {
      // No playoff-team count: ESPN's settings field is M11A claim 3 and is still unproven.
      // Passing `undefined` keeps `settings_known: false`, which is the honest answer.
      playoff_picture: playoffPicture(standings, undefined),
      status: standings.length ? "available" : "off_season",
      teams: standings,
    },
  });
}

/**
 * Yahoo's matchup, read from `/league/{key}/scoreboard`.
 *
 * This function used to return `unavailable / provider_unsupported` unconditionally, above a
 * comment reading "Yahoo is not a degraded provider on this screen — it is an unavailable one
 * while its entitlement story is unsettled". **That entitlement was granted on 2026-08-28**
 * and verified live (facts-of-record #11); the refusal here outlived its cause by nine days,
 * and the screen kept saying Yahoo could not answer while Yahoo was answering.
 *
 * Probed live 2026-09-06 before this was written, rather than assumed: the scoreboard returns
 * a full matchup, and Yahoo supplies a **projected total and a win probability per side** —
 * neither of which ESPN's `mMatchup` gives us.
 *
 * A failed read degrades to `provider_failed` like every other provider, and a week with no
 * game degrades to `no_matchup`. Neither is `provider_unsupported` any more, because that
 * statement is no longer true.
 */
async function yahooOverview(connection, userId, context) {
  const standingsEnvelope = await yahooStandings(connection, userId, context);

  let matchup = { status: "unavailable", you: null, opponent: null, unavailable_reason: "provider_failed" };
  try {
    const { client } = await getAuthenticatedYahooClient(userId);
    const teamKey = await client.getMyTeamKey(connection.league_id);
    const week = standingsEnvelope.week || context.week;
    const read = teamKey ? await client.getMatchup(connection.league_id, teamKey, week) : null;
    if (read) {
      matchup = yahooMatchupEnvelope(read, standingsEnvelope.standings);
    } else if (teamKey) {
      // The scoreboard was readable and carried no game for this team — a bye, not a failure.
      matchup = { status: "no_matchup", you: null, opponent: null };
    }
  } catch (e) {
    logger.warn("League overview matchup read failed", { err: e.message, platform: "yahoo" });
  }

  return overviewEnvelope(connection, context, {
    league_name: standingsEnvelope.league_name,
    season: standingsEnvelope.season,
    week: standingsEnvelope.week,
    matchup,
    standings: {
      status: standingsEnvelope.standings.length ? "available" : "off_season",
      // Yahoo's playoff-team count is a separate settings read Omen has not mapped yet.
      playoff_picture: playoffPicture(standingsEnvelope.standings, undefined),
      teams: standingsEnvelope.standings,
    },
  });
}

/**
 * Yahoo's own matchup status vocabulary, mapped to the contract's.
 *
 * `preevent` is Yahoo's word for "the week has not started", which is `pregame` here. Anything
 * unrecognised falls to `live` only when points have actually been scored — inferring "live"
 * from an unknown status alone would report a game in progress that may not have started.
 */
function yahooMatchupEnvelope(read, standings = []) {
  const side = (raw) => {
    if (!raw) return null;
    const row = standings.find((team) => String(team?.team_id) === String(raw.team_id)) || null;
    return {
      team_id: raw.team_id,
      team_name: raw.team_name || row?.team_name || null,
      record: row && row.wins != null && row.losses != null ? `${row.wins}-${row.losses}` : null,
      points: raw.points,
      projected: raw.projected,
    };
  };

  const you = side(read.you);
  const opponent = side(read.opponent);
  const status = String(read.status || "").toLowerCase();
  const scored = (you?.points ?? 0) > 0 || (opponent?.points ?? 0) > 0;

  let mapped;
  if (status === "postevent") mapped = "final";
  else if (status === "preevent") mapped = "pregame";
  else if (status === "midevent") mapped = "live";
  else mapped = scored ? "live" : "pregame";

  return { status: mapped, you, opponent, game_id: `yahoo:${read.week}:${you?.team_id}:${opponent?.team_id}` };
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
    const candidates = await candidatesForRequest(rows, {
      platform, leagueId, userId: req.user.id, season: context.season,
    });

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
module.exports.standingsActivity = standingsActivity;
module.exports.emptyActivity = emptyActivity;
module.exports.ordinal = ordinal;
