"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { getOmenOfTheWeekMock } = require("../src/services/systemContracts");

function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return /\.(js|mjs|cjs)$/.test(entry.name) ? [full] : [];
  });
}

test("the Omen-of-the-week mock fixture is explicitly labeled mock", () => {
  const mock = getOmenOfTheWeekMock(new Date("2026-01-01T00:00:00Z"));
  assert.equal(mock.is_mock, true);
  assert.equal(mock.mode, "mock");
  assert.equal(mock.status, "mock_ready");
  assert.match(mock.contract_version, /mock/);
});

test("the mock fixture is not reachable from any runtime source file", () => {
  const srcDir = path.join(__dirname, "..", "src");
  const definition = path.join(srcDir, "services", "systemContracts.js");
  const referencing = listJsFiles(srcDir)
    .filter((file) => file !== definition)
    .filter((file) => fs.readFileSync(file, "utf8").includes("getOmenOfTheWeekMock"));
  assert.deepEqual(
    referencing,
    [],
    "getOmenOfTheWeekMock must not be wired into production code; gate it behind a mock flag and add a route test first",
  );
});
