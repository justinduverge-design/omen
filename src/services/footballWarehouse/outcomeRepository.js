"use strict";

const DEFAULT_TIMEOUT_MS = 2_000;
const BATCH_SIZE = 200;
const MAX_REFS = 2_000;
const PROVIDERS = new Set(["espn", "sleeper", "yahoo", "gsis"]);
const PROVIDER_ID = /^[0-9A-Za-z_-]{1,64}$/;

function integer(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function refKey(provider, providerId) {
  return `${provider}:${providerId}`;
}

function publicRefs(values) {
  if (!Array.isArray(values)) throw new TypeError("refs must be an array");
  const seen = new Map();
  for (const ref of values) {
    if (!ref || !PROVIDERS.has(ref.provider) || typeof ref.providerId !== "string" || !PROVIDER_ID.test(ref.providerId)) {
      throw new TypeError("refs may contain only espn, sleeper, yahoo or gsis provider ids");
    }
    seen.set(refKey(ref.provider, ref.providerId), { provider: ref.provider, providerId: ref.providerId });
  }
  if (seen.size > MAX_REFS) throw new RangeError(`refs exceeds the ${MAX_REFS}-player query limit`);
  return [...seen.values()];
}

/**
 * Read finished-week fantasy outcomes from the football warehouse. Players are matched ONLY through
 * football.football_player_ids (provider id -> Omen player id); a name is never used, and an id with no
 * crosswalk row is reported as unresolved rather than guessed. Reads are bounded (200 ids per query) and
 * go through the verified read-only runtime query.
 */
function createWarehouseOutcomeRepository({ query, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  integer(timeoutMs, "timeoutMs", { min: 100, max: 30_000 });

  return {
    /** True once any regular-season stat line exists for the week: a week with none is not played yet. */
    async isWeekIngested({ season, week }) {
      integer(season, "season", { min: 1999, max: 2100 });
      integer(week, "week", { min: 1, max: 18 });
      const result = await query({
        name: "warehouse-week-ingested-v1",
        text: `
          SELECT EXISTS (
            SELECT 1 FROM football.nfl_player_weekly_stats
            WHERE season = $1 AND week = $2 AND season_type = 'REG'
          ) AS ingested
        `,
        values: [season, week],
        query_timeout: timeoutMs,
      });
      return result?.rows?.[0]?.ingested === true;
    },

    /**
     * Map "<provider>:<id>" -> { resolved, hasLine, ppr, receptions }. `resolved` is false when the id has
     * no crosswalk row; `hasLine` is false when the player resolves but has no REG row that week.
     */
    async readWeekOutcomes({ refs, season, week }) {
      const list = publicRefs(refs);
      integer(season, "season", { min: 1999, max: 2100 });
      integer(week, "week", { min: 1, max: 18 });
      const out = new Map();
      for (let offset = 0; offset < list.length; offset += BATCH_SIZE) {
        const batch = list.slice(offset, offset + BATCH_SIZE);
        const result = await query({
          name: "warehouse-week-outcomes-v1",
          text: `
            SELECT refs.provider, refs.provider_id, ids.player_id,
                   facts.player_id AS fact_player_id, facts.fantasy_points_ppr, facts.receptions
            FROM unnest($1::text[], $2::text[]) AS refs(provider, provider_id)
            LEFT JOIN football.football_player_ids AS ids
              ON ids.provider = refs.provider AND ids.provider_id = refs.provider_id
            LEFT JOIN football.nfl_player_weekly_stats AS facts
              ON facts.player_id = ids.player_id
             AND facts.season = $3 AND facts.week = $4 AND facts.season_type = 'REG'
          `,
          values: [batch.map((r) => r.provider), batch.map((r) => r.providerId), season, week],
          query_timeout: timeoutMs,
        });
        for (const row of result?.rows || []) {
          out.set(refKey(row.provider, row.provider_id), {
            resolved: row.player_id != null,
            hasLine: row.fact_player_id != null,
            ppr: finiteOrNull(row.fantasy_points_ppr),
            receptions: finiteOrNull(row.receptions),
          });
        }
      }
      // A ref the database returned nothing for is unresolved, never silently dropped.
      for (const ref of list) {
        const key = refKey(ref.provider, ref.providerId);
        if (!out.has(key)) out.set(key, { resolved: false, hasLine: false, ppr: null, receptions: null });
      }
      return out;
    },
  };
}

module.exports = { createWarehouseOutcomeRepository, refKey, BATCH_SIZE };
