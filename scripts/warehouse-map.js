#!/usr/bin/env node
"use strict";

/**
 * The warehouse map: warehouse/map/catalog.json is the source; this script derives the rest.
 *
 *   node scripts/warehouse-map.js write   regenerate warehouse/map/<table>.md and the README index
 *   node scripts/warehouse-map.js sql     print the SQL that loads the map into football.warehouse_map
 *   node scripts/warehouse-map.js check   fail if catalog, generated files and migrations disagree
 *
 * The SQL copy is frozen inside a checksummed migration (0007). A later catalog change ships as a new
 * migration that replaces the rows; `check` tells you when the catalog and the newest map migration differ.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MAP_DIR = path.join(ROOT, "warehouse/map");
const MIGRATIONS = path.join(ROOT, "warehouse/migrations");
const catalog = JSON.parse(fs.readFileSync(path.join(MAP_DIR, "catalog.json"), "utf8"));

function tableFile(t) {
  const gaps = t.gaps.length ? t.gaps.map((g) => `- ${g}`).join("\n") : "- None known.";
  return `<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# football.${t.name}

${t.purpose}

| | |
|---|---|
| Layer | ${t.layer}: ${catalog.layers[t.layer]} |
| Grain | ${t.grain} |
| Source | ${t.source} |
| Refresh | ${t.refresh} |${t.migration ? `\n| Created by | migration ${t.migration} |` : ""}

## Known gaps

${gaps}
`;
}

function readme() {
  const rows = catalog.tables.map((t) => `| [${t.name}](${t.name}.md) | ${t.layer} | ${t.grain} |`).join("\n");
  const layers = Object.entries(catalog.layers).map(([k, v]) => `- **${k}**: ${v}`).join("\n");
  return `<!-- Generated from warehouse/map/catalog.json by scripts/warehouse-map.js. Do not edit. -->
# Warehouse map

${catalog.note}

## Layers

${layers}

## Tables

| Table | Layer | Grain |
|---|---|---|
${rows}
`;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]::text[]` : "array[]::text[]");

function sql() {
  const values = catalog.tables.map((t) =>
    `  (${q(t.name)}, ${q(t.layer)}, ${q(t.grain)}, ${q(t.source)}, ${q(t.refresh)}, ${q(t.purpose)}, ${arr(t.gaps)})`).join(",\n");
  const comments = catalog.tables.map((t) =>
    `  if to_regclass('football.${t.name}') is not null then\n    execute format('comment on table football.%I is %L', ${q(t.name)}, ${q(`[${t.layer}] ${t.purpose}`)});\n  end if;`).join("\n");
  return `insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
${values};

do $$
begin
${comments}
end $$;
`;
}

function migrationTables() {
  const names = new Set();
  for (const file of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    const text = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
    for (const m of text.matchAll(/create table football\.([a-z_]+)\s*\(/g)) names.add(m[1]);
  }
  names.delete("nfl_plays_"); // dynamic per-season partitions of nfl_plays
  return names;
}

function check() {
  const problems = [];
  const inCatalog = new Set(catalog.tables.map((t) => t.name));
  const inMigrations = migrationTables();
  for (const name of inMigrations) if (!inCatalog.has(name)) problems.push(`table football.${name} has no entry in warehouse/map/catalog.json`);
  for (const name of inCatalog) if (!inMigrations.has(name)) problems.push(`catalog entry ${name} has no table in warehouse/migrations`);
  for (const t of catalog.tables) {
    if (!catalog.layers[t.layer]) problems.push(`${t.name}: unknown layer ${t.layer}`);
    for (const key of ["grain", "source", "refresh", "purpose"]) if (!t[key]) problems.push(`${t.name}: ${key} is required`);
    const file = path.join(MAP_DIR, `${t.name}.md`);
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== tableFile(t)) problems.push(`warehouse/map/${t.name}.md is stale: run write`);
  }
  const index = path.join(MAP_DIR, "README.md");
  if (!fs.existsSync(index) || fs.readFileSync(index, "utf8") !== readme()) problems.push("warehouse/map/README.md is stale: run write");
  return problems;
}

if (require.main === module) {
  const command = process.argv[2];
  if (command === "write") {
    for (const t of catalog.tables) fs.writeFileSync(path.join(MAP_DIR, `${t.name}.md`), tableFile(t));
    fs.writeFileSync(path.join(MAP_DIR, "README.md"), readme());
    console.log(`wrote ${catalog.tables.length} table files and the index`);
  } else if (command === "sql") {
    process.stdout.write(sql());
  } else if (command === "check") {
    const problems = check();
    if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
    console.log(`warehouse map current (${catalog.tables.length} tables)`);
  } else {
    console.error("usage: node scripts/warehouse-map.js write|sql|check");
    process.exit(2);
  }
}

module.exports = { check, sql, tableFile, readme, migrationTables };
