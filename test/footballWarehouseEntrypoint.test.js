"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("requiring the manual entrypoint has no process or scheduling side effects", () => {
  const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
  const entry = require("../src/omen_football_warehouse_current_season");
  assert.equal(typeof entry.main, "function");
  assert.deepEqual([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")], before);
  for (const file of ["Dockerfile.cron", "docker-compose.yml", "package.json"]) {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.equal(text.includes("omen_football_warehouse_current_season"), false, file);
  }
});
