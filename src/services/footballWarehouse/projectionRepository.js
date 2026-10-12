"use strict";

const DEFAULT_TIMEOUT_MS = 2_000;
const SOURCES = Object.freeze(["sleeper"]);
const MAX_ROWS = 5_000;

function integer(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

/**
 * Read the stored weekly projections of one source for one season-week. Product-internal only: the rows are
 * provider projections (permission pending) and no route may return them as raw data; consumers turn them into
 * per-league scores. Returns the rows of the most recent successful fetch, so a player the source stopped
 * delivering drops out instead of lingering on an older number.
 */
function createWarehouseProjectionRepository({ query, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  integer(timeoutMs, "timeoutMs", { min: 100, max: 30_000 });

  return {
    /** @returns {Promise<{ fetchedAt: Date, rows: Array<{source_player_id:string, stat_line:object}> } | null>} */
    async readWeek({ source, season, week }) {
      if (!SOURCES.includes(source)) throw new TypeError("source is not supported");
      integer(season, "season", { min: 1999, max: 2100 });
      integer(week, "week", { min: 1, max: 23 });
      const result = await query({
        name: "warehouse-weekly-projections-v1",
        text: `
          SELECT p.source_player_id, p.stat_line, p.fetched_at
          FROM football.player_weekly_projections AS p
          WHERE p.source = $1 AND p.season = $2 AND p.week = $3
            AND p.fetched_at = (
              SELECT max(latest.fetched_at) FROM football.player_weekly_projections AS latest
              WHERE latest.source = $1 AND latest.season = $2 AND latest.week = $3
            )
          LIMIT ${MAX_ROWS + 1}
        `,
        values: [source, season, week],
        query_timeout: timeoutMs,
      });
      const rows = result?.rows || [];
      if (!rows.length) return null;
      if (rows.length > MAX_ROWS) throw new RangeError("stored projections exceed the read limit");
      const fetchedAt = new Date(rows[0].fetched_at);
      if (Number.isNaN(fetchedAt.getTime())) return null;
      return {
        fetchedAt,
        rows: rows.map((row) => ({ source_player_id: String(row.source_player_id), stat_line: row.stat_line })),
      };
    },
  };
}

module.exports = { createWarehouseProjectionRepository, SOURCES, MAX_ROWS };
