"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateTransactionTimeouts,
  setLocalTransactionTimeouts,
  runBoundedFailureReceipt,
} = require("../src/services/footballWarehouse/transactionTimeouts");

test("validates bounded transaction-local statement and lock timeouts", () => {
  assert.deepEqual(validateTransactionTimeouts(), {
    statementTimeoutMs: 60_000,
    lockTimeoutMs: 5_000,
  });
  assert.deepEqual(validateTransactionTimeouts({ statementTimeoutMs: 2_000, lockTimeoutMs: 100 }), {
    statementTimeoutMs: 2_000,
    lockTimeoutMs: 100,
  });
  for (const options of [
    { statementTimeoutMs: 0 },
    { lockTimeoutMs: 0 },
    { statementTimeoutMs: 300_001 },
    { statementTimeoutMs: 100, lockTimeoutMs: 101 },
    { statementTimeoutMs: "1000" },
  ]) assert.throws(() => validateTransactionTimeouts(options));
});

test("records diagnostics in a separate bounded best-effort transaction", async () => {
  const calls = [];
  const client = { query: async (query) => { calls.push(query); return { rows: [] }; } };
  assert.equal(await runBoundedFailureReceipt(client, () => client.query({ name: "receipt" })), true);
  assert.deepEqual(calls.map((call) => typeof call === "string" ? call : call.name), [
    "BEGIN", "warehouse-local-transaction-timeouts-v1", "receipt", "COMMIT",
  ]);
  assert.deepEqual(calls[1].values, ["5000ms", "1000ms"]);

  const failedCalls = [];
  const failed = { query: async (query) => {
    failedCalls.push(query);
    if (query?.name === "receipt") throw new Error("diagnostic failed");
    return { rows: [] };
  } };
  assert.equal(await runBoundedFailureReceipt(failed, () => failed.query({ name: "receipt" })), false);
  assert.equal(failedCalls.at(-1), "ROLLBACK");
});

test("uses parameterized set_config with transaction-local scope", async () => {
  const calls = [];
  const configured = await setLocalTransactionTimeouts({ query: async (query) => calls.push(query) }, {
    statementTimeoutMs: 2_000,
    lockTimeoutMs: 100,
  });
  assert.deepEqual(configured, { statementTimeoutMs: 2_000, lockTimeoutMs: 100 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "warehouse-local-transaction-timeouts-v1");
  assert.match(calls[0].text, /set_config\('statement_timeout', \$1, true\)/);
  assert.match(calls[0].text, /set_config\('lock_timeout', \$2, true\)/);
  assert.deepEqual(calls[0].values, ["2000ms", "100ms"]);
});
