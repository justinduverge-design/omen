"use strict";

// Read Sight for app players. Input: provider refs as the app holds them (sleeper:4046, espn:4262921,
// yahoo:470.p.30123); each resolves through the player index (football_player_ids) to one Omen player, then
// to that player's value in the latest succeeded Sight run of the requested version. Public football facts
// only: no user, league or roster context reaches the warehouse.

const MAX_REFS = 400;

/** "yahoo:470.p.30123" -> { provider: "yahoo", providerId: "30123" }; the index keeps Yahoo's numeric id. */
function parseRef(key) {
  const match = /^(sleeper|espn|yahoo):(.+)$/.exec(String(key || ""));
  if (!match) return null;
  let providerId = match[2];
  if (match[1] === "yahoo") {
    const tail = /(?:^|\.p\.)([0-9]{1,12})$/.exec(providerId);
    providerId = tail ? tail[1] : "";
  }
  if (!/^[0-9]{1,12}$/.test(providerId)) return null;
  return { key: String(key), provider: match[1], providerId };
}

function createWarehouseSightRepository({ query, timeoutMs = 2_000 }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  return {
    /** Map(app player key -> sight block). Players Sight has no read for are absent. */
    async readSight({ playerKeys, version = "v1" }) {
      const refs = [...new Map((Array.isArray(playerKeys) ? playerKeys : []).map(parseRef).filter(Boolean).map((r) => [r.key, r])).values()].slice(0, MAX_REFS);
      if (!refs.length || !/^v[0-9]{1,3}$/.test(version)) return new Map();
      const result = await query({
        name: "warehouse-sight-read-v1",
        text: `
          WITH run AS (
            SELECT id, season, week FROM football.football_metric_runs
             WHERE metric_name = 'omen_sight' AND formula_version = $4 AND state = 'succeeded'
             ORDER BY season DESC, week DESC LIMIT 1
          )
          SELECT refs.key, run.season, run.week, v.value, v.components
            FROM unnest($1::text[], $2::text[], $3::text[]) AS refs(key, provider, provider_id)
            JOIN football.football_player_ids x ON x.provider = refs.provider AND x.provider_id = refs.provider_id
            CROSS JOIN run
            JOIN football.football_metric_values v ON v.metric_run_id = run.id AND v.entity_type = 'player' AND v.entity_id = x.player_id`,
        values: [refs.map((r) => r.key), refs.map((r) => r.provider), refs.map((r) => r.providerId), version],
        query_timeout: timeoutMs,
      });
      const out = new Map();
      for (const row of result?.rows || []) {
        const c = row.components || {};
        const contributions = Object.entries(c.contributions || {})
          .map(([name, part]) => ({ name, points: Number(part?.points) }))
          .filter((p) => Number.isFinite(p.points))
          .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
        out.set(row.key, {
          version: c.version || version,
          season: Number(row.season),
          through_week: Number(row.week),
          position: c.position || null,
          phase: c.phase || null,
          grade: Number.isFinite(Number(c.grade)) ? Math.round(Number(c.grade)) : null,
          sight_points: Number.isFinite(Number(row.value)) ? Math.round(Number(row.value) * 10) / 10 : null,
          // The three inputs that moved the number most, in points; the full breakdown stays in the warehouse.
          drivers: contributions.slice(0, 3).map((p) => ({ name: p.name, points: Math.round(p.points * 10) / 10 })),
        });
      }
      return out;
    },
  };
}

module.exports = { createWarehouseSightRepository, parseRef };
