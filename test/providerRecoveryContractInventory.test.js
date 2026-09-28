"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const inventoryPath = path.join(__dirname, "..", "Blueprints", "handoffs", "2026-09-28-provider-recovery-contract-inventory.md");

test("provider recovery inventory is source-backed and names the active contract seams", () => {
  const inventory = fs.readFileSync(inventoryPath, "utf8");
  for (const source of [
    "src/routes/platforms.js",
    "src/routes/leagues.js",
    "src/services/providerConnectionState.js",
    "test/platforms.test.js",
    "test/leaguesDirectoryRoute.test.js",
    "test/providerConnectionState.test.js",
  ]) {
    assert.match(inventory, new RegExp(source.replaceAll(".", "\\.")));
  }
  for (const literal of [
    "platform-provider-state.v1",
    "league-directory.v1",
    "reconnect_required",
    "temporarily_unavailable",
    "retryable_error",
    "needs_reauth",
  ]) {
    assert.match(inventory, new RegExp(literal));
  }
});
