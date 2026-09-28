"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isMissingColumnError, ledgerUnavailable } = require("../src/services/schemaCapabilities");

test("schema capability errors classify PostgREST and Postgres missing columns", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "missing" }), true);
  assert.equal(isMissingColumnError({ code: "42703", message: "column does not exist" }), true);
  assert.equal(isMissingColumnError({ code: "PGRST116", message: "row not found" }), false);
});

test("Ledger degradation is a stable client-safe contract", () => {
  assert.deepEqual(ledgerUnavailable({ contractVersion: "moves-history.v2" }), {
    contract_version: "moves-history.v2-error.v1",
    error: "Ledger temporarily unavailable",
    code: "ledger_schema_capability_missing",
    capability: "ledger_history",
    operation: "history",
    message: "Omen cannot read this Ledger history until its storage contract is available.",
    action: "try_again_later",
  });
});
