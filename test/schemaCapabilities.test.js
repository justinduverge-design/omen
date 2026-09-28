"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isMissingColumnError,
  ledgerUnavailable,
  SCHEMA_CAPABILITY_MANIFEST,
  assessSchemaCapabilities,
} = require("../src/services/schemaCapabilities");

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

test("schema readiness is deterministic and fail-closed for an incomplete inventory", () => {
  const result = assessSchemaCapabilities({
    tables: {
      moves: ["id", "user_id", "season"],
      platform_connections: ["user_id", "platform", "league_id", "is_active", "is_selected"],
    },
  });

  assert.equal(result.schema, "omen-schema-capability-readiness.v1");
  assert.equal(result.ready, false);
  assert.equal(result.capabilities.provider_connection.state, "available");
  assert.deepEqual(result.capabilities.ledger_history.missing_columns, [
    "week_num", "move_type", "headline", "reasoning", "confidence", "target_player",
    "followed", "user_stars", "user_note", "outcome", "eff", "created_at", "scored_at",
    "platform", "league_id", "scoring", "scoring_contract_version", "scoring_coverage_state",
    "reconciliation_state",
  ]);
  assert.deepEqual(result, assessSchemaCapabilities({
    tables: {
      moves: ["id", "user_id", "season"],
      platform_connections: ["user_id", "platform", "league_id", "is_active", "is_selected"],
    },
  }));
});

test("schema readiness accepts a sanitized object inventory without exposing values", () => {
  const inventory = Object.fromEntries(Object.entries(SCHEMA_CAPABILITY_MANIFEST).map(([, spec]) => [
    spec.table,
    Object.fromEntries(spec.required_columns.map((column) => [column, { type: "unknown" }])),
  ]));
  const result = assessSchemaCapabilities(inventory);

  assert.equal(result.ready, true);
  assert.equal(result.capabilities.ledger_history.state, "available");
  assert.equal(result.capabilities.provider_connection.state, "available");
  assert.ok(!JSON.stringify(result).includes("unknown"));
});
