"use strict";

// Schema drift is an operational capability failure, not a generic 500. Keep
// the classification small and deterministic so routes can degrade without
// leaking provider/database details to clients.
function isMissingColumnError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return code === "PGRST204"
    || code === "42703"
    || /column .* does not exist/.test(message)
    || /could not find the .* column/.test(message);
}

function ledgerUnavailable({ contractVersion = "moves-history.v2", operation = "history" } = {}) {
  return {
    contract_version: `${contractVersion}-error.v1`,
    error: "Ledger temporarily unavailable",
    code: "ledger_schema_capability_missing",
    capability: "ledger_history",
    operation,
    message: "Omen cannot read this Ledger history until its storage contract is available.",
    action: "try_again_later",
  };
}

// This is deliberately a small, application-owned manifest. It is not a
// migration and it does not inspect production by itself. A deployment or a
// local readiness check can feed it a sanitized table/column inventory and
// fail closed before a route advertises a capability that its schema cannot
// serve.
const SCHEMA_CAPABILITY_MANIFEST = Object.freeze({
  ledger_history: Object.freeze({
    table: "moves",
    required_columns: Object.freeze([
      "id", "user_id", "week_num", "season", "move_type", "headline",
      "reasoning", "confidence", "target_player", "followed", "user_stars",
      "user_note", "outcome", "eff", "created_at", "scored_at", "platform",
      "league_id", "scoring", "scoring_contract_version", "scoring_coverage_state",
      "reconciliation_state",
    ]),
    contract_version: "moves-history.v2",
  }),
  provider_connection: Object.freeze({
    table: "platform_connections",
    required_columns: Object.freeze([
      "user_id", "platform", "league_id", "is_active", "is_selected",
    ]),
    contract_version: "provider-connection.v2",
  }),
});

function normalizeInventory(inventory = {}) {
  const source = inventory.tables || inventory;
  return Object.fromEntries(Object.entries(source || {}).map(([table, columns]) => [
    table,
    new Set(Array.isArray(columns) ? columns : Object.keys(columns || {})),
  ]));
}

function assessSchemaCapabilities(inventory = {}, manifest = SCHEMA_CAPABILITY_MANIFEST) {
  const tables = normalizeInventory(inventory);
  const capabilities = Object.fromEntries(Object.entries(manifest).map(([name, spec]) => {
    const available = tables[spec.table] || new Set();
    const missing = spec.required_columns.filter((column) => !available.has(column));
    return [name, {
      capability: name,
      table: spec.table,
      contract_version: spec.contract_version,
      state: missing.length ? "unavailable" : "available",
      missing_columns: missing,
    }];
  }));
  return {
    schema: "omen-schema-capability-readiness.v1",
    ready: Object.values(capabilities).every((entry) => entry.state === "available"),
    capabilities,
  };
}

module.exports = {
  isMissingColumnError,
  ledgerUnavailable,
  SCHEMA_CAPABILITY_MANIFEST,
  assessSchemaCapabilities,
};
