#!/usr/bin/env node
"use strict";

// Offline, READ-ONLY walk-forward backtest of the Omen projection against a warehouse copy.
//
//   node scripts/omen-projections-backtest.js --seasons 2022-2025 --out-dir /abs/dir \
//        [--warmup 2] [--positions QB,RB,WR,TE] [--sleeper] [--socket DIR | --url-file /abs/file]
//
// Connection (never printed, never logged):
//   --url-file /abs/path   a 0600 file holding a postgres:// URL (preferred), or
//   --socket DIR           a local Postgres unix-socket directory (LOGIN role omen_warehouse_read), or
//   OMEN_BACKTEST_DATABASE_URL_FILE=/abs/path (same as --url-file).
// URL mode uses a LOGIN role with membership in omen_warehouse_reader; socket mode uses omen_warehouse_read.
// The session is forced read-only (default_transaction_read_only=on) and the
// script refuses to start when SHOW transaction_read_only is not "on". Statements are SELECT only.
//
// Output: <out-dir>/omen-projections-backtest.json and omen-projections-backtest.md.
// Spec: Blueprints/specs/football-data/omen-projections-v1.md.

const fs = require("node:fs");
const path = require("node:path");

function parseSeasons(text) {
  const match = /^(\d{4})(?:-(\d{4}))?$/.exec(String(text || ""));
  if (!match) throw new TypeError("--seasons must look like 2024 or 2022-2025");
  const from = Number(match[1]);
  const to = Number(match[2] || match[1]);
  if (to < from || from < 2000 || to > 2100) throw new RangeError("--seasons range is invalid");
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function parseArgs(argv) {
  const out = {
    seasons: null,
    warmup: 2,
    positions: ["QB", "RB", "WR", "TE"],
    sleeper: false,
    socket: null,
    urlFile: null,
    outDir: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--sleeper") {
      out.sleeper = true;
      continue;
    }
    const value = argv[i + 1];
    i += 1;
    if (flag === "--seasons") out.seasons = parseSeasons(value);
    else if (flag === "--warmup") out.warmup = Number(value);
    else if (flag === "--positions")
      out.positions = String(value)
        .split(",")
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean);
    else if (flag === "--socket") out.socket = value;
    else if (flag === "--url-file") out.urlFile = value;
    else if (flag === "--out-dir") out.outDir = value;
    else throw new TypeError(`unknown flag ${flag}`);
  }
  if (!out.seasons) throw new TypeError("--seasons is required");
  if (!out.outDir || !path.isAbsolute(out.outDir)) throw new TypeError("--out-dir must be an absolute path");
  if (!Number.isInteger(out.warmup) || out.warmup < 0 || out.warmup > 10) throw new RangeError("--warmup must be 0-10");
  for (const p of out.positions)
    if (!["QB", "RB", "WR", "TE"].includes(p)) throw new RangeError(`unsupported position ${p}`);
  return out;
}

function poolConfig(args, env) {
  const readOnly = "-c default_transaction_read_only=on -c statement_timeout=300000";
  if (args.socket)
    return { host: args.socket, user: "omen_warehouse_read", database: "omen_football", options: readOnly, max: 2 };
  const file = args.urlFile || env.OMEN_BACKTEST_DATABASE_URL_FILE;
  if (!file) throw new TypeError("give --url-file, --socket or OMEN_BACKTEST_DATABASE_URL_FILE");
  const { connectionStringFromFile } = require("../src/services/footballWarehouse/runtimeConfig");
  const connectionString = connectionStringFromFile({ FOOTBALL_WAREHOUSE_DATABASE_URL_FILE: file });
  return { connectionString, options: readOnly, max: 2 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { Pool } = require("pg");
  const { createPgSource } = require("../src/services/omenProjections/pgSource");
  const { renderMarkdown, runBacktest } = require("../src/services/omenProjections/backtest");

  const pool = new Pool(poolConfig(args, process.env));
  try {
    const source = createPgSource({ query: (text, values) => pool.query(text, values), includeSleeper: args.sleeper });
    await source.assertReadOnly();
    const report = await runBacktest({
      source,
      testSeasons: args.seasons,
      warmupSeasons: args.warmup,
      positions: args.positions,
      onProgress: ({ season, tested, records }) =>
        process.stderr.write(`season ${season}${tested ? " tested" : " warm-up"}, ${records} records\n`),
    });
    fs.mkdirSync(args.outDir, { recursive: true });
    fs.writeFileSync(path.join(args.outDir, "omen-projections-backtest.json"), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(args.outDir, "omen-projections-backtest.md"), renderMarkdown(report));
    process.stdout.write(
      `wrote ${path.join(args.outDir, "omen-projections-backtest.md")} and .json (${report.meta.records} player-weeks)\n`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`omen-projections-backtest failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, parseSeasons, poolConfig };
