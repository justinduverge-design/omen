"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("API warehouse reads are opt-in, read-role only, and attached to the private network", () => {
  const compose = read("docker-compose.yml");
  const warehouse = read("infra/warehouse/docker-compose.yml");
  const dockerfile = read("Dockerfile");
  assert.match(compose, /FOOTBALL_DATA_MODE: \$\{FOOTBALL_DATA_MODE:-supabase\}/);
  assert.match(compose, /FOOTBALL_WAREHOUSE_READ_DATABASE_URL_FILE: \/run\/secrets\/warehouse_reader_url/);
  assert.match(compose, /file: \/var\/lib\/omen\/secrets\/warehouse-reader-url/);
  assert.match(compose, /warehouse_net:[\s\S]*external: true/);
  assert.match(warehouse, /warehouse_net:[\s\S]*name: omen_warehouse_net[\s\S]*internal: true/);
  assert.match(compose, /target: warehouse_reader_url[\s\S]*uid: "10001"[\s\S]*mode: 0400/);
  assert.match(dockerfile, /adduser[^\n]*-u 10001/);
});

test("Start/Sit routes usage through the staged reader without moving team-system facts", () => {
  const route = read("src/routes/startSitDetail.js");
  assert.match(route, /usageReader\.read\(\{/);
  assert.match(route, /mode: warehouseUsageRuntime\.mode/);
  assert.match(route, /getTeamSystemSummaries\(\{ supabase/);
  assert.match(route, /closeWarehouseUsageRuntime/);
});
