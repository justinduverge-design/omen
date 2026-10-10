#!/usr/bin/env node
"use strict";

/**
 * Builds the Fated Points lookup tables (formula xfp-v1) from earlier seasons of nflverse
 * play-by-play, and writes src/services/fantasyMetrics/xfp-tables-v1.json.
 *
 *   node scripts/build-xfp-tables.js <pbp_2023.csv.gz> <pbp_2024.csv.gz> <pbp_2025.csv.gz>
 *
 * Inputs are local gzipped nflverse play-by-play files (download them from
 * https://github.com/nflverse/nflverse-data/releases/tag/pbp). Training uses only seasons before the
 * season being scored. The output records each input's SHA-256, the seasons, per-bucket counts, and a
 * SHA-256 of the table content, so a run is reproducible and auditable.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const zlib = require("zlib");
const { parseCsvLine } = require("../src/services/csvRows");
const { FORMULA_VERSION, PBP_COLUMNS, compactPlay, targetKeys, carryKeys } = require("../src/services/fantasyMetrics/fatedPoints");

const OUT = path.join(__dirname, "..", "src", "services", "fantasyMetrics", "xfp-tables-v1.json");

async function readPlays(file) {
  const bytes = fs.readFileSync(file);
  const sha256 = `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let keep = null;
  const plays = [];
  const seasons = new Set();
  for await (const line of lines) {
    if (!line) continue;
    const values = parseCsvLine(line);
    if (!keep) {
      keep = PBP_COLUMNS.map((c) => [c, values.indexOf(c)]);
      const missing = keep.filter(([, i]) => i < 0).map(([c]) => c);
      if (missing.length) throw new Error(`${file} is missing columns: ${missing.join(", ")}`);
      continue;
    }
    const row = {};
    for (const [c, i] of keep) row[c] = values[i] == null ? "" : values[i].trim();
    const play = compactPlay(row);
    if (play) { plays.push(play); seasons.add(play.season); }
  }
  return { plays, sha256, seasons: [...seasons] };
}

function accumulate(buckets, keys, values) {
  for (const key of keys) {
    if (!buckets[key]) buckets[key] = { n: 0, sums: {} };
    const b = buckets[key];
    b.n += 1;
    for (const [field, value] of Object.entries(values)) b.sums[field] = (b.sums[field] || 0) + value;
  }
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error("usage: node scripts/build-xfp-tables.js <pbp.csv.gz>...");
  const sources = [];
  const raw = {};
  const catches = {}; // target buckets: receptions, for fumble-per-catch
  for (const file of files) {
    const { plays, sha256, seasons } = await readPlays(file);
    sources.push({ file: path.basename(file), sha256, seasons, plays: plays.length });
    for (const p of plays) {
      if (p.type === "target") {
        accumulate(raw, targetKeys(p), { catch: p.complete ? 1 : 0, yards: p.yards, td: p.td ? 1 : 0 });
        if (p.complete) accumulate(catches, targetKeys(p), { fumble: p.fumbleLost ? 1 : 0 });
      } else {
        accumulate(raw, carryKeys(p), { yards: p.yards, td: p.td ? 1 : 0, fumble: p.fumbleLost ? 1 : 0 });
      }
    }
  }
  const buckets = {};
  for (const key of Object.keys(raw).sort()) {
    const b = raw[key];
    const out = { n: b.n };
    for (const [field, sum] of Object.entries(b.sums)) out[field] = Number((sum / b.n).toFixed(6));
    if (key.startsWith("t")) {
      const c = catches[key];
      out.fumble_per_catch = c && c.n ? Number((c.sums.fumble / c.n).toFixed(6)) : 0;
    }
    buckets[key] = out;
  }
  const content = { formula_version: FORMULA_VERSION, buckets };
  const contentSha = `sha256:${crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex")}`;
  const artifact = {
    formula_version: FORMULA_VERSION,
    built_at: new Date().toISOString(),
    training_seasons: [...new Set(sources.flatMap((s) => s.seasons))].sort(),
    attribution: "nflverse",
    license: "CC BY 4.0",
    sources,
    content_sha256: contentSha,
    buckets,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(artifact, null, 1)}\n`);
  console.log(`wrote ${OUT}: ${Object.keys(buckets).length} buckets, ${contentSha}`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
