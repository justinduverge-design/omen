"use strict";

/**
 * League memberships: which provider leagues each person is in, through which connection
 * (database redo step 03, plan A5).
 *
 * `platform_connections` is the CREDENTIAL, one row per (user, provider). `leagues` is one shared
 * row per (provider, provider_league_id, season). `league_memberships` joins a person to a league
 * through the connection it came from, with `on delete cascade` from that connection: a disconnect
 * removes the memberships with it. So every path that writes a connection must write memberships
 * again, or a reconnect silently loses leagues (observed in production: 10 memberships became 9
 * after an ESPN disconnect and reconnect).
 *
 * Writes are the service role's (step 03 grants clients nothing). This module is the only writer
 * outside the two SQL functions, and it never changes a user's follow choice: a new membership
 * starts followed (plan A5, "a new connection must start followed"); an existing one keeps its
 * `is_followed`, its `source` and its sort order, and only gains facts the provider just told us
 * (connection id, team id, team name). A league the provider no longer lists is marked unfollowed
 * (the schema's status for it), never deleted, and only when the caller says the list was a
 * complete answer.
 *
 * Errors carry the table and Postgres code only. Nothing here touches credentials.
 */

const { getCurrentNflWeekContext } = require("./nflSchedule");

const PLATFORMS = new Set(["espn", "yahoo", "sleeper"]);

// PostgREST: PGRST205 unknown table, PGRST202 unknown function. Postgres: 42P01, 42883.
const MISSING_CODES = new Set(["PGRST205", "42P01", "PGRST202", "42883"]);

const MEMBERSHIP_COLUMNS =
  "league_id,connection_id,provider_team_id,team_name,is_followed,is_active_selection,sort_order,source,"
  + "leagues(provider,provider_league_id,season,name,scoring_format,team_count)";

function isSchemaAbsent(error) {
  if (!error) return false;
  if (MISSING_CODES.has(error.code)) return true;
  return /relation .* does not exist|could not find the (table|function)/i.test(error.message || "");
}

class SchemaAbsent extends Error {}

function dbError(what, error) {
  if (isSchemaAbsent(error)) return new SchemaAbsent(what);
  const err = new Error(`${what} failed (${error?.code || "unknown"})`);
  err.code = error?.code;
  return err;
}

function validSeason(value) {
  const season = Number(value);
  return Number.isInteger(season) && season >= 2000 && season <= 2100 ? season : null;
}

function currentSeason() {
  return getCurrentNflWeekContext().season;
}

function text(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

/** Usable, de-duplicated entries. Drops the Yahoo `"yahoo"` placeholder and empty ids. */
function normalizeEntries(platform, leagues, fallbackSeason) {
  const seen = new Set();
  const entries = [];
  for (const league of leagues || []) {
    const id = text(league?.league_id ?? league?.provider_league_id ?? league?.id);
    if (!id || id === platform || id === "undefined") continue;
    const season = validSeason(league?.season) ?? fallbackSeason;
    const key = `${id}:${season}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const teamCount = Number(league?.team_count);
    entries.push({
      provider_league_id: id,
      season,
      name: text(league?.league_name ?? league?.name),
      scoring_format: text(league?.scoring_format),
      team_count: Number.isInteger(teamCount) && teamCount >= 2 && teamCount <= 32 ? teamCount : null,
      team_id: text(league?.team_id),
      team_name: text(league?.team_name),
    });
  }
  return entries;
}

async function connectionIdFor(supabase, userId, platform) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", platform)
    .maybeSingle();
  if (error) throw dbError("platform_connections lookup", error);
  return data?.id || null;
}

/**
 * Upsert the shared league rows. A column is sent only when known, so an unnamed league never
 * erases the name another member's sync stored. Rows are grouped by which columns they carry
 * because one PostgREST upsert applies one column list to every row.
 */
async function upsertLeagues(supabase, platform, entries, now) {
  const groups = new Map();
  for (const entry of entries) {
    const row = { provider: platform, provider_league_id: entry.provider_league_id, season: entry.season, last_synced_at: now };
    if (entry.name != null) row.name = entry.name;
    if (entry.scoring_format != null) row.scoring_format = entry.scoring_format;
    if (entry.team_count != null) row.team_count = entry.team_count;
    const shape = Object.keys(row).join(",");
    if (!groups.has(shape)) groups.set(shape, []);
    groups.get(shape).push(row);
  }

  const ids = new Map();
  for (const rows of groups.values()) {
    const { data, error } = await supabase
      .from("leagues")
      .upsert(rows, { onConflict: "provider,provider_league_id,season" })
      .select("id,provider_league_id,season");
    if (error) throw dbError("leagues upsert", error);
    for (const league of data || []) ids.set(`${league.provider_league_id}:${league.season}`, league.id);
  }
  return ids;
}

async function readRawMemberships(supabase, userId) {
  const { data, error } = await supabase
    .from("league_memberships")
    .select(MEMBERSHIP_COLUMNS)
    .eq("user_id", userId);
  if (error) throw dbError("league_memberships read", error);
  return data || [];
}

async function updateMembership(supabase, userId, leagueId, patch) {
  const { error } = await supabase
    .from("league_memberships")
    .update(patch)
    .eq("user_id", userId)
    .eq("league_id", leagueId);
  if (error) throw dbError("league_memberships update", error);
}

/**
 * Write the leagues one provider reported for one user.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {"espn"|"yahoo"|"sleeper"} args.platform
 * @param {string} [args.connectionId] the platform_connections id; looked up when absent
 * @param {number} [args.season] fallback season for leagues that carry none
 * @param {Array}  args.leagues [{league_id, league_name?, season?, team_id?, team_name?, scoring_format?, team_count?}]
 * @param {"connect"|"backfill"} [args.source] recorded on NEW memberships only
 * @param {boolean} [args.markMissing] the list is the provider's complete answer for this season:
 *   followed memberships it omits are marked unfollowed
 * @param {string[]} [args.keepLeagueIds] never unfollowed by markMissing (the bound league)
 * @returns {Promise<{persisted: boolean, reason?: string, inserted: number, updated: number, unfollowed: number}>}
 */
async function syncMemberships(supabase, {
  userId,
  platform,
  connectionId = null,
  season = null,
  leagues,
  source = "connect",
  markMissing = false,
  keepLeagueIds = [],
}) {
  if (!userId || !PLATFORMS.has(platform)) throw new Error("syncMemberships: user and a known platform are required");
  const fallbackSeason = validSeason(season) ?? currentSeason();
  const entries = normalizeEntries(platform, leagues, fallbackSeason);
  const counts = { inserted: 0, updated: 0, unfollowed: 0 };
  if (!entries.length) return { persisted: false, reason: "no_leagues", ...counts };

  try {
    const connId = connectionId || await connectionIdFor(supabase, userId, platform);
    if (!connId) return { persisted: false, reason: "no_connection", ...counts };

    const now = new Date().toISOString();
    const leagueIds = await upsertLeagues(supabase, platform, entries, now);
    const existing = new Map((await readRawMemberships(supabase, userId)).map((m) => [m.league_id, m]));

    const inserts = [];
    const discovered = new Set();
    entries.forEach((entry, index) => {
      const leagueId = leagueIds.get(`${entry.provider_league_id}:${entry.season}`);
      if (!leagueId) return;
      discovered.add(leagueId);
      const current = existing.get(leagueId);
      if (!current) {
        inserts.push({
          user_id: userId,
          league_id: leagueId,
          connection_id: connId,
          provider_team_id: entry.team_id,
          team_name: entry.team_name,
          is_followed: true,
          sort_order: index,
          source,
        });
        return;
      }
      const patch = {};
      if (current.connection_id !== connId) patch.connection_id = connId;
      if (entry.team_id != null && entry.team_id !== current.provider_team_id) patch.provider_team_id = entry.team_id;
      if (entry.team_name != null && entry.team_name !== current.team_name) patch.team_name = entry.team_name;
      if (Object.keys(patch).length) current.patch = patch;
    });

    if (inserts.length) {
      // ignoreDuplicates: a concurrent sync that inserted first wins, and its row is kept as is.
      const { error } = await supabase
        .from("league_memberships")
        .upsert(inserts, { onConflict: "user_id,league_id", ignoreDuplicates: true });
      if (error) throw dbError("league_memberships insert", error);
      counts.inserted = inserts.length;
    }

    for (const [leagueId, current] of existing) {
      if (!current.patch) continue;
      await updateMembership(supabase, userId, leagueId, current.patch);
      counts.updated += 1;
    }

    if (markMissing) {
      const keep = new Set((keepLeagueIds || []).map(String));
      const seasons = new Set(entries.map((entry) => entry.season));
      for (const [leagueId, current] of existing) {
        const league = current.leagues;
        if (!league || league.provider !== platform || !seasons.has(Number(league.season))) continue;
        if (discovered.has(leagueId) || keep.has(String(league.provider_league_id))) continue;
        if (!current.is_followed) continue;
        await updateMembership(supabase, userId, leagueId, { is_followed: false, is_active_selection: false });
        counts.unfollowed += 1;
      }
    }

    return { persisted: true, ...counts };
  } catch (error) {
    if (error instanceof SchemaAbsent) return { persisted: false, reason: "schema_absent", ...counts };
    throw error;
  }
}

/**
 * The membership write every connect and reconnect makes. A disconnect cascades the memberships
 * away, so this is what brings them back.
 *
 * `discover(season)` asks the provider for the account's leagues. When it fails, the bound league
 * alone is written (it was just verified, or it is all there is). A bound league the provider did
 * NOT list is added only when the caller verified it (`boundVerified`): a client-supplied id is
 * not proof of membership.
 *
 * `trustDiscoveredTeams: false` drops the discovery payload's team fields. ESPN's fan API reports
 * an entry id there, not the league-scoped team id every other ESPN read matches on; the
 * directory's per-league read fills the real one later.
 *
 * Never throws. Returns the sync result plus `discoveryFailed` and the provider's HTTP status
 * only (a discovery error message can carry a URL, so it is not returned).
 */
async function syncAfterConnect(supabase, {
  userId,
  platform,
  connectionId = null,
  season = null,
  discover,
  boundLeagueId = null,
  boundTeamId = null,
  boundVerified = false,
  trustDiscoveredTeams = true,
}) {
  const fallbackSeason = validSeason(season) ?? currentSeason();
  let discovered = null;
  let discoveryError = null;
  try {
    discovered = (await discover(fallbackSeason)) || [];
  } catch (error) {
    discoveryError = error;
  }
  const discovery = {
    discoveryFailed: discoveryError != null,
    discoveryStatus: Number(discoveryError?.status) || null,
  };

  const leagues = (discovered || []).map((league) => (trustDiscoveredTeams
    ? league
    : { ...league, team_id: null, team_name: null }));
  const bound = text(boundLeagueId);
  if (bound && bound !== platform) {
    const index = leagues.findIndex((league) => text(league?.league_id) === bound);
    if (index >= 0) {
      if (boundTeamId != null) leagues[index] = { ...leagues[index], team_id: String(boundTeamId) };
    } else if (boundVerified || discovered === null) {
      leagues.push({ league_id: bound, team_id: boundTeamId, season: fallbackSeason });
    }
  }

  try {
    const result = await syncMemberships(supabase, {
      userId, platform, connectionId, season: fallbackSeason, leagues, source: "connect",
    });
    return { ...result, ...discovery };
  } catch (error) {
    return { persisted: false, reason: "write_failed", error: error.message, ...discovery };
  }
}

/**
 * Every membership this user has, flattened with its league. `persisted: false` means step 03
 * is absent, and the caller must say so rather than claim a stored answer.
 */
async function readMemberships(supabase, userId) {
  try {
    const rows = await readRawMemberships(supabase, userId);
    return {
      persisted: true,
      memberships: rows.filter((m) => m.leagues).map((m) => ({
        platform: m.leagues.provider,
        league_id: String(m.leagues.provider_league_id),
        season: m.leagues.season == null ? null : Number(m.leagues.season),
        league_name: m.leagues.name ?? null,
        scoring_format: m.leagues.scoring_format ?? null,
        team_id: m.provider_team_id ?? null,
        team_name: m.team_name ?? null,
        is_followed: m.is_followed !== false,
        is_active_selection: m.is_active_selection === true,
        sort_order: m.sort_order ?? null,
        connection_id: m.connection_id,
      })),
    };
  } catch (error) {
    if (error instanceof SchemaAbsent) return { persisted: false, memberships: [] };
    throw error;
  }
}

/**
 * The multiselect write, all-or-nothing through `league_follows_replace`. Sends league ids and
 * order only: names and team ids come from provider reads (the sync), never from the client,
 * because a league row is shared by every member and a client-supplied ESPN team id is the field
 * that was silently wrong before. Returns false when step 03 is absent.
 */
async function replaceFollowed(supabase, { userId, platform, season, leagueIds }) {
  const { error } = await supabase.rpc("league_follows_replace", {
    p_user_id: userId,
    p_platform: platform,
    p_season: validSeason(season) ?? currentSeason(),
    p_entries: (leagueIds || []).map((id, index) => ({ league_id: String(id), sort_order: index })),
  });
  if (!error) return true;
  if (isSchemaAbsent(error)) return false;
  throw dbError("league_follows_replace", error);
}

/**
 * Mirror the active league onto the memberships (`league_select_active`). Best-effort: the
 * authority every surface reads today is `platform_connections`, so a failure here is reported
 * as `false`, never thrown.
 */
async function selectActive(supabase, { userId, platform, leagueId, season }) {
  try {
    const { error } = await supabase.rpc("league_select_active", {
      p_user_id: userId,
      p_platform: platform,
      p_provider_league_id: String(leagueId),
      p_season: validSeason(season) ?? currentSeason(),
    });
    return !error;
  } catch {
    return false;
  }
}

module.exports = {
  isSchemaAbsent,
  syncMemberships,
  syncAfterConnect,
  readMemberships,
  replaceFollowed,
  selectActive,
};
