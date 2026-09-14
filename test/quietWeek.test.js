"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
test("quiet-week voice requires positive healthy evidence and goes straight on loss, injury, failure or unknown", () => {
  const { quietWeek } = require("../src/services/quietWeek");
  const body = { state: "empty", platform: { status: "connected" }, quiet_inputs: { injured_starter: false }, signals: { roster: { status: "live" } } };
  assert.equal(quietWeek(body, "W").variant, "neutral");
  assert.equal(quietWeek(body, "L").variant, "straight");
  assert.equal(quietWeek(body, null).variant, "straight");
  assert.equal(quietWeek({ ...body, quiet_inputs: { injured_starter: true } }, "W").variant, "straight");
  assert.equal(quietWeek({ ...body, signals: { roster: { status: "unavailable" } } }, "W").variant, "straight");
  assert.equal(quietWeek({ ...body, state: "success" }, "W").variant, null);
  assert.equal(quietWeek({ ...body, platform: { status: "pre_draft" } }, "W").variant, null);
});
