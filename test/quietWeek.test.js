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

test("quiet-week composes honest copy per variant, never fabricating specifics", () => {
  const { quietWeek } = require("../src/services/quietWeek");
  const body = { state: "empty", platform: { status: "connected" }, quiet_inputs: { injured_starter: false }, signals: { roster: { status: "live" } } };

  const neutral = quietWeek(body, "W");
  assert.equal(neutral.headline, "Nothing worth waking you for.");
  assert.match(neutral.body, /roster is set/);
  assert.equal(neutral.next_read, "Next read · Tuesday 3:00 AM waivers");

  const straight = quietWeek(body, "L");
  assert.equal(straight.headline, "Nothing worth moving for.");
  assert.match(straight.body, /didn't go your way/);
  assert.equal(straight.next_read, "Next read · Tuesday 3:00 AM waivers");

  const ineligible = quietWeek({ ...body, state: "success" }, "W");
  assert.equal(ineligible.headline, null);
  assert.equal(ineligible.body, null);
  assert.equal(ineligible.next_read, null);
});
