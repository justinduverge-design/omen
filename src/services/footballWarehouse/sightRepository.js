"use strict";

// Read Sight for app players. Input: provider refs as the app holds them (sleeper:4046, espn:4262921,
// yahoo:470.p.30123); each resolves through the player index (football_player_ids) to one Omen player, then
// to that player's value in the latest succeeded Sight run of the requested version. Public football facts
// only: no user, league or roster context reaches the warehouse.

const MAX_REFS = 400;

/** "yahoo:470.p.30123" -> { provider: "yahoo", providerId: "30123" }; the index keeps Yahoo's numeric id. */
// Fantasy defenses: Sleeper "PHI", ESPN "-16012", Yahoo "100033" (team_ids, kind 'defense').
function parseDefenseRef(key) {
  const match = /^(sleeper|espn|yahoo):(.+)$/.exec(String(key || ""));
  if (!match) return null;
  const id = match[2];
  const ok = (match[1] === "sleeper" && /^[A-Z]{2,3}$/.test(id))
    || (match[1] === "espn" && /^-16[0-9]{3}$/.test(id))
    || (match[1] === "yahoo" && /^1000[0-9]{2}$/.test(id));
  return ok ? { key: String(key), provider: match[1], providerId: id } : null;
}

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

// Provider team codes that differ from nflverse's.
const TEAM_ALIASES = { LAR: "LA", WSH: "WAS", JAC: "JAX", LVR: "LV", OAK: "LV", SD: "LAC", STL: "LA" };
const SKILL_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K"]);

// Same rule as the player index (playerIndexStage.normalName) and its SQL twin below.
function normalName(value) {
  return String(value || "").toLowerCase().replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "").replace(/[^a-z]/g, "");
}

/** A provider player the index cannot place yet (a rookie Yahoo or Sleeper has not paired): name, team, position. */
function hintOf(key, hint) {
  const name = normalName(hint?.name);
  const team = String(hint?.team || "").trim().toUpperCase();
  const position = String(hint?.position || "").trim().toUpperCase();
  if (!name || !/^[A-Z]{2,3}$/.test(team) || !SKILL_POSITIONS.has(position)) return null;
  return { key, name, team: `omen:team:${(TEAM_ALIASES[team] || team).toLowerCase()}`, position };
}

const BYE_TTL_MS = 60 * 60 * 1000;

function createWarehouseSightRepository({ query, timeoutMs = 2_000, now = () => Date.now() }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  // Each team's bye week this season, from the schedule (the REG week it has no game). Cached for an hour.
  let byes = { at: 0, season: null, map: new Map() };
  async function byeWeeks() {
    if (now() - byes.at < BYE_TTL_MS) return byes.map;
    const result = await query({
      name: "warehouse-bye-weeks-v1",
      text: `
        WITH season AS (SELECT max(season) AS season FROM football.nfl_games WHERE game_type = 'REG'),
        played AS (
          SELECT g.week, g.home_team_id AS team_id FROM football.nfl_games g, season WHERE g.season = season.season AND g.game_type = 'REG'
          UNION SELECT g.week, g.away_team_id FROM football.nfl_games g, season WHERE g.season = season.season AND g.game_type = 'REG'
        ), teams AS (SELECT DISTINCT team_id FROM played)
        SELECT t.team_id, min(w) AS bye_week
          FROM teams t CROSS JOIN generate_series(1, 18) w
         WHERE NOT EXISTS (SELECT 1 FROM played p WHERE p.team_id = t.team_id AND p.week = w)
         GROUP BY t.team_id`,
      query_timeout: timeoutMs,
    });
    byes = { at: now(), map: new Map((result?.rows || []).map((r) => [r.team_id, Number(r.bye_week)])) };
    return byes.map;
  }
  return {
    /** Map(app player key -> sight block). Players Sight has no read for are absent. */
    async readSight({ playerKeys, version = "v1", hints = null }) {
      const refs = [...new Map((Array.isArray(playerKeys) ? playerKeys : []).map(parseRef).filter(Boolean).map((r) => [r.key, r])).values()].slice(0, MAX_REFS);
      if (!/^v[0-9]{1,3}$/.test(version)) return new Map();
      const result = !refs.length ? { rows: [] } : await query({
        name: "warehouse-sight-read-v2",
        text: `
          WITH run AS (
            SELECT id, season, week FROM football.football_metric_runs
             WHERE metric_name = 'omen_sight' AND formula_version = $4 AND state = 'succeeded'
             ORDER BY season DESC, week DESC LIMIT 1
          )
          SELECT refs.key, run.season, run.week, v.value, v.components, ir.status AS injury_status, ir.body_part AS injury_body_part,
                 ir.practice_participation AS injury_practice
            FROM unnest($1::text[], $2::text[], $3::text[]) AS refs(key, provider, provider_id)
            JOIN football.football_player_ids x ON x.provider = refs.provider AND x.provider_id = refs.provider_id
            CROSS JOIN run
            JOIN football.football_metric_values v ON v.metric_run_id = run.id AND v.entity_type = 'player' AND v.entity_id = x.player_id
            LEFT JOIN football.player_injury_reports ir ON ir.player_id = x.player_id`,
        values: [refs.map((r) => r.key), refs.map((r) => r.provider), refs.map((r) => r.providerId), version],
        query_timeout: timeoutMs,
      });
      const defenses = [...new Map((Array.isArray(playerKeys) ? playerKeys : []).map(parseDefenseRef).filter(Boolean).map((r) => [r.key, r])).values()].slice(0, 64);
      const teamRows = defenses.length ? (await query({
        name: "warehouse-sight-read-defense-v1",
        text: `
          WITH run AS (
            SELECT id, season, week FROM football.football_metric_runs
             WHERE metric_name = 'omen_sight' AND formula_version = $4 AND state = 'succeeded'
             ORDER BY season DESC, week DESC LIMIT 1
          )
          SELECT refs.key, run.season, run.week, v.value, v.components
            FROM unnest($1::text[], $2::text[], $3::text[]) AS refs(key, provider, provider_id)
            JOIN football.team_ids t ON t.provider = refs.provider AND t.provider_id = refs.provider_id AND t.kind = 'defense'
            CROSS JOIN run
            JOIN football.football_metric_values v ON v.metric_run_id = run.id AND v.entity_type = 'team' AND v.entity_id = t.team_id`,
        values: [defenses.map((r) => r.key), defenses.map((r) => r.provider), defenses.map((r) => r.providerId), version],
        query_timeout: timeoutMs,
      }))?.rows || [] : [];
      // Fallback for players the index has not paired: the one player on that NFL team's current roster at that
      // position whose name matches. Unique or nothing; it never guesses between two.
      const found = new Set((result?.rows || []).map((row) => row.key));
      const pending = refs.filter((r) => !found.has(r.key) && hints instanceof Map)
        .map((r) => hintOf(r.key, hints.get(r.key))).filter(Boolean).slice(0, 200);
      const hintRows = pending.length ? (await query({
        name: "warehouse-sight-read-hint-v2",
        text: `
          WITH run AS (
            SELECT id, season, week FROM football.football_metric_runs
             WHERE metric_name = 'omen_sight' AND formula_version = $5 AND state = 'succeeded'
             ORDER BY season DESC, week DESC LIMIT 1
          ), latest AS (
            SELECT max(season) AS season FROM football.nfl_weekly_rosters
          ), roster AS (
            SELECT DISTINCT ON (r.player_id) r.player_id, r.team_id, r.football_position,
                   regexp_replace(regexp_replace(lower(p.display_name), '\\m(jr|sr|ii|iii|iv|v)\\M\\.?', '', 'g'), '[^a-z]', '', 'g') AS name
              FROM football.nfl_weekly_rosters r JOIN latest ON r.season = latest.season
              JOIN football.football_players p ON p.player_id = r.player_id
             ORDER BY r.player_id, r.week DESC
          ), matched AS (
            SELECT h.key, min(ro.player_id) AS player_id
              FROM unnest($1::text[], $2::text[], $3::text[], $4::text[]) AS h(key, name, team_id, position)
              JOIN roster ro ON ro.name = h.name AND ro.team_id = h.team_id AND ro.football_position = h.position
             GROUP BY h.key HAVING count(*) = 1
          )
          SELECT m.key, run.season, run.week, v.value, v.components, ir.status AS injury_status, ir.body_part AS injury_body_part,
                 ir.practice_participation AS injury_practice
            FROM matched m CROSS JOIN run
            JOIN football.football_metric_values v ON v.metric_run_id = run.id AND v.entity_type = 'player' AND v.entity_id = m.player_id
            LEFT JOIN football.player_injury_reports ir ON ir.player_id = m.player_id`,
        values: [pending.map((h) => h.key), pending.map((h) => h.name), pending.map((h) => h.team), pending.map((h) => h.position), version],
        query_timeout: timeoutMs,
      }))?.rows || [] : [];
      const out = new Map();
      for (const row of [...(result?.rows || []), ...teamRows, ...hintRows]) {
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
          confidence: c.confidence || "normal",
          flex_grade: Number.isFinite(Number(c.flex_grade)) ? Math.round(Number(c.flex_grade)) : null,
          sight_points: Number.isFinite(Number(row.value)) ? Math.round(Number(row.value) * 10) / 10 : null,
          // The three inputs that moved the number most, in points; the full breakdown stays in the warehouse.
          drivers: contributions.slice(0, 3).map((p) => ({ name: p.name, points: Math.round(p.points * 10) / 10 })),
          // Sleeper's injury report (once a day). Absent means Sleeper lists no injury, not "healthy for sure".
          ...(row.injury_status ? { injury: { status: row.injury_status, body_part: row.injury_body_part || null, practice: row.injury_practice || null, source: "sleeper" } } : {}),
        });
      }
      // The bye week of the NFL team the provider lists for each player (League-GM planning: who covers it).
      if (out.size && hints instanceof Map) {
        let map = new Map();
        try { map = await byeWeeks(); } catch { map = new Map(); }
        for (const [key, block] of out) {
          const team = String(hints.get(key)?.team || "").trim().toUpperCase();
          const bye = /^[A-Z]{2,3}$/.test(team) ? map.get(`omen:team:${(TEAM_ALIASES[team] || team).toLowerCase()}`) : undefined;
          if (Number.isInteger(bye)) block.bye_week = bye;
        }
      }
      return out;
    },
  };
}

module.exports = { createWarehouseSightRepository, parseRef, parseDefenseRef, hintOf, normalName };
