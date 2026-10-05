"use strict";

const DEFAULT_STATEMENT_TIMEOUT_MS = 60_000;
const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 300_000;
const FAILURE_STATEMENT_TIMEOUT_MS = 5_000;
const FAILURE_LOCK_TIMEOUT_MS = 1_000;

function timeout(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_TIMEOUT_MS) {
    throw new TypeError(`${name} must be an integer from 1 through ${MAX_TIMEOUT_MS}`);
  }
  return value;
}

function validateTransactionTimeouts({
  statementTimeoutMs = DEFAULT_STATEMENT_TIMEOUT_MS,
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
} = {}) {
  const statement = timeout(statementTimeoutMs, "statementTimeoutMs");
  const lock = timeout(lockTimeoutMs, "lockTimeoutMs");
  if (lock > statement) throw new RangeError("lockTimeoutMs cannot exceed statementTimeoutMs");
  return { statementTimeoutMs: statement, lockTimeoutMs: lock };
}

async function setLocalTransactionTimeouts(client, options) {
  if (!client || typeof client.query !== "function") throw new TypeError("client.query must be a function");
  const configured = validateTransactionTimeouts(options);
  await client.query({
    name: "warehouse-local-transaction-timeouts-v1",
    text: `SELECT set_config('statement_timeout', $1, true),
                  set_config('lock_timeout', $2, true)`,
    values: [`${configured.statementTimeoutMs}ms`, `${configured.lockTimeoutMs}ms`],
  });
  return configured;
}

async function runBoundedFailureReceipt(client, writeReceipt) {
  if (!client || typeof client.query !== "function") throw new TypeError("client.query must be a function");
  if (typeof writeReceipt !== "function") throw new TypeError("writeReceipt must be a function");
  try {
    await client.query("BEGIN");
    await setLocalTransactionTimeouts(client, {
      statementTimeoutMs: FAILURE_STATEMENT_TIMEOUT_MS,
      lockTimeoutMs: FAILURE_LOCK_TIMEOUT_MS,
    });
    await writeReceipt();
    await client.query("COMMIT");
    return true;
  } catch {
    try { await client.query("ROLLBACK"); } catch {}
    return false;
  }
}

module.exports = {
  DEFAULT_STATEMENT_TIMEOUT_MS,
  DEFAULT_LOCK_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  validateTransactionTimeouts,
  setLocalTransactionTimeouts,
  runBoundedFailureReceipt,
};
