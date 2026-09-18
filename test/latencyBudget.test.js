"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isLatencyBudgetExceeded,
  withinLatencyBudget,
} = require("../src/services/latencyBudget");

test("withinLatencyBudget aborts a slow operation and exposes a typed timeout", async () => {
  let aborted = false;

  await assert.rejects(
    withinLatencyBudget("test_source", 10, (signal) => new Promise((resolve) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        resolve();
      });
    })),
    (error) => isLatencyBudgetExceeded(error)
      && error.stage === "test_source"
      && error.timeout_ms === 10
  );

  assert.equal(aborted, true);
});

test("withinLatencyBudget preserves a fast operation's value", async () => {
  const value = await withinLatencyBudget("fast_source", 100, async () => "available");
  assert.equal(value, "available");
});
