"use strict";

/**
 * In-memory PostgREST double for redo step 03 (`leagues`, `league_memberships`, and the two
 * functions `league_follows_replace` / `league_select_active`), plus the one
 * `platform_connections` read the membership service makes (the connection id).
 *
 * It mirrors the schema rules the server depends on, so a test can fail for the same reason
 * production would: the (provider, provider_league_id, season) upsert key, the (user_id,
 * league_id) primary key, and the trigger that refuses a membership whose connection belongs to
 * another user or provider. `missing: true` answers the way PostgREST does before step 03 exists.
 *
 * Not a test file; it lives under fixtures and defines no tests.
 */

const MISSING_TABLE = Object.freeze({ code: "PGRST205", message: "Could not find the table in the schema cache" });
const MISSING_FUNCTION = Object.freeze({ code: "PGRST202", message: "Could not find the function" });

/**
 * `connections` may be an array (owned here, in `state.connections`) or a function returning the
 * live rows of another fake, so a route test's own `platform_connections` double is the one the
 * trigger checks. Memberships whose connection has gone are dropped before every call, which is
 * `on delete cascade`.
 */
function createLeagueMembershipDb({ connections = [], missing = false, failWrites = null } = {}) {
  const state = {
    connections: typeof connections === "function" ? [] : connections.map((row) => ({ ...row })),
    leagues: [],
    memberships: [],
    calls: [],
    rpcs: [],
  };
  let nextLeague = 1;
  const liveConnections = () => (typeof connections === "function" ? connections() : state.connections);

  function cascade() {
    const ids = new Set(liveConnections().map((row) => row.id));
    state.memberships = state.memberships.filter((m) => ids.has(m.connection_id));
  }

  const leagueById = (id) => state.leagues.find((league) => league.id === id);

  function triggerCheck(membership) {
    const conn = liveConnections().find((row) => row.id === membership.connection_id);
    const league = leagueById(membership.league_id);
    if (!conn || conn.user_id !== membership.user_id) {
      return { code: "23514", message: "league_memberships: connection belongs to another user" };
    }
    if (!league || conn.platform !== league.provider) {
      return { code: "23514", message: "league_memberships: provider mismatch" };
    }
    return null;
  }

  function upsertLeague(row) {
    const existing = state.leagues.find((league) =>
      league.provider === row.provider
      && league.provider_league_id === row.provider_league_id
      && league.season === row.season);
    if (existing) {
      Object.assign(existing, row);
      return existing;
    }
    const created = {
      id: `lg-${nextLeague++}`,
      name: null,
      team_count: null,
      scoring_format: null,
      last_synced_at: null,
      ...row,
    };
    state.leagues.push(created);
    return created;
  }

  function withLeague(membership) {
    const league = leagueById(membership.league_id);
    return {
      ...membership,
      leagues: league ? {
        provider: league.provider,
        provider_league_id: league.provider_league_id,
        season: league.season,
        name: league.name,
        scoring_format: league.scoring_format,
        team_count: league.team_count,
      } : null,
    };
  }

  function query(table, operation, payload, options) {
    const filters = [];
    let wantSelect = false;
    let single = null;
    const q = {
      eq(field, value) { filters.push((row) => row[field] === value); return q; },
      in(field, values) { filters.push((row) => values.includes(row[field])); return q; },
      select() { wantSelect = true; return q; },
      maybeSingle() { single = "maybe"; return q; },
      single() { single = "one"; return q; },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };

    function finish(rows) {
      if (single === "maybe") return { data: rows[0] || null, error: null };
      if (single === "one") return { data: rows[0] || null, error: rows[0] ? null : { code: "PGRST116" } };
      return { data: rows, error: null };
    }

    function run() {
      state.calls.push({ table, operation, payload, options });
      cascade();
      if (table === "platform_connections") {
        assertOperation(operation === "select", `platform_connections ${operation}`);
        return finish(liveConnections().filter((row) => filters.every((f) => f(row))));
      }
      if (missing) return { data: null, error: MISSING_TABLE };
      if (operation !== "select" && failWrites && failWrites(table, operation)) {
        return { data: null, error: { code: "XX000", message: "write refused by test" } };
      }

      if (table === "leagues") {
        assertOperation(operation === "upsert", `leagues ${operation}`);
        assertOperation(options?.onConflict === "provider,provider_league_id,season", "leagues upsert key");
        const rows = (Array.isArray(payload) ? payload : [payload]).map(upsertLeague);
        return finish(wantSelect ? rows.map((row) => ({ ...row })) : []);
      }

      if (table === "league_memberships") {
        if (operation === "select") {
          return finish(state.memberships.filter((row) => filters.every((f) => f(row))).map(withLeague));
        }
        if (operation === "upsert") {
          assertOperation(options?.onConflict === "user_id,league_id", "membership upsert key");
          assertOperation(options?.ignoreDuplicates === true, "membership upsert must not overwrite");
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const exists = state.memberships.some((m) => m.user_id === row.user_id && m.league_id === row.league_id);
            if (exists) continue;
            const refused = triggerCheck(row);
            if (refused) return { data: null, error: refused };
            state.memberships.push({ is_followed: true, is_active_selection: false, ...row });
          }
          return finish([]);
        }
        if (operation === "update") {
          const targets = state.memberships.filter((row) => filters.every((f) => f(row)));
          for (const target of targets) {
            const refused = triggerCheck({ ...target, ...payload });
            if (refused) return { data: null, error: refused };
          }
          for (const target of targets) Object.assign(target, payload);
          return finish([]);
        }
      }
      throw new Error(`fake db: unexpected ${operation} on ${table}`);
    }

    return q;
  }

  function assertOperation(ok, what) {
    if (!ok) throw new Error(`fake db: unsupported ${what}`);
  }

  // league_follows_replace, as written in 03_leagues_memberships.up.sql.
  function followsReplace({ p_user_id, p_platform, p_season, p_entries }) {
    const conn = liveConnections().find((row) =>
      row.user_id === p_user_id && row.platform === p_platform && row.is_active !== false);
    if (!conn) return { data: null, error: { code: "P0002", message: "no active connection" } };
    const kept = [];
    p_entries.forEach((entry, idx) => {
      const league = upsertLeague({ provider: p_platform, provider_league_id: entry.league_id, season: p_season });
      if (entry.league_name != null) league.name = entry.league_name;
      const existing = state.memberships.find((m) => m.user_id === p_user_id && m.league_id === league.id);
      const sortOrder = entry.sort_order == null ? idx : Number(entry.sort_order);
      if (existing) {
        Object.assign(existing, {
          connection_id: conn.id,
          provider_team_id: entry.team_id ?? existing.provider_team_id,
          team_name: entry.team_name ?? existing.team_name,
          is_followed: true,
          sort_order: sortOrder,
        });
      } else {
        state.memberships.push({
          user_id: p_user_id, league_id: league.id, connection_id: conn.id,
          provider_team_id: entry.team_id ?? null, team_name: entry.team_name ?? null,
          is_followed: true, is_active_selection: false, sort_order: sortOrder, source: "follow",
        });
      }
      kept.push(league.id);
    });
    for (const m of state.memberships) {
      const league = leagueById(m.league_id);
      if (m.user_id === p_user_id && league.provider === p_platform && league.season === p_season && !kept.includes(m.league_id)) {
        m.is_followed = false;
        m.is_active_selection = false;
      }
    }
    return { data: p_entries.length, error: null };
  }

  function selectActive({ p_user_id, p_platform, p_provider_league_id, p_season }) {
    const target = state.memberships.find((m) => {
      const league = leagueById(m.league_id);
      return m.user_id === p_user_id && m.is_followed && league.provider === p_platform
        && league.provider_league_id === p_provider_league_id && league.season === p_season;
    });
    if (!target) return { data: null, error: { code: "P0002", message: "not a followed league" } };
    for (const m of state.memberships) if (m.user_id === p_user_id) m.is_active_selection = m === target;
    return { data: target.league_id, error: null };
  }

  const client = {
    from(table) {
      return {
        select: (columns) => query(table, "select", columns),
        upsert: (payload, options) => query(table, "upsert", payload, options),
        update: (payload) => query(table, "update", payload),
      };
    },
    rpc(name, params) {
      state.rpcs.push({ name, params });
      cascade();
      if (missing) return Promise.resolve({ data: null, error: MISSING_FUNCTION });
      if (name === "league_follows_replace") return Promise.resolve(followsReplace(params));
      if (name === "league_select_active") return Promise.resolve(selectActive(params));
      return Promise.resolve({ data: null, error: MISSING_FUNCTION });
    },
  };

  /** The user's memberships, flattened for assertions. */
  function membershipsOf(userId) {
    cascade();
    return state.memberships
      .filter((m) => m.user_id === userId)
      .map((m) => ({ ...m, ...leagueById(m.league_id), league_id: m.league_id }));
  }

  return { client, state, membershipsOf };
}

module.exports = { createLeagueMembershipDb, MISSING_TABLE, MISSING_FUNCTION };
