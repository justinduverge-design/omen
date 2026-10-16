#!/usr/bin/env node
"use strict";

/**
 * Fit Sight weights for kickers (K) and team defenses (DEF), read-only against the warehouse. Same method as
 * sight-fit.js: season-to-date features through week W (shrunk, z-scored within the week's cohort), production
 * (fantasy points per game to date), and context for week W+1 (K: own team's implied total; DEF: the opponent's
 * implied total), fitted per phase with ridge regression on the five seasons before each target season.
 * Target: Omen's own standard fantasy points in week W+1 (kdefMetric.js), since nflverse does not score K or DEF.
 *
 *   node scripts/sight-fit-kdef.js --from 1999 --to 2025 --test 2022,2023,2024,2025 > kdef-weights.json
 */

const fs = require("node:fs");
const path = require("node:path");

const here = __dirname.endsWith("scripts") ? path.join(__dirname, "..") : "/tmp/sight";
const req = (p) => require(fs.existsSync(path.join(here, p)) ? path.join(here, p) : path.join(here, path.basename(p)));
const { SPECS, weeklyLines, toDate } = req("src/services/footballWarehouse/kdefMetric.js");

const PHASES = [{ key: "early", from: 3, to: 5 }, { key: "pre_deadline", from: 6, to: 9 }, { key: "post_deadline", from: 10, to: 16 }];
const ERA_SEASONS = 5;
const RIDGE = 5;
const phaseOf = (w) => PHASES.find((p) => w >= p.from && w <= p.to)?.key || null;
const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };

const PLAYS_SQL = `
  SELECT p.week, p.game_id, p.posteam_id, p.defteam_id, p.epa, p.play_type,
         p.source_row->>'kicker_player_id' AS kicker_gsis, p.source_row->>'field_goal_attempt' AS fga,
         p.source_row->>'field_goal_result' AS fg_result, p.source_row->>'kick_distance' AS kick_distance,
         p.source_row->>'extra_point_attempt' AS xpa, p.source_row->>'extra_point_result' AS xp_result,
         p.source_row->>'sack' AS sack, p.source_row->>'interception' AS interception,
         p.source_row->>'fumble_lost' AS fumble_lost, p.source_row->>'fumble_recovery_1_team' AS fr_team,
         p.source_row->>'touchdown' AS touchdown, p.source_row->>'td_team' AS td_team, p.source_row->>'safety' AS safety,
         p.source_row->>'qb_dropback' AS qb_dropback
    FROM football.nfl_plays p JOIN football.nfl_games g ON g.season = p.season AND g.game_id = p.game_id
   WHERE p.season = $1 AND g.game_type = 'REG'`;
const GAMES_SQL = "SELECT week, home_team_id, away_team_id, home_score, away_score, spread_line, total_line FROM football.nfl_games WHERE season = $1 AND game_type = 'REG'";
const KICKERS_SQL = "SELECT player_id, gsis_id FROM football.football_players WHERE football_position = 'K' AND gsis_id IS NOT NULL";

function mapPlay(r) {
  return { week: r.week, gameId: r.game_id, posteamId: r.posteam_id, defteamId: r.defteam_id, epa: r.epa, playType: r.play_type,
    kickerGsis: r.kicker_gsis, fieldGoalAttempt: r.fga, fieldGoalResult: r.fg_result, kickDistance: r.kick_distance,
    extraPointAttempt: r.xpa, extraPointResult: r.xp_result, sack: r.sack, interception: r.interception, fumbleLost: r.fumble_lost,
    fumbleRecoveryTeam: r.fr_team, touchdown: r.touchdown, tdTeam: r.td_team, safety: r.safety, qbDropback: r.qb_dropback };
}

/** Next game per (week, team): opponent and both implied totals. */
function nextGames(games) {
  const m = new Map();
  for (const g of games) {
    const total = g.total_line == null ? null : Number(g.total_line);
    const spread = g.spread_line == null ? null : Number(g.spread_line);
    const home = total != null && spread != null ? total / 2 + spread / 2 : null;
    const away = total != null && spread != null ? total / 2 - spread / 2 : null;
    m.set(`${g.week}|${g.home_team_id}`, { opp: g.away_team_id, own: home, oppImplied: away });
    m.set(`${g.week}|${g.away_team_id}`, { opp: g.home_team_id, own: away, oppImplied: home });
  }
  return m;
}

function teamOfKicker(lines, plays) {
  const byKicker = new Map(); // id -> Map(week -> team)
  return byKicker;
}

function rowsForSeason(season, playRows, gameRows, kickerByGsis) {
  const plays = playRows.map(mapPlay);
  const games = gameRows.map((g) => ({ week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, homeScore: g.home_score, awayScore: g.away_score }));
  const lines = weeklyLines(plays, games, kickerByGsis);
  const next = nextGames(gameRows);
  // A kicker's team in a week: the posteam on his kicks.
  const kickerTeam = new Map();
  for (const p of plays) {
    const id = p.kickerGsis ? kickerByGsis.get(p.kickerGsis) : null;
    if (id && p.posteamId) kickerTeam.set(`${id}|${p.week}`, p.posteamId);
  }
  const rows = [];
  for (let week = 1; week <= 17; week += 1) {
    const phase = phaseOf(week);
    if (!phase) continue;
    const td = toDate(lines, week);
    for (const position of ["K", "DEF"]) {
      const spec = SPECS[position];
      const pool = position === "K" ? td.kickers : td.defenses;
      const ids = [...pool.keys()].filter((id) => spec.qualifies(pool.get(id), week)).sort();
      if (ids.length < 8) continue;
      const raws = ids.map((id) => spec.raw(pool.get(id)));
      const feats = spec.components.map((c) => {
        const totalN = raws.reduce((s, r) => s + r[c.key].n, 0);
        const prior = totalN > 0 ? raws.reduce((s, r) => s + r[c.key].sum, 0) / totalN : 0;
        const shrunk = raws.map((r) => (r[c.key].raw == null || r[c.key].n === 0 ? prior : (r[c.key].n * r[c.key].raw + c.shrinkK * prior) / (r[c.key].n + c.shrinkK)));
        const m = mean(shrunk); const s = sd(shrunk);
        return shrunk.map((v) => (s > 1e-9 ? c.sign * (v - m) / s : 0));
      });
      const prod = ids.map((id) => spec.production(pool.get(id)));
      const pm = mean(prod); const ps = sd(prod);
      const ctxRaw = ids.map((id) => {
        let team = id;
        if (position === "K") { for (let w = week; w >= 1 && !kickerTeam.has(`${id}|${w}`); w -= 1); team = [...Array(week).keys()].map((i) => kickerTeam.get(`${id}|${week - i}`)).find(Boolean); }
        const g = team ? next.get(`${week + 1}|${team}`) : null;
        return g ? (position === "K" ? g.own : g.oppImplied) : null;
      });
      const vals = ctxRaw.filter((v) => v != null);
      const cm = vals.length ? mean(vals) : 0; const cs = vals.length ? sd(vals) : 0;
      ids.forEach((id, i) => {
        const weeks = position === "K" ? lines.kickers.get(id) : lines.defenses.get(id);
        const nextLine = weeks?.get(week + 1);
        if (!nextLine || (position === "DEF" && nextLine.pointsAllowed == null) || (position === "K" && nextLine.fga + nextLine.xpa === 0)) return;
        rows.push({ season, week, position, phase, id, x: feats.map((f) => f[i]), xp: ps > 1e-9 ? (prod[i] - pm) / ps : 0,
          xc: [ctxRaw[i] == null || cs <= 1e-9 ? 0 : (ctxRaw[i] - cm) / cs], production: prod[i], y: nextLine.fp });
      });
    }
  }
  return rows;
}

function ridge(rows, k) {
  const n = k + 1;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (const r of rows) { const x = [1, ...r.x]; for (let i = 0; i < n; i += 1) { b[i] += x[i] * r.y; for (let j = 0; j < n; j += 1) A[i][j] += x[i] * x[j]; } }
  for (let i = 1; i < n; i += 1) A[i][i] += RIDGE * rows.length / 100;
  for (let c = 0; c < n; c += 1) {
    let p = c; for (let r = c + 1; r < n; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r += 1) { if (r === c || A[c][c] === 0) continue; const f = A[r][c] / A[c][c]; for (let j = c; j < n; j += 1) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; }
  }
  return b.map((v, i) => v / A[i][i]);
}
function corr(a, b) { const ma = mean(a); const mb = mean(b); let num = 0; let da = 0; let db = 0; for (let i = 0; i < a.length; i += 1) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? num / Math.sqrt(da * db) : 0; }

async function main() {
  const a = process.argv.slice(2); const opts = { from: 1999, to: 2025, test: [2022, 2023, 2024, 2025] };
  for (let i = 0; i < a.length; i += 2) { if (a[i] === "--from") opts.from = Number(a[i + 1]); if (a[i] === "--to") opts.to = Number(a[i + 1]); if (a[i] === "--test") opts.test = a[i + 1].split(",").map(Number); }
  const { Pool } = require(fs.existsSync("/app/node_modules/pg") ? "/app/node_modules/pg" : "pg");
  const pool = new Pool({ connectionString: fs.readFileSync(process.env.FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE, "utf8").trim(), ssl: false });
  const kickers = new Map((await pool.query(KICKERS_SQL)).rows.map((r) => [r.gsis_id, r.player_id]));
  const all = [];
  for (let season = opts.from; season <= opts.to; season += 1) {
    const plays = (await pool.query(PLAYS_SQL, [season])).rows;
    const games = (await pool.query(GAMES_SQL, [season])).rows;
    const rows = rowsForSeason(season, plays, games, kickers);
    all.push(...rows);
    process.stderr.write(`season ${season}: ${rows.length} rows\n`);
  }
  await pool.end();
  const weights = {}; const evaluation = {};
  for (let target = opts.from + ERA_SEASONS; target <= opts.to + 1; target += 1) {
    for (const position of ["K", "DEF"]) for (const { key: phase } of PHASES) {
      const fit = all.filter((r) => r.position === position && r.phase === phase && r.season >= target - ERA_SEASONS && r.season < target);
      if (fit.length < 150) continue;
      const comps = SPECS[position].components.map((c) => c.key);
      const beta = ridge(fit.map((r) => ({ ...r, x: [...r.x, r.xp, ...r.xc] })), comps.length + 2);
      const names = [...comps, "production_ppg", position === "K" ? "implied_team_total" : "opponent_implied_total"];
      ((weights[target] ||= {})[position] ||= {})[phase] = { fitted_on: [target - ERA_SEASONS, target - 1], rows: fit.length,
        with_context: { intercept: Number(beta[0].toFixed(4)), weights: Object.fromEntries(names.map((k, i) => [k, Number(beta[i + 1].toFixed(4))])) } };
      if (opts.test.includes(target)) {
        const test = all.filter((r) => r.position === position && r.phase === phase && r.season === target);
        if (test.length < 30) continue;
        const pred = test.map((r) => beta[0] + [...r.x, r.xp, ...r.xc].reduce((s, x, i) => s + beta[i + 1] * x, 0));
        ((evaluation[target] ||= {})[position] ||= {})[phase] = { n: test.length,
          corr_sight: Number(corr(pred, test.map((r) => r.y)).toFixed(3)), corr_production: Number(corr(test.map((r) => r.production), test.map((r) => r.y)).toFixed(3)) };
      }
    }
  }
  process.stdout.write(JSON.stringify({ schema: "sight-weights-kdef.v1", weights, evaluation }, null, 2));
}

main().catch((e) => { console.error("fit failed:", e.message); process.exit(1); });
