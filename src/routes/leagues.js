"use strict";

/**
 * Provider-neutral league directory and active-league selection.
 *
 * Serves the approved team/league switcher sheet (visual briefs §10.2/§10.3).
 * Before this route existed the app had Sleeper league discovery behind a
 * connect-flow POST and a Yahoo-only `GET /api/yahoo/leagues`, and no way at all
 * to ask "what leagues do I have" or to say "use this one".
 *
 * SECURITY: ESPN cookie values must never be logged, echoed, or returned
 * (facts-of-record #6). This route reads credentials only to resolve a team name
 * and never places them in a response or a log line.
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { logger } = require("../middleware/logging");
const { requireAuth } = require("../middleware/auth");
const { getAuthenticatedYahooClient } = require("../services/yahooAuth");
const { getAuthenticatedEspnCredentials } = require("../services/espnAuth");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");
const sleeperAdapter = require("../adapters/sleeper");
const espnAdapter = require("../adapters/espn");
const {
  SELECTION_COLUMN,
  isMissingColumnError,
  readConnectionsWithSelection,
  resolveActiveConnection,
  usableLeagueId,
} = require("../services/activeSelection");
const {
  readFollows,
  replaceFollows,
  orderPlatformsByFollowCount,
} = require("../services/leagueFollows");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const DIRECTORY_CONTRACT = "league-directory.v1";
const SELECTION_CONTRACT = "league-active-selection.v1";
const FOLLOWS_CONTRACT = "league-follows.v1";
const ERROR_CONTRACT = "league-directory-error.v1";

// Which providers exist. NOT the order they render in — that is now derived from the
// user's own leagues by `orderPlatformsByFollowCount`, per the Command Center carousel
// rule: most leagues first, ties alphabetical. §10.2 asks for an order that is stable
// across visits, and a count-plus-alphabet order is: it moves only when the user's
// leagues do.
const PLATFORM_GROUP_ORDER = Object.freeze(["sleeper", "espn", "yahoo"]);
const VALID_PLATFORMS = new Set(PLATFORM_GROUP_ORDER);

const CONNECTION_COLUMNS =
  "platform,is_active,league_id,platform_username,platform_user_id,token_secret_id,espn_secret_id,swid_secret_id,espn_team_id,updated_at";

function nowIso() {
  return new Date().toISOString();
}

function errorBody({ code, message, action, platform = null }) {
  return {
    contract_version: ERROR_CONTRACT,
    error: "League directory unavailable",
    code,
    message,
    action,
    ...(platform ? { platform } : {}),
  };
}

/** Credentials present, independent of whether a league is bound yet. */
function credentialsPresent(row) {
  if (row?.platform === "yahoo") return Boolean(row.token_secret_id);
  if (row?.platform === "sleeper") return Boolean(row.platform_username || row.platform_user_id);
  if (row?.platform === "espn") return Boolean(row.espn_secret_id && row.swid_secret_id);
  return false;
}

function connectionState(row) {
  if (!row || !row.is_active) return "not_connected";
  return credentialsPresent(row) ? "connected" : "reconnect_required";
}

function sleeperScoringFormat(league) {
  const rec = Number(league?.scoring_settings?.rec);
  if (rec === 0) return "standard";
  if (rec === 0.5) return "half_ppr";
  if (rec === 1) return "ppr";
  // An unrecognised reception value is a real league rule Omen has not mapped.
  // Naming it beats defaulting to PPR — that default is the A6 defect.
  return Number.isFinite(rec) ? "unmapped" : null;
}

function leagueEntry({ leagueId, leagueName, season, scoringFormat = null, teamId = null, teamName = null }) {
  return {
    league_id: String(leagueId),
    league_name: leagueName || null,
    season: Number(season) || null,
    scoring_format: scoringFormat,
    team_id: teamId == null ? null : String(teamId),
    team_name: teamName || null,
    is_active: false,
  };
}

/** §10.2: alphabetical by league name within a platform, then by team. */
function sortLeagues(leagues) {
  return [...leagues].sort((a, b) => {
    const byLeague = String(a.league_name || "").localeCompare(String(b.league_name || ""));
    if (byLeague !== 0) return byLeague;
    return String(a.team_name || "").localeCompare(String(b.team_name || ""));
  });
}

async function sleeperLeagues(row, season) {
  const userId = row.platform_user_id
    || (row.platform_username ? (await sleeperAdapter.fetchSleeperUser(row.platform_username)).user_id : null);
  if (!userId) return { discovery: "unavailable", leagues: [], notice: "Sleeper connection is missing user context." };

  const leagues = await sleeperAdapter.fetchSleeperLeagues(userId, season);
  const entries = await Promise.all((leagues || []).map(async (league) => {
    const leagueId = String(league?.league_id || league?.id || "").trim();
    let teamId = null;
    let teamName = null;
    try {
      const roster = await sleeperAdapter.fetchSleeperRoster(leagueId, userId);
      teamId = roster?.roster_id == null ? null : String(roster.roster_id);
      const users = Array.isArray(roster?.users) ? roster.users : [];
      const me = users.find((u) => String(u.user_id) === String(userId));
      teamName = me?.metadata?.team_name || me?.display_name || me?.username || null;
    } catch {
      // §10.2 still needs the league row even when the roster lookup drifts.
    }
    return leagueEntry({
      leagueId,
      leagueName: league?.name,
      season: league?.season || season,
      scoringFormat: sleeperScoringFormat(league),
      teamId,
      teamName,
    });
  }));

  return { discovery: "full", leagues: entries.filter((e) => e.league_id), notice: null };
}

async function yahooLeagues(row, userId) {
  const { client } = await getAuthenticatedYahooClient(userId);
  // The team-bearing variant, which falls back to `getUserLeagues()` if Yahoo does not
  // describe teams on that path. A missing team name is cosmetic; a missing league list is not.
  const leagues = await client.getUserLeaguesWithTeams();
  return {
    discovery: "full",
    leagues: (leagues || []).map((league) => leagueEntry({
      leagueId: league.league_id,
      leagueName: league.name,
      season: league.season,
      // Null, not guessed — the A6 rule. The reason is no longer entitlement:
      // Yahoo's access has been live since 2026-08-28 (facts-of-record #11) and
      // `/league/{key}/settings` demonstrably returns `scoring_type`,
      // `stat_categories` and `stat_modifiers` (verified 2026-09-06). Nothing
      // reads or maps them yet, so this stays null until something does.
      // Making it real is a separate piece of work, not a comment fix.
      scoringFormat: null,
      // Yahoo rows carried no team at all until 2026-09-05, so every Yahoo league in the
      // switcher fell back to its league name and a user with two Yahoo teams could not tell
      // them apart. `getUserLeagues` now returns the team with the league, at no extra request.
      teamId: league.team_id,
      teamName: league.team_name,
    })),
    notice: null,
  };
}

/**
 * ESPN league discovery, from credentials already stored at connect time.
 *
 * **This used to be `bound_only` and it no longer has to be.** The old comment here
 * said "ESPN publishes no league-discovery endpoint Omen is entitled to use", and that
 * was true of `lm-api-reads`, which can only answer about a league you already name. It
 * was never true of the fan API — the endpoint ESPN's own site uses to render "My
 * Teams" — which W1-A wired up for the connect flow as `POST /platforms/espn/leagues`.
 * That route takes cookies straight from the sign-in web view. The same call works just
 * as well against the cookies already in Vault, which is what this does.
 *
 * The practical consequence: an ESPN user with three leagues now sees three rows here,
 * not one, and the Command Center carousel can swipe across them. Nothing about that
 * needed a schema change — the leagues were always discoverable, nothing had asked.
 *
 * Falls back to the bound league, and to the old `bound_only` notice, whenever
 * discovery cannot run. A failed lookup must not shrink a working connection to zero
 * leagues.
 *
 * SECURITY: credentials are read to make the call and never returned or logged
 * (facts-of-record #6). The adapter strips query strings from its failure reports.
 */
/**
 * Resolve each discovered ESPN league's team from the league itself.
 *
 * ## Why discovery's own team fields are not trusted
 *
 * The fan payload's `entry.name` and `entry.entryId` were never confirmed in ESPN's own client
 * bundle (see `fanLeaguesFromPreferences`), and the beta bore that out: ESPN rows arrived in the
 * switcher with no team name, so every one of them rendered as "Your team".
 *
 * `entryId` is worse than cosmetic. It is an ESPN *entry* identifier, not the 1..n `team.id`
 * scoped to a league, and `POST /api/leagues/active` writes whatever `team_id` this route
 * published into `platform_connections.espn_team_id`. That column is then passed as `teamId` to
 * every roster, waiver, matchup and start/sit read, where `findUserTeam` matches it strictly
 * against `team.id`. A wrong id there does not degrade — it throws "ESPN team not found in this
 * league" on a league the user can plainly see.
 *
 * So the league read is the authority for both fields. `verifyLeagueAccess` with a null team id
 * matches on SWID — the same ownership test every other ESPN surface uses — and returns ESPN's
 * own `location` + `nickname`.
 *
 * Bounded on purpose: one read per league, run in parallel because they are independent and a
 * user is waiting on this screen, and a failure keeps discovery's values rather than dropping the
 * league. A league you cannot name is a worse row; a league that vanished is a worse bug.
 */
async function resolveEspnTeams(leagues, credentials) {
  if (!credentials) return leagues;
  return Promise.all(leagues.map(async (league) => {
    let team = null;
    try {
      team = await espnAdapter.verifyLeagueAccess(
        league.league_id, credentials.espn_s2, credentials.swid, null
      );
    } catch {
      // SWID did not match a team — a shared or delegated account can do this. Discovery's id is
      // the only other claim available, so it gets one attempt rather than none.
      if (!league.team_id) return league;
      try {
        team = await espnAdapter.verifyLeagueAccess(
          league.league_id, credentials.espn_s2, credentials.swid, league.team_id
        );
      } catch {
        // Never surface the ESPN failure detail here; the connection state field carries it.
        return league;
      }
    }
    if (!team) return league;
    return {
      ...league,
      team_id: team.team_id == null ? league.team_id : String(team.team_id),
      team_name: team.team_name || league.team_name || null,
    };
  }));
}

async function espnLeagues(row, userId, season) {
  const boundId = usableLeagueId(row) ? String(row.league_id) : null;

  let credentials;
  try {
    credentials = await getAuthenticatedEspnCredentials(userId);
  } catch {
    credentials = null;
  }

  if (credentials) {
    try {
      const discovered = await espnAdapter.fetchEspnFanLeagues(
        credentials.espn_s2,
        credentials.swid,
        { season }
      );
      if (discovered.length) {
        const named = await resolveEspnTeams(discovered, credentials);
        return {
          discovery: "full",
          leagues: named.map((league) => leagueEntry({
            leagueId: league.league_id,
            leagueName: league.league_name,
            season: league.season || season,
            // ESPN's scoring rules are a separate read Omen has not mapped. Null, not
            // guessed — guessing PPR here is the A6 defect.
            scoringFormat: null,
            teamId: league.team_id,
            teamName: league.team_name,
          })),
          notice: null,
        };
      }
    } catch {
      // Discovery is best-effort. The bound league below is still a true answer.
    }
  }

  if (!boundId) {
    return { discovery: "bound_only", leagues: [], notice: "ESPN has no league bound to this connection yet." };
  }

  let teamId = row.espn_team_id == null ? null : String(row.espn_team_id);
  let teamName = null;
  if (credentials) {
    try {
      const team = await espnAdapter.verifyLeagueAccess(
        row.league_id,
        credentials.espn_s2,
        credentials.swid,
        row.espn_team_id || null
      );
      teamId = team?.team_id == null ? teamId : String(team.team_id);
      teamName = team?.team_name || null;
    } catch {
      // Never surface the ESPN failure detail here; the state field carries it.
    }
  }

  return {
    discovery: "bound_only",
    leagues: [leagueEntry({ leagueId: row.league_id, leagueName: null, season, teamId, teamName })],
    notice: "Omen couldn't ask ESPN for your full league list, so only the connected league is shown.",
  };
}

function discoveryFailure(platform, error) {
  logger.warn("League discovery failed", { platform, err: error?.message });
  return {
    discovery: "unavailable",
    leagues: [],
    notice: platform === "yahoo" && /token_expired/.test(error?.message || "")
      ? "Yahoo needs to be reconnected before its leagues can be listed."
      : "Omen could not reach this platform to list leagues.",
  };
}

async function platformGroup(platform, row, userId, season, followed) {
  const state = connectionState(row);
  if (state !== "connected") {
    return { platform, connection_state: state, discovery: "unavailable", notice: null, leagues: [] };
  }

  let result;
  try {
    if (platform === "sleeper") result = await sleeperLeagues(row, season);
    else if (platform === "yahoo") result = await yahooLeagues(row, userId);
    else result = await espnLeagues(row, userId, season);
  } catch (error) {
    result = discoveryFailure(platform, error);
  }

  const boundLeagueId = usableLeagueId(row) ? String(row.league_id) : null;
  // `followed` is null when the follow table is absent, which means "the user has not
  // been able to choose a subset yet". Everything discovered is then followed — the
  // honest reading, and exactly what every surface did before follows existed. An empty
  // Set is a different fact: the user chose nothing, and nothing is followed.
  const leagues = sortLeagues(result.leagues).map((league) => ({
    ...league,
    is_active: boundLeagueId != null && league.league_id === boundLeagueId,
    is_followed: followed == null ? true : followed.has(league.league_id),
  }));

  return { platform, connection_state: state, discovery: result.discovery, notice: result.notice, leagues };
}

function activeSummary(rows, groups) {
  const connection = resolveActiveConnection(rows, { isUsable: (row) => usableLeagueId(row) && credentialsPresent(row) });
  if (!connection) return null;

  const group = groups.find((g) => g.platform === connection.platform);
  const league = (group?.leagues || []).find((l) => l.is_active) || null;

  return {
    platform: connection.platform,
    league_id: String(connection.league_id),
    league_name: league?.league_name || null,
    season: league?.season || null,
    scoring_format: league?.scoring_format || null,
    team_id: league?.team_id || (connection.espn_team_id == null ? null : String(connection.espn_team_id)),
    team_name: league?.team_name || null,
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const season = getCurrentNflWeekContext().season;
    const { rows, selectionPersisted } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const byPlatform = new Map(rows.map((row) => [row.platform, row]));
    const { follows, followsPersisted } = await readFollows(supabase, req.user.id);

    // Per platform: the followed set, or null meaning "no stored choice exists".
    const followedByPlatform = new Map();
    if (followsPersisted) {
      for (const platform of PLATFORM_GROUP_ORDER) followedByPlatform.set(platform, new Set());
      for (const follow of follows) {
        const set = followedByPlatform.get(follow.platform);
        if (set) set.add(String(follow.league_id));
      }
    }

    const groups = [];
    for (const platform of PLATFORM_GROUP_ORDER) {
      groups.push(await platformGroup(
        platform,
        byPlatform.get(platform),
        req.user.id,
        season,
        followedByPlatform.get(platform) ?? null
      ));
    }

    return res.json({
      contract_version: DIRECTORY_CONTRACT,
      generated_at: nowIso(),
      season,
      selection_persistence: selectionPersisted ? "explicit" : "provider_binding_only",
      // Whether a multiselect the user makes will survive the session. `false` until
      // `sql/2026-09-03_multi_league_follows_review.sql` is applied, and the picker says
      // so rather than pretending a choice stuck.
      follow_persistence: followsPersisted ? "explicit" : "unavailable",
      active: activeSummary(rows, groups),
      // Providers ordered most-leagues-first, ties alphabetical. The client renders its
      // filter chips and its carousel in this order and does not re-sort.
      platforms: orderPlatformsByFollowCount(groups),
    });
  } catch (e) {
    logger.error("League directory lookup failed", { err: e.message });
    return next(e);
  }
});

/**
 * Every league id the provider says this account actually plays in.
 *
 * One provider round trip serves any number of ids to check, which is what makes the
 * multiselect endpoint below affordable: verifying five leagues one at a time would be
 * five identical discovery calls.
 *
 * ESPN now participates like the others — `fetchEspnFanLeagues` is the same fan-API read
 * `espnLeagues` uses. When it cannot run, ESPN falls back to the one verifiable claim
 * there has always been: the bound league.
 */
async function discoverLeagueIds(platform, row, userId, season) {
  if (platform === "yahoo") {
    const { client } = await getAuthenticatedYahooClient(userId);
    const leagues = await client.getUserLeagues();
    return new Set((leagues || []).map((league) => String(league.league_id)));
  }
  if (platform === "sleeper") {
    const sleeperUserId = row.platform_user_id
      || (row.platform_username ? (await sleeperAdapter.fetchSleeperUser(row.platform_username)).user_id : null);
    if (!sleeperUserId) return new Set();
    const leagues = await sleeperAdapter.fetchSleeperLeagues(sleeperUserId, season);
    return new Set((leagues || []).map((league) => String(league.league_id || league.id)));
  }

  try {
    const credentials = await getAuthenticatedEspnCredentials(userId);
    const leagues = await espnAdapter.fetchEspnFanLeagues(credentials.espn_s2, credentials.swid, { season });
    if (leagues.length) return new Set(leagues.map((league) => String(league.league_id)));
  } catch {
    // Fall through to the bound league rather than rejecting a connection that works.
  }
  return usableLeagueId(row) ? new Set([String(row.league_id)]) : new Set();
}

/** The league must be one the user genuinely has — never trust the client's id. */
async function assertLeagueBelongsToUser(platform, row, leagueId, userId, season) {
  return (await discoverLeagueIds(platform, row, userId, season)).has(leagueId);
}

/**
 * The team this user owns in one ESPN league.
 *
 * A client-supplied id is trusted only after ESPN confirms it, because it is the field that was
 * silently wrong. Everything else asks ESPN, which resolves the caller's own team from the SWID
 * when given no team id.
 *
 * Returns `null` when ESPN cannot be reached. That is deliberate: an unknown team id is
 * recoverable — the adapters resolve it again on the next read — while a stale one renders
 * another manager's roster as the user's own.
 */
async function resolveEspnTeamId(userId, leagueId, requestedTeamId) {
  try {
    const credentials = await getAuthenticatedEspnCredentials(userId);
    const team = await espnAdapter.verifyLeagueAccess(
      leagueId,
      credentials.espn_s2,
      credentials.swid,
      requestedTeamId ?? null
    );
    return team?.team_id == null ? null : String(team.team_id);
  } catch {
    // Never surface the ESPN failure detail here; the connection state field carries it.
    return null;
  }
}

async function persistSelection(userId, platform, leagueId, teamId) {
  const patch = { league_id: leagueId, updated_at: nowIso() };
  // **Always write the ESPN team id, including null.**
  //
  // This used to be `if (teamId != null)`, so a switch that supplied no team id left the
  // previous league's team id in place. `league_id` changed and `espn_team_id` did not, and the
  // connection then described a team the user does not own: the founder's row pointed at league
  // 517756847 with team 1 — his team id in a *different* league, 13338821 — while ESPN said he
  // is team 8 there. Omen rendered someone else's team as his.
  //
  // Writing `null` is safe and self-repairing: `verifyLeagueAccess` and `buildNormalizedRoster`
  // both resolve the caller's own team from the SWID when no team id is given, which is exactly
  // how the correct value is recovered. A stale id is worse than no id, because only the stale
  // one is confidently wrong.
  if (platform === "espn") patch.espn_team_id = teamId ?? null;

  const clearOthers = async () => {
    const { error } = await supabase
      .from("platform_connections")
      .update({ [SELECTION_COLUMN]: false })
      .eq("user_id", userId)
      .neq("platform", platform);
    if (error && !isMissingColumnError(error)) {
      throw new Error(`platform_connections update failed: ${error.message}`);
    }
    return !error;
  };

  // **Clear first, then set.** `platform_connections_one_selected_per_user` is
  // `UNIQUE (user_id) WHERE is_selected`, so a user may have at most one selected row. Setting
  // the new platform before clearing the old one momentarily asks for two, and Postgres rejects
  // the write.
  //
  // That is not theoretical: it 500'd every cross-provider switch in production. Sleeper to
  // Sleeper worked, because the already-selected row is the one being set and no second true
  // row is created — which is exactly why it looked like "ESPN is broken" rather than "switching
  // providers is broken". Reversing the order is the whole fix.
  //
  // The two writes are not one transaction: PostgREST has no transaction across calls, and a
  // stored procedure would need a gated SQL apply (facts-of-record #8). If the second write
  // fails, the user is left with **no** selection rather than the wrong one — which
  // `resolveActiveConnection` handles by falling back to the documented platform order. A
  // missing selection is a recoverable state that the next switch repairs; two selected rows
  // is not a state the schema permits at all.
  const cleared = await clearOthers();

  const withSelection = await supabase
    .from("platform_connections")
    .update({ ...patch, [SELECTION_COLUMN]: true })
    .eq("user_id", userId)
    .eq("platform", platform);

  if (!withSelection.error) {
    // `clearOthers` returning false means the column is absent, so nothing was selected and
    // nothing needed clearing; the write above then also had no column to set.
    return cleared ? "explicit" : "provider_binding_only";
  }
  if (!isMissingColumnError(withSelection.error)) {
    throw new Error(`platform_connections update failed: ${withSelection.error.message}`);
  }

  const { error } = await supabase
    .from("platform_connections")
    .update(patch)
    .eq("user_id", userId)
    .eq("platform", platform);
  if (error) throw new Error(`platform_connections update failed: ${error.message}`);
  return "provider_binding_only";
}

router.post("/active", requireAuth, async (req, res, next) => {
  const platform = String(req.body?.platform || "").trim().toLowerCase();
  const leagueId = String(req.body?.league_id ?? req.body?.leagueId ?? "").trim();
  const rawTeamId = req.body?.team_id ?? req.body?.teamId;
  const teamId = rawTeamId == null || rawTeamId === "" ? null : String(rawTeamId).trim();

  if (!VALID_PLATFORMS.has(platform)) {
    return res.status(400).json(errorBody({
      code: "invalid_platform",
      message: "Choose Sleeper, ESPN, or Yahoo.",
      action: "retry",
    }));
  }
  if (!leagueId) {
    return res.status(400).json(errorBody({
      code: "league_id_required",
      message: "Pick a league to make active.",
      action: "retry",
      platform,
    }));
  }

  try {
    const season = getCurrentNflWeekContext().season;
    const { rows } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const row = rows.find((candidate) => candidate.platform === platform);

    if (connectionState(row) !== "connected") {
      return res.status(404).json(errorBody({
        code: "platform_not_connected",
        message: "Connect this platform before making one of its leagues active.",
        action: "connect",
        platform,
      }));
    }

    let belongs;
    try {
      belongs = await assertLeagueBelongsToUser(platform, row, leagueId, req.user.id, season);
    } catch (error) {
      logger.warn("Active league verification failed", { platform, err: error.message });
      return res.status(502).json(errorBody({
        code: "league_verification_unavailable",
        message: "Omen could not confirm that league with the platform. Try again shortly.",
        action: "retry",
        platform,
      }));
    }

    if (!belongs) {
      return res.status(400).json(errorBody({
        code: "league_not_in_account",
        message: "That league is not one Omen can see on your connected account.",
        action: "retry",
        platform,
      }));
    }

    // Resolve the team the user actually owns in the league being selected, rather than trusting
    // the client to send one. Both native clients call this with no team id today, which is what
    // let a stale id survive a league change; making the server authoritative fixes every client
    // at once and cannot be undone by a future one forgetting the field.
    const resolvedTeamId = platform === "espn"
      ? await resolveEspnTeamId(req.user.id, leagueId, teamId)
      : teamId;

    const persistence = await persistSelection(req.user.id, platform, leagueId, resolvedTeamId);

    return res.json({
      contract_version: SELECTION_CONTRACT,
      generated_at: nowIso(),
      selection_persistence: persistence,
      active: {
        platform,
        league_id: leagueId,
        team_id: platform === "espn" ? (teamId ?? (row.espn_team_id == null ? null : String(row.espn_team_id))) : teamId,
      },
      // §10.3: the caller must refresh these surfaces with the new context.
      refresh: ["command_center", "omen", "league", "waiver_watch", "ledger"],
    });
  } catch (e) {
    logger.error("Active league selection failed", { err: e.message });
    return next(e);
  }
});

/**
 * `POST /api/leagues/follows` → `league-follows.v1`.
 *
 * The multiselect league picker's write. Replaces the followed set for ONE platform,
 * scoped so choosing three ESPN leagues cannot drop the Sleeper league chosen last week.
 *
 * Every submitted id is verified against the provider in a single discovery call before
 * anything is written. An id the account does not play in is rejected outright rather
 * than stored and quietly ignored later — a stored league Omen cannot read is a carousel
 * page that can only ever render an error.
 *
 * The response always reports `follow_persistence`, so a client can tell "saved" apart
 * from "accepted but not stored yet" while
 * `sql/2026-09-03_multi_league_follows_review.sql` is still review-only.
 */
router.post("/follows", requireAuth, async (req, res, next) => {
  const platform = String(req.body?.platform || "").trim().toLowerCase();
  const submitted = Array.isArray(req.body?.leagues) ? req.body.leagues : null;

  if (!VALID_PLATFORMS.has(platform)) {
    return res.status(400).json(errorBody({
      code: "invalid_platform",
      message: "Choose Sleeper, ESPN, or Yahoo.",
      action: "retry",
    }));
  }
  if (!submitted) {
    return res.status(400).json(errorBody({
      code: "leagues_required",
      message: "Pick at least one league to follow.",
      action: "retry",
      platform,
    }));
  }

  const entries = submitted
    .map((entry) => ({
      league_id: String(entry?.league_id ?? entry?.leagueId ?? "").trim(),
      team_id: entry?.team_id ?? entry?.teamId ?? null,
      league_name: entry?.league_name ?? entry?.leagueName ?? null,
      team_name: entry?.team_name ?? entry?.teamName ?? null,
      season: entry?.season ?? null,
    }))
    .filter((entry) => entry.league_id);

  try {
    const season = getCurrentNflWeekContext().season;
    const { rows } = await readConnectionsWithSelection(supabase, req.user.id, CONNECTION_COLUMNS);
    const row = rows.find((candidate) => candidate.platform === platform);

    if (connectionState(row) !== "connected") {
      return res.status(404).json(errorBody({
        code: "platform_not_connected",
        message: "Connect this platform before choosing which of its leagues to follow.",
        action: "connect",
        platform,
      }));
    }

    let owned;
    try {
      owned = await discoverLeagueIds(platform, row, req.user.id, season);
    } catch (error) {
      logger.warn("Follow verification failed", { platform, err: error.message });
      return res.status(502).json(errorBody({
        code: "league_verification_unavailable",
        message: "Omen could not confirm those leagues with the platform. Try again shortly.",
        action: "retry",
        platform,
      }));
    }

    const rejected = entries.filter((entry) => !owned.has(entry.league_id));
    if (rejected.length) {
      return res.status(400).json(errorBody({
        code: "league_not_in_account",
        message: rejected.length === entries.length
          ? "Omen can't see those leagues on your connected account."
          : "One of those leagues isn't on your connected account. Nothing was changed.",
        action: "retry",
        platform,
      }));
    }

    const persisted = await replaceFollows(supabase, req.user.id, platform, entries);

    return res.json({
      contract_version: FOLLOWS_CONTRACT,
      generated_at: nowIso(),
      platform,
      follow_persistence: persisted ? "explicit" : "unavailable",
      followed: entries.map((entry) => entry.league_id),
      // §10.3's rule, applied to a multiselect: the caller re-reads the surfaces a
      // changed league set affects, and the server stays the authority on which.
      refresh: ["command_center", "omen", "league", "waiver_watch", "ledger"],
    });
  } catch (e) {
    logger.error("Follow update failed", { err: e.message });
    return next(e);
  }
});

module.exports = router;
module.exports.connectionState = connectionState;
module.exports.sleeperScoringFormat = sleeperScoringFormat;
module.exports.sortLeagues = sortLeagues;
