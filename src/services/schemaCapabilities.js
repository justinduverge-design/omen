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

module.exports = { isMissingColumnError, ledgerUnavailable };
