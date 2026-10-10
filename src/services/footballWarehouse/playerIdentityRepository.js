"use strict";

const DEFAULT_TIMEOUT_MS = 2_000;
const MAX_KEYS = 100;
const PROVIDERS = Object.freeze(["espn", "yahoo", "sleeper"]);
const PROVIDER_ID = /^[A-Za-z0-9_.-]{1,64}$/;

function publicKeys(values) {
  if (!Array.isArray(values)) throw new TypeError("keys must be an array");
  const seen = new Map();
  for (const value of values) {
    if (!value || !PROVIDERS.includes(value.provider)
        || typeof value.providerId !== "string" || !PROVIDER_ID.test(value.providerId)) {
      throw new TypeError("keys may contain only espn, yahoo or sleeper public provider ids");
    }
    seen.set(`${value.provider}:${value.providerId}`, { provider: value.provider, providerId: value.providerId });
  }
  if (seen.size > MAX_KEYS) throw new RangeError(`keys exceeds the ${MAX_KEYS}-player query limit`);
  return [...seen.values()];
}

/**
 * Crosswalk read: provider id -> one Omen player. Public identifiers and public football facts only;
 * Omen user ids, league ids and roster context never enter the warehouse.
 */
function createWarehousePlayerIdentityRepository({ query, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw new TypeError("timeoutMs must be an integer from 100 through 30000");
  }

  return {
    /** Resolves to a Map keyed `provider:providerId`. Unknown ids are simply absent. */
    async readPlayersByProviderIds({ keys }) {
      const ids = publicKeys(keys);
      if (!ids.length) return new Map();

      const result = await query({
        name: "warehouse-player-identity-v1",
        text: `
          SELECT crosswalk.provider, crosswalk.provider_id, players.gsis_id,
                 players.display_name, players.football_position,
                 latest.team
          FROM unnest($1::text[], $2::text[]) AS wanted(provider, provider_id)
          JOIN football.football_player_ids AS crosswalk
            ON crosswalk.provider = wanted.provider AND crosswalk.provider_id = wanted.provider_id
          JOIN football.football_players AS players ON players.player_id = crosswalk.player_id
          LEFT JOIN LATERAL (
            SELECT teams.nflverse_abbr AS team
            FROM football.nfl_player_weekly_stats AS facts
            JOIN football.football_teams AS teams ON teams.team_id = facts.team_id
            WHERE facts.player_id = players.player_id
            ORDER BY facts.season DESC, facts.week DESC
            LIMIT 1
          ) AS latest ON true
        `,
        values: [ids.map((k) => k.provider), ids.map((k) => k.providerId)],
        query_timeout: timeoutMs,
      });

      const out = new Map();
      for (const row of result?.rows || []) {
        if (!row?.display_name) continue;
        out.set(`${row.provider}:${row.provider_id}`, {
          gsis_id: row.gsis_id || null,
          name: String(row.display_name),
          position: row.football_position || null,
          team: row.team || null,
        });
      }
      return out;
    },
  };
}

module.exports = { createWarehousePlayerIdentityRepository, PROVIDERS, MAX_KEYS };
