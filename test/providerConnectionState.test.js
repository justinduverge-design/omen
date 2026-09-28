"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyProviderError,
  transitionConnectionState,
} = require("../src/services/providerConnectionState");

test("401 and 403 require reconnect", () => {
  assert.deepEqual(classifyProviderError({ status: 401 }), {
    kind: "authentication", status: 401, state: "reconnect_required", retryable: false,
  });
  assert.equal(classifyProviderError({ response: { status: 403 } }).state, "reconnect_required");
});

test("400 remains an operation error and does not evict credentials", () => {
  const result = classifyProviderError({ status: 400 });
  assert.equal(result.kind, "operation");
  assert.equal(result.state, null);
  assert.equal(result.retryable, false);
});

test("timeouts, rate limits, and server failures are temporary", () => {
  for (const error of [{ status: 408 }, { status: 429 }, { status: 503 }, { code: "ETIMEDOUT" }]) {
    assert.equal(classifyProviderError(error).state, "temporarily_unavailable");
    assert.equal(classifyProviderError(error).retryable, true);
  }
});

test("stale provider response cannot quarantine a newer credential generation", () => {
  const current = { connection_state: "connected", credential_generation: 4 };
  const result = transitionConnectionState(current, {
    credential_generation: 3,
    error: { status: 401 },
  }, "2026-09-28T12:00:00.000Z");
  assert.equal(result.applied, false);
  assert.equal(result.reason, "stale_generation");
  assert.equal(result.current, current);
});

test("successful check clears temporary failures and records health", () => {
  const result = transitionConnectionState({
    connection_state: "temporarily_unavailable",
    credential_generation: 2,
    consecutive_failures: 3,
  }, { credential_generation: 2 }, "2026-09-28T12:00:00.000Z");
  assert.equal(result.applied, true);
  assert.equal(result.next.connection_state, "connected");
  assert.equal(result.next.consecutive_failures, 0);
  assert.equal(result.next.state_changed_at, "2026-09-28T12:00:00.000Z");
});

test("temporary failures increment the streak without changing credential generation", () => {
  const result = transitionConnectionState({
    connection_state: "connected",
    credential_generation: 7,
    consecutive_failures: 1,
  }, { credential_generation: 7, error: { status: 503 } }, "2026-09-28T12:00:00.000Z");
  assert.equal(result.next.connection_state, "temporarily_unavailable");
  assert.equal(result.next.consecutive_failures, 2);
  assert.equal(result.next.credential_generation, 7);
});
