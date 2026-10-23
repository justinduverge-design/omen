"use strict";

// What each Sight input means, in the words a manager uses. The app shows these under "What moved the call"; a key
// with no entry is shown as null so the app never prints a model's internal name.
const SIGHT_DRIVER_LABELS = Object.freeze({
  production_ppg: "Points per game",
  target_share: "Target share",
  carry_share: "Carry share",
  usage_trend: "Usage trend",
  vacated_share: "Work left by teammates",
  implied_team_total: "Team's expected points",
  opponent_allowed_to_position: "Matchup vs the position",
  wind_mph: "Wind",
  cold: "Cold",
  precip_in: "Rain",
  team_elements_gap: "Weather vs team style",
  epa_per_target: "Value per target",
  air_yards_per_target: "Air yards per target",
  red_zone_target_rate: "Red-zone targets",
  catch_over_expected: "Catches over expected",
  yac_epa_per_reception: "Yards after catch",
  explosive_catch_rate: "Big-play catches",
  explosive_run_rate: "Big-play runs",
  rush_epa: "Rushing value",
  rush_epa_per_carry: "Value per carry",
  rush_success_rate: "Run success rate",
  designed_rush_share: "Designed runs",
  dropback_share: "Dropbacks",
  epa_per_dropback: "Value per dropback",
  cpoe: "Completion rate over expected",
  accuracy_over_expected: "Accuracy over expected",
  long_attempt_share: "Deep throws",
  pass_rate: "Team pass rate",
  sack_rate: "Sacks taken",
  sack_avoidance_rate: "Sacks avoided",
  turnover_rate: "Turnovers",
  fumble_rate: "Fumbles",
  fg_attempts_per_game: "Field-goal tries per game",
  xp_attempts_per_game: "Extra points per game",
  points_allowed_per_game: "Points allowed per game",
  takeaway_rate: "Takeaways",
  defensive_td_per_game: "Defensive touchdowns",
  epa_allowed_per_play: "Yards and points allowed per play",
});

function sightDriverLabel(name) {
  return SIGHT_DRIVER_LABELS[name] || null;
}

// Read Sight for app players. Input: provider refs as the app holds them (sleeper:4046, espn:4262921,
// yahoo:470.p.30123); each resolves through the player index (football_player_ids) to one Omen player, then
// to that player's value in the latest succeeded Sight run of the requested version. Public football facts
// only: no user, league or roster context reaches the warehouse.

const MAX_REFS = 400;
const { resolveForecastAuthority } = require("../forecastAuthority");

/** "yahoo:470.p.30123" -> { provider: "yahoo", providerId: "30123" }; the index keeps Yahoo's numeric id. */
// Fantasy defenses: Sleeper "PHI", ESPN "-16012", Yahoo "100033" (team_ids, kind 'defense').
function parseDefenseRef(key) {
  const match = /^(sleeper|espn|yahoo):(.+)$/.exec(String(key || ""));
  if (!match) return null;
  const id = match[2];
  const ok =
    (match[1] === "sleeper" && /^[A-Z]{2,3}$/.test(id)) ||
    (match[1] === "espn" && /^-16[0-9]{3}$/.test(id)) ||
    (match[1] === "yahoo" && /^1000[0-9]{2}$/.test(id));
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
  return String(value || "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "")
    .replace(/[^a-z]/g, "");
}

/** A provider player the index cannot place yet (a rookie Yahoo or Sleeper has not paired): name, team, position. */
function hintOf(key, hint) {
  const name = normalName(hint?.name);
  const team = String(hint?.team || "")
    .trim()
    .toUpperCase();
  const position = String(hint?.position || "")
    .trim()
    .toUpperCase();
  if (!name || !/^[A-Z]{2,3}$/.test(team) || !SKILL_POSITIONS.has(position)) return null;
  return { key, name, team: `omen:team:${(TEAM_ALIASES[team] || team).toLowerCase()}`, position };
}

const BYE_TTL_MS = 60 * 60 * 1000;

const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const round1 = (v) => Math.round(v * 10) / 10;
const sum = (rows, field) => rows.reduce((total, row) => total + (num(row[field]) ?? 0), 0);

// The position ratings Sight is built on. 2026 QB runs are `omen_qb_sight_grade` (RAT-QB-S).
const RATING_METRICS = ["omen_qb_sight_grade", "omen_qb_grade", "omen_rb_grade", "omen_wr_grade", "omen_te_grade"];
// The components a screen leads with, per rating, in order.
const RATING_HEADLINES = {
  "RAT-QB": ["epa_per_dropback", "cpoe", "sack_avoidance_rate", "turnover_rate"],
  "RAT-QB-S": ["epa_per_dropback", "cpoe", "sack_avoidance_rate", "turnover_rate"],
  "RAT-RB": ["rush_epa_per_carry", "rush_success_rate", "explosive_run_rate", "carry_share"],
  "RAT-WR": ["epa_per_target", "target_share", "catch_over_expected", "yac_epa_per_reception"],
  "RAT-TE": ["epa_per_target", "target_share", "catch_over_expected", "yac_epa_per_reception"],
};

function summarizeRating(row) {
  const body = row.components || {};
  const metric = body.metric || null;
  const parts = body.components || {};
  const headline = (RATING_HEADLINES[metric] || Object.keys(parts).slice(0, 4))
    .filter((name) => parts[name] && num(parts[name].raw) != null)
    .map((name) => ({ name, value: num(parts[name].raw), z: num(parts[name].z) }));
  return {
    metric,
    rating: num(row.value) == null ? null : round1(num(row.value)),
    season: num(row.season),
    games: num(body.games),
    opponent_adjusted: body.opponent_adjusted === true,
    headline,
  };
}

/** One player's weekly rows (oldest first) -> the block a screen draws. */
function summarizeStats(weeks) {
  const played = weeks.filter((row) => num(row.points) != null);
  const last = played.slice(-3);
  const seasonPoints = sum(played, "points");
  const snaps = last.map((row) => num(row.snap_share)).filter((v) => v != null);
  return {
    source: "nflverse weekly stats",
    scoring: "ppr",
    season: num(played[0]?.season ?? weeks[0]?.season),
    through_week: num(played.at(-1)?.week),
    games: played.length,
    season_points: round1(seasonPoints),
    points_per_game: played.length ? round1(seasonPoints / played.length) : null,
    last_games: last.map((row) => ({
      week: num(row.week),
      opponent: row.opponent || null,
      points: round1(num(row.points)),
    })),
    recent: {
      games: last.length,
      targets: sum(last, "targets"),
      receptions: sum(last, "receptions"),
      carries: sum(last, "carries"),
      yards: sum(last, "passing_yards") + sum(last, "rushing_yards") + sum(last, "receiving_yards"),
      snap_share: snaps.length ? round1((snaps.reduce((a, b) => a + b, 0) / snaps.length) * 100) : null,
    },
  };
}

function createWarehouseSightRepository({ query, timeoutMs = 2_000, now = () => Date.now() }) {
  if (typeof query !== "function") throw new TypeError("query must be a function");
  // Each team's bye week this season, from the schedule (the REG week it has no game). Cached for an hour.
  let byes = { until: -Infinity, map: new Map() };
  async function byeWeeks() {
    if (now() < byes.until) return byes.map;
    // A failed read is remembered for five minutes so a degraded warehouse is not re-asked on every request.
    byes = { until: now() + 5 * 60 * 1000, map: new Map() };
    const result = await query({
      name: "warehouse-bye-weeks-v1",
      text: `
        -- The season Sight is serving, never a next-season schedule loaded early.
        WITH season AS (SELECT max(season) AS season FROM football.football_metric_runs WHERE metric_name = 'omen_sight' AND state = 'succeeded'),
        played AS (
          SELECT g.week, g.home_team_id AS team_id FROM football.nfl_games g, season WHERE g.season = season.season AND g.game_type = 'REG'
          UNION SELECT g.week, g.away_team_id FROM football.nfl_games g, season WHERE g.season = season.season AND g.game_type = 'REG'
        -- Only a fully loaded schedule (16+ games) can say which week is a bye.
        ), teams AS (SELECT team_id FROM played GROUP BY team_id HAVING count(*) >= 16)
        SELECT t.team_id, min(w) AS bye_week
          FROM teams t CROSS JOIN generate_series(1, 18) w
         WHERE NOT EXISTS (SELECT 1 FROM played p WHERE p.team_id = t.team_id AND p.week = w)
         GROUP BY t.team_id`,
      query_timeout: timeoutMs,
    });
    byes = {
      until: now() + BYE_TTL_MS,
      map: new Map((result?.rows || []).map((r) => [r.team_id, Number(r.bye_week)])),
    };
    return byes.map;
  }
  const repository = {
    /** One evaluated authority receipt per requested position. Missing/legacy evidence resolves closed. */
    /**
     * Map(app player key -> real season numbers) from the warehouse's weekly box scores
     * (`nfl_player_weekly_stats`, nflverse, CC BY 4.0): the latest regular season's games played,
     * PPR points, the last three games and usage. Observed facts only; a player the index cannot
     * place is absent, never zero.
     */
    /**
     * Map(app player key -> Omen's position rating): RAT-QB (Omen's QBR), RAT-RB, RAT-WR, RAT-TE, from
     * play-by-play (EPA, success rate, CPOE, shares). The latest run of each position's metric; the
     * headline efficiency components ride along so a screen can show the why behind the grade.
     */
    async readRatings({ playerKeys }) {
      const refs = [
        ...new Map(
          (Array.isArray(playerKeys) ? playerKeys : [])
            .map(parseRef)
            .filter(Boolean)
            .map((r) => [r.key, r]),
        ).values(),
      ].slice(0, MAX_REFS * 2);
      if (!refs.length) return new Map();
      const result = await query({
        name: "warehouse-player-ratings-v1",
        text: `
          WITH runs AS (
            SELECT DISTINCT ON (metric_name) id, metric_name, season
              FROM football.football_metric_runs
             WHERE metric_name = ANY($4::text[]) AND state = 'succeeded'
             ORDER BY metric_name, season DESC NULLS LAST, id DESC
          )
          SELECT DISTINCT ON (refs.key) refs.key, runs.metric_name, runs.season, v.value, v.components
            FROM unnest($1::text[], $2::text[], $3::text[]) AS refs(key, provider, provider_id)
            JOIN football.football_player_ids x ON x.provider = refs.provider AND x.provider_id = refs.provider_id
            JOIN football.football_metric_values v ON v.entity_type = 'player' AND v.entity_id = x.player_id
            JOIN runs ON runs.id = v.metric_run_id
           ORDER BY refs.key, runs.season DESC NULLS LAST, array_position($4::text[], runs.metric_name)`,
        values: [refs.map((r) => r.key), refs.map((r) => r.provider), refs.map((r) => r.providerId), RATING_METRICS],
        query_timeout: timeoutMs,
      });
      const out = new Map();
      for (const row of result?.rows || []) out.set(row.key, summarizeRating(row));
      return out;
    },

    async readStats({ playerKeys }) {
      const refs = [
        ...new Map(
          (Array.isArray(playerKeys) ? playerKeys : [])
            .map(parseRef)
            .filter(Boolean)
            .map((r) => [r.key, r]),
        ).values(),
      ].slice(0, MAX_REFS * 2);
      if (!refs.length) return new Map();
      const result = await query({
        name: "warehouse-player-stats-v1",
        text: `
          WITH latest AS (
            SELECT max(season) AS season FROM football.nfl_player_weekly_stats WHERE season_type = 'REG'
          )
          SELECT refs.key, f.season, f.week, f.fantasy_points_ppr AS points, f.targets, f.receptions, f.carries,
                 f.passing_yards, f.rushing_yards, f.receiving_yards, o.snap_share, opp.nflverse_abbr AS opponent
            FROM unnest($1::text[], $2::text[], $3::text[]) AS refs(key, provider, provider_id)
            JOIN football.football_player_ids x ON x.provider = refs.provider AND x.provider_id = refs.provider_id
            CROSS JOIN latest
            JOIN football.nfl_player_weekly_stats f
              ON f.player_id = x.player_id AND f.season = latest.season AND f.season_type = 'REG'
            LEFT JOIN football.nfl_player_weekly_opportunity o
              ON o.player_id = f.player_id AND o.season = f.season AND o.week = f.week AND o.season_type = f.season_type
            LEFT JOIN football.football_teams opp ON opp.team_id = f.opponent_team_id
           ORDER BY refs.key, f.week`,
        values: [refs.map((r) => r.key), refs.map((r) => r.provider), refs.map((r) => r.providerId)],
        query_timeout: timeoutMs,
      });
      const byKey = new Map();
      for (const row of result?.rows || []) {
        if (!byKey.has(row.key)) byKey.set(row.key, []);
        byKey.get(row.key).push(row);
      }
      const out = new Map();
      for (const [key, weeks] of byKey) out.set(key, summarizeStats(weeks));
      return out;
    },
    async readAuthority({ positions, version = "v1", now = new Date() }) {
      const wanted = [
        ...new Set(
          (Array.isArray(positions) ? positions : [])
            .map((position) => String(position || "").toUpperCase())
            .filter((position) => /^(QB|RB|WR|TE|K|DEF)$/.test(position)),
        ),
      ];
      if (!wanted.length || !/^v[0-9]{1,3}$/.test(version)) return new Map();
      const result = await query({
        name: "warehouse-sight-authority-read-v1",
        text: `
          WITH latest_season AS (
            SELECT MAX(season) AS season
              FROM football.football_metric_runs
             WHERE metric_name = 'omen_sight_accuracy' AND formula_version = $1 AND state = 'succeeded'
               AND parameters ? 'summary'
          )
          SELECT season, week, finished_at, parameters->'summary' AS summary
            FROM football.football_metric_runs AS runs
            JOIN latest_season USING (season)
           WHERE runs.metric_name = 'omen_sight_accuracy' AND runs.formula_version = $1 AND runs.state = 'succeeded'
             AND runs.parameters ? 'summary'
           ORDER BY season DESC, week DESC
           LIMIT 36`,
        values: [version],
        query_timeout: timeoutMs,
      });
      const evaluations = result?.rows || [];
      return new Map(
        wanted.map((position) => [
          position,
          resolveForecastAuthority({
            position,
            modelVersion: version,
            evaluations,
            now,
          }),
        ]),
      );
    },
    /** Map(app player key -> sight block). Players Sight has no read for are absent. */
    async readSight({ playerKeys, version = "v1", hints = null }) {
      const allRefs = [
        ...new Map(
          (Array.isArray(playerKeys) ? playerKeys : [])
            .map(parseRef)
            .filter(Boolean)
            .map((r) => [r.key, r]),
        ).values(),
      ];
      if (!/^v[0-9]{1,3}$/.test(version)) return new Map();
      // One query reads at most MAX_REFS players; a bigger set (every roster in a large league)
      // is read in batches rather than silently cut off.
      if (allRefs.length > MAX_REFS) {
        const batches = [];
        for (let i = 0; i < allRefs.length; i += MAX_REFS) batches.push(allRefs.slice(i, i + MAX_REFS));
        const reads = await Promise.all(
          batches.map((batch) => repository.readSight({ playerKeys: batch.map((r) => r.key), version, hints })),
        );
        const merged = new Map(reads.flatMap((read) => [...read]));
        return merged;
      }
      const refs = allRefs;
      if (!/^v[0-9]{1,3}$/.test(version)) return new Map();
      const result = !refs.length
        ? { rows: [] }
        : await query({
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
      const defenses = [
        ...new Map(
          (Array.isArray(playerKeys) ? playerKeys : [])
            .map(parseDefenseRef)
            .filter(Boolean)
            .map((r) => [r.key, r]),
        ).values(),
      ].slice(0, 64);
      const teamRows = defenses.length
        ? (
            await query({
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
              values: [
                defenses.map((r) => r.key),
                defenses.map((r) => r.provider),
                defenses.map((r) => r.providerId),
                version,
              ],
              query_timeout: timeoutMs,
            })
          )?.rows || []
        : [];
      // Fallback for players the index has not paired: the one player on that NFL team's current roster at that
      // position whose name matches. Unique or nothing; it never guesses between two.
      const found = new Set((result?.rows || []).map((row) => row.key));
      const pending = refs
        .filter((r) => !found.has(r.key) && hints instanceof Map)
        .map((r) => hintOf(r.key, hints.get(r.key)))
        .filter(Boolean)
        .slice(0, 200);
      const hintRows = pending.length
        ? (
            await query({
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
              values: [
                pending.map((h) => h.key),
                pending.map((h) => h.name),
                pending.map((h) => h.team),
                pending.map((h) => h.position),
                version,
              ],
              query_timeout: timeoutMs,
            })
          )?.rows || []
        : [];
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
          drivers: contributions
            .slice(0, 3)
            .map((p) => ({ name: p.name, label: sightDriverLabel(p.name), points: Math.round(p.points * 10) / 10 })),
          // Sleeper's injury report (once a day). Absent means Sleeper lists no injury, not "healthy for sure".
          ...(row.injury_status
            ? {
                injury: {
                  status: row.injury_status,
                  body_part: row.injury_body_part || null,
                  practice: row.injury_practice || null,
                  source: "sleeper",
                },
              }
            : {}),
        });
      }
      // The bye week of the NFL team the provider lists for each player (League-GM planning: who covers it).
      if (out.size && hints instanceof Map) {
        let map = new Map();
        try {
          map = await byeWeeks();
        } catch {
          map = new Map();
        }
        for (const [key, block] of out) {
          const team = String(hints.get(key)?.team || "")
            .trim()
            .toUpperCase();
          const bye = /^[A-Z]{2,3}$/.test(team)
            ? map.get(`omen:team:${(TEAM_ALIASES[team] || team).toLowerCase()}`)
            : undefined;
          if (Number.isInteger(bye)) block.bye_week = bye;
        }
      }
      return out;
    },
  };
  return repository;
}

module.exports = {
  SIGHT_DRIVER_LABELS,
  sightDriverLabel,
  createWarehouseSightRepository,
  parseRef,
  parseDefenseRef,
  hintOf,
  normalName,
};
