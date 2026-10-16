"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { check, migrationTables } = require("../scripts/warehouse-map.js");

test("every warehouse table has a map entry, and the generated map files are current", () => {
  assert.deepEqual(check(), []);
});

test("the map migration covers every mapped table and is pinned by its apply script", () => {
  const root = path.resolve(__dirname, "..");
  const migration = fs.readFileSync(path.join(root, "warehouse/migrations/0007_warehouse_map.sql"), "utf8");
  // Map rows are written by 0007 and by every later migration that adds a table.
  const mapWriters = fs.readdirSync(path.join(root, "warehouse/migrations")).filter((f) => f.endsWith(".sql"))
    .map((f) => fs.readFileSync(path.join(root, "warehouse/migrations", f), "utf8")).filter((t) => t.includes("football.warehouse_map (name")).join("\n");
  for (const name of migrationTables()) assert.match(mapWriters, new RegExp(`'${name}'`), `no migration writes a map row for ${name}`);
  const sum = require("node:crypto").createHash("sha256").update(migration).digest("hex");
  const apply = fs.readFileSync(path.join(root, "warehouse/migrations/0008_apply_warehouse_map.sh"), "utf8");
  assert.match(apply, new RegExp(`expected_checksum="${sum}"`));
  assert.match(apply, /values \(4, '0007_warehouse_map'/);
});
