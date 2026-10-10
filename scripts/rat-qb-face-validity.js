#!/usr/bin/env node
"use strict";

// Prints the RAT-QB v0 face-validity table (top and bottom 10) for one season
// from a stored metric run. Read-only. It computes nothing and claims nothing:
// it prints what the warehouse holds, or says that no run exists.
//
//   node scripts/rat-qb-face-validity.js --season 2025 [--week N] [--limit 10] [--socket DIR]
//
// Connection: --socket DIR (local Postgres unix socket, user postgres), or
// FOOTBALL_WAREHOUSE_DATABASE_URL_FILE (absolute path to a 0600 URL file).

const { Pool } = require("pg");
const { connectionStringFromFile } = require("../src/services/footballWarehouse/runtimeConfig");
const { METRIC_NAME, FORMULA_VERSION } = require("../src/services/footballWarehouse/ratQbMetric");

function parseArgs(argv) {
  const out = { season: null, week: null, socket: null, limit: 10 };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--season") out.season = Number(value);
    else if (flag === "--week") out.week = Number(value);
    else if (flag === "--socket") out.socket = value;
    else if (flag === "--limit") out.limit = Number(value);
    else throw new TypeError(`unknown flag ${flag}`);
  }
  if (!Number.isInteger(out.season)) throw new TypeError("--season is required");
  if (out.week !== null && !Number.isInteger(out.week)) throw new TypeError("--week must be an integer");
  if (!Number.isInteger(out.limit) || out.limit < 1 || out.limit > 50) throw new TypeError("--limit must be 1-50");
  return out;
}

const SQL = `
  SELECT p.display_name, v.value, (v.components->>'dropbacks')::integer AS dropbacks,
         (v.components->'components'->'epa_per_dropback'->>'raw')::float8 AS epa_db,
         (v.components->'components'->'cpoe'->>'raw')::float8 AS cpoe,
         (v.components->'components'->'sack_avoidance_rate'->>'raw')::float8 AS sack_avoid,
         (v.components->'components'->'turnover_rate'->>'raw')::float8 AS tov_rate,
         (v.components->'components'->'rush_epa'->>'raw')::float8 AS rush_epa
    FROM football.football_metric_runs r
    JOIN football.football_metric_values v ON v.metric_run_id = r.id
    JOIN football.football_players p ON p.player_id = v.entity_id
   WHERE r.metric_name = $1 AND r.formula_version = $2 AND r.season = $3
     AND r.week IS NOT DISTINCT FROM $4::integer AND r.state = 'succeeded' AND v.entity_type = 'player'
   ORDER BY v.value DESC, p.display_name`;

function fmt(value, digits) {
  return value == null ? "-" : value.toFixed(digits);
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  console.log("grade  dropbacks  epa/db   cpoe  sackAvoid  tov/db  rushEPA  name");
  for (const r of rows) {
    console.log([
      fmt(r.value, 1).padStart(5), String(r.dropbacks).padStart(9), fmt(r.epa_db, 3).padStart(6),
      fmt(r.cpoe, 2).padStart(5), fmt(r.sack_avoid, 3).padStart(9), fmt(r.tov_rate, 3).padStart(6),
      fmt(r.rush_epa, 3).padStart(7), r.display_name,
    ].join("  "));
  }
}

async function main() {
  const { season, week, socket, limit } = parseArgs(process.argv.slice(2));
  const pool = socket
    ? new Pool({ host: socket, user: "postgres", database: "postgres", max: 1 })
    : new Pool({ connectionString: connectionStringFromFile(process.env), max: 1 });
  try {
    const { rows } = await pool.query(SQL, [METRIC_NAME, FORMULA_VERSION, season, week]);
    const scope = week == null ? "regular season to date" : `through week ${week}`;
    if (!rows.length) {
      console.log(`No stored ${METRIC_NAME} ${FORMULA_VERSION} grades for ${season} (${scope}). Run it first; nothing is computed here.`);
      return;
    }
    console.log(`${METRIC_NAME} ${FORMULA_VERSION}, ${season}, ${scope}: ${rows.length} qualified QBs (unfitted, not opponent-adjusted)`);
    printTable(`Top ${Math.min(limit, rows.length)}`, rows.slice(0, limit));
    printTable(`Bottom ${Math.min(limit, rows.length)}`, rows.slice(-limit).reverse());
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
