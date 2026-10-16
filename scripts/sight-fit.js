#!/usr/bin/env node
"use strict";

/**
 * Fit Sight's adaptive component weights from history, read-only against the warehouse.
 *
 * For every season S, week w (3..16) and skill position, it computes each qualified player's
 * season-to-date components (the same raw components RAT-RB/WR/TE use), shrinks and z-scores them
 * within that week's cohort, and pairs them with the player's actual PPR points in week w+1.
 * Weights are fitted per (position, phase) with ridge regression on the 5 seasons BEFORE the target
 * season (so each season's weights reflect the recent era), then evaluated out of sample.
 *
 *   node scripts/sight-fit.js --from 1999 --to 2025 --test 2024,2025 > weights.json
 *
 * Needs FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE (reader role). Writes nothing to the database.
 */

const fs = require("node:fs");
const path = require("node:path");

const here = __dirname.endsWith("scripts") ? path.join(__dirname, "..") : "/tmp/sight";
const req = (p) => require(fs.existsSync(path.join(here, p)) ? path.join(here, p) : path.join(here, path.basename(p)));
const { SPECS, aggregateSkillPlays } = req("src/services/footballWarehouse/ratSkillMetric.js");

const PHASES = Object.freeze([
  { key: "early", from: 3, to: 5 },          // role still forming; small samples
  { key: "pre_deadline", from: 6, to: 9 },   // roles settled, trade deadline approaching
  { key: "post_deadline", from: 10, to: 16 },// late season and fantasy playoffs
]);
const ERA_SEASONS = 5;
const RIDGE = 5;
const MIN_TARGET_WEEK_ROWS = 50;

function phaseOf(week) {
  return PHASES.find((p) => week >= p.from && week <= p.to)?.key || null;
}

function args() {
  const out = { from: 1999, to: 2025, test: [2024, 2025] };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 2) {
    if (a[i] === "--from") out.from = Number(a[i + 1]);
    if (a[i] === "--to") out.to = Number(a[i + 1]);
    if (a[i] === "--test") out.test = a[i + 1].split(",").map(Number);
  }
  return out;
}

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };

// Qualification scales with the week so early-season cohorts exist: a fixed 25 targets would leave week 3 empty.
function qualifies(position, agg, week) {
  if (position === "QB") return agg.dropbacks >= Math.max(30, Math.round(100 * week / 17));
  if (position === "RB") return agg.carries >= Math.max(10, Math.round(40 * week / 17));
  if (position === "WR") return agg.targets >= Math.max(8, Math.round(25 * week / 17));
  return agg.targets >= Math.max(6, Math.round(20 * week / 17));
}

/** Rows {season, week, position, phase, id, x: number[], ppgToDate, y} for one season. */
function rowsForSeason(season, plays, positions, weekly) {
  const byWeek = new Map();
  for (const p of plays) { if (!byWeek.has(p.week)) byWeek.set(p.week, []); byWeek.get(p.week).push(p); }
  const rows = [];
  const cumulative = [];
  for (let week = 1; week <= 17; week += 1) {
    cumulative.push(...(byWeek.get(week) || []));
    const phase = phaseOf(week);
    if (!phase) continue;
    const next = weekly.get(`${season}|${week + 1}`);
    if (!next || next.size < MIN_TARGET_WEEK_ROWS) continue;
    const agg = aggregateSkillPlays(cumulative, positions);
    for (const position of Object.keys(SPECS)) {
      const spec = SPECS[position];
      const ids = [...agg.keys()].filter((id) => positions.get(id)?.position === position && qualifies(position, agg.get(id), week));
      if (ids.length < 8) continue;
      const raws = ids.map((id) => spec.raw(agg.get(id)));
      const feats = spec.components.map((c) => {
        const totalN = raws.reduce((s, r) => s + r[c.key].n, 0);
        const prior = totalN > 0 ? raws.reduce((s, r) => s + r[c.key].sum, 0) / totalN : 0;
        const shrunk = raws.map((r) => (r[c.key].raw == null || r[c.key].n === 0 ? prior : (r[c.key].n * r[c.key].raw + c.shrinkK * prior) / (r[c.key].n + c.shrinkK)));
        const m = mean(shrunk); const s = sd(shrunk);
        return shrunk.map((v) => (s > 1e-9 ? c.sign * (v - m) / s : 0));
      });
      const ppg = ids.map((id) => {
        const toDate = [];
        for (let w = 1; w <= week; w += 1) { const v = weekly.get(`${season}|${w}`)?.get(id); if (v != null) toDate.push(v); }
        return toDate.length ? mean(toDate) : 0;
      });
      const pm = mean(ppg); const ps = sd(ppg);
      ids.forEach((id, i) => {
        const y = next.get(id);
        if (y == null) return; // did not play next week: no label (injury/bye is not the model's question)
        rows.push({ season, week, position, phase, id, x: feats.map((f) => f[i]), xp: ps > 1e-9 ? (ppg[i] - pm) / ps : 0, ppgToDate: ppg[i], y });
      });
    }
  }
  return rows;
}

function ridge(rows, k) {
  // y = b0 + sum(b_j x_j); standardize y within the fit set; solve (X'X + lambda I) b = X'y.
  const n = k + 1;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (const r of rows) {
    const x = [1, ...r.x];
    for (let i = 0; i < n; i += 1) { b[i] += x[i] * r.y; for (let j = 0; j < n; j += 1) A[i][j] += x[i] * x[j]; }
  }
  for (let i = 1; i < n; i += 1) A[i][i] += RIDGE * rows.length / 100;
  // Gaussian elimination
  for (let c = 0; c < n; c += 1) {
    let p = c; for (let r = c + 1; r < n; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c || A[c][c] === 0) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j < n; j += 1) A[r][j] -= f * A[c][j];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

function corr(a, b) {
  const ma = mean(a); const mb = mean(b);
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < a.length; i += 1) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

async function main() {
  const opts = args();
  const { Pool } = require(fs.existsSync("/app/node_modules/pg") ? "/app/node_modules/pg" : "pg");
  const pool = new Pool({ connectionString: fs.readFileSync(process.env.FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE, "utf8").trim(), ssl: false });
  const playsSql = fs.readFileSync(fs.existsSync(path.join(here, "plays.sql")) ? path.join(here, "plays.sql") : "/tmp/sight/plays.sql", "utf8")
    .replace("SELECT p.game_id", "SELECT p.week, p.game_id");
  const players = await pool.query("SELECT player_id, gsis_id, football_position FROM football.football_players WHERE football_position IN ('QB','RB','FB','WR','TE')");
  const positions = new Map(players.rows.map((r) => [r.player_id, { position: r.football_position === "FB" ? "RB" : r.football_position, gsis: r.gsis_id }]));

  const all = [];
  for (let season = opts.from; season <= opts.to; season += 1) {
    const plays = await pool.query(playsSql, [season, null]);
    const stats = await pool.query("SELECT week, player_id, fantasy_points_ppr FROM football.nfl_player_weekly_stats WHERE season = $1 AND season_type = 'REG'", [season]);
    const weekly = new Map();
    for (const r of stats.rows) {
      const key = `${season}|${r.week}`;
      if (!weekly.has(key)) weekly.set(key, new Map());
      weekly.get(key).set(r.player_id, Number(r.fantasy_points_ppr));
    }
    const rows = rowsForSeason(season, plays.rows.map((r) => ({
      week: r.week, gameId: r.game_id, posteamId: r.posteam_id, receiverId: r.receiver_player_id, rusherId: r.rusher_player_id,
      epa: r.epa, yacEpa: r.yac_epa, success: r.success, passAttempt: r.pass_attempt, rushAttempt: r.rush_attempt, sack: r.sack,
      qbScramble: r.qb_scramble, twoPoint: r.two_point, completePass: r.complete_pass, cp: r.cp, yardsGained: r.yards_gained,
      airYards: r.air_yards, yardline100: r.yardline_100, fumbleLost: r.fumble_lost, fumbledGsisId: r.fumbled_gsis_id,
      passerId: r.passer_player_id, qbDropback: r.qb_dropback, interception: r.interception, cpoe: r.cpoe,
    })), positions, weekly);
    all.push(...rows);
    process.stderr.write(`season ${season}: ${rows.length} rows\n`);
  }
  await pool.end();

  // Weights per (target season, position, phase), fitted on the ERA_SEASONS seasons before it.
  const weights = {};
  const evaluation = {};
  const lastSeason = opts.to;
  for (let target = opts.from + ERA_SEASONS; target <= lastSeason + 1; target += 1) {
    for (const position of Object.keys(SPECS)) {
      for (const { key: phase } of PHASES) {
        const fit = all.filter((r) => r.position === position && r.phase === phase && r.season >= target - ERA_SEASONS && r.season < target);
        if (fit.length < 200) continue;
        const beta = ridge(fit, SPECS[position].components.length);
        const withProd = fit.map((r) => ({ ...r, x: [...r.x, r.xp] }));
        const betaP = ridge(withProd, SPECS[position].components.length + 1);
        (weights[target] ||= {})[position] ||= {};
        weights[target][position][phase] = {
          fitted_on: [target - ERA_SEASONS, target - 1], rows: fit.length,
          intercept: Number(beta[0].toFixed(4)),
          weights: Object.fromEntries(SPECS[position].components.map((c, i) => [c.key, Number(beta[i + 1].toFixed(4))])),
          with_production: {
            intercept: Number(betaP[0].toFixed(4)),
            weights: Object.fromEntries([...SPECS[position].components.map((c) => c.key), "production_ppg"].map((k, i) => [k, Number(betaP[i + 1].toFixed(4))])),
          },
        };
        if (opts.test.includes(target)) {
          const test = all.filter((r) => r.position === position && r.phase === phase && r.season === target);
          if (test.length < 30) continue;
          const fitted = test.map((r) => beta[0] + r.x.reduce((s, x, i) => s + beta[i + 1] * x, 0));
          const sight = test.map((r) => betaP[0] + [...r.x, r.xp].reduce((s, x, i) => s + betaP[i + 1] * x, 0));
          const v0 = test.map((r) => r.x.reduce((s, x, i) => s + SPECS[position].components[i].weight * x, 0));
          const ppg = test.map((r) => r.ppgToDate);
          const y = test.map((r) => r.y);
          (evaluation[target] ||= {})[position] ||= {};
          evaluation[target][position][phase] = {
            n: test.length,
            corr_sight: Number(corr(sight, y).toFixed(3)),
            corr_fitted: Number(corr(fitted, y).toFixed(3)),
            corr_v0: Number(corr(v0, y).toFixed(3)),
            corr_ppg_to_date: Number(corr(ppg, y).toFixed(3)),
          };
        }
      }
    }
  }
  process.stdout.write(JSON.stringify({ schema: "sight-weights.v1", phases: PHASES, era_seasons: ERA_SEASONS, ridge: RIDGE, weights, evaluation }, null, 2));
}

main().catch((e) => { console.error("fit failed:", e.message); process.exit(1); });
