"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  currentNeedFor,
  staleness,
  VALID_OUTCOME_SET,
  STALE_STATUS,
} = require("../src/services/tradeSavedQueue");

test("currentNeedFor derives the same {status, have, required} shape reasoning.user_receives.need already uses", () => {
  const need = currentNeedFor({
    position: "RB",
    rosterPositions: ["QB", "RB", "RB", "WR", "WR", "BN"],
    players: [
      { position: "RB", selected_position: "RB" },
    ],
  });
  assert.equal(need.status, "hole");
  assert.equal(need.have, 1);
  assert.equal(need.required, 2);
});

test("currentNeedFor reports not_tracked for a position the league doesn't start, never guessing a status", () => {
  const need = currentNeedFor({
    position: "K",
    rosterPositions: ["QB", "RB", "WR"],
    players: [],
  });
  assert.equal(need.status, "not_tracked");
  assert.equal(need.required, null);
});

test("currentNeedFor returns null without a position, rather than a fabricated profile", () => {
  assert.equal(currentNeedFor({ rosterPositions: [], players: [] }), null);
});

test("staleness is unknown, never fresh or stale by default, when either side is missing context", () => {
  assert.deepEqual(staleness({ savedNeed: null, liveNeed: { status: "hole", have: 1, required: 2 } }), {
    status: STALE_STATUS.UNKNOWN,
    reason: "insufficient_context_for_staleness_check",
  });
  assert.deepEqual(staleness({ savedNeed: { status: "hole", have: 1, required: 2 }, liveNeed: null }), {
    status: STALE_STATUS.UNKNOWN,
    reason: "insufficient_context_for_staleness_check",
  });
  assert.deepEqual(staleness({}), {
    status: STALE_STATUS.UNKNOWN,
    reason: "insufficient_context_for_staleness_check",
  });
});

test("staleness flags a flipped need status as stale with a named reason", () => {
  const result = staleness({
    savedNeed: { status: "hole", have: 1, required: 2 },
    liveNeed: { status: "balanced", have: 2, required: 2 },
  });
  assert.deepEqual(result, { status: STALE_STATUS.STALE, reason: "needs_profile_changed" });
});

test("staleness flags an unchanged status but shifted depth as stale with a different named reason", () => {
  const result = staleness({
    savedNeed: { status: "hole", have: 1, required: 3 },
    liveNeed: { status: "hole", have: 2, required: 3 },
  });
  assert.deepEqual(result, { status: STALE_STATUS.STALE, reason: "roster_depth_changed" });
});

test("staleness reports fresh only when both status and depth snapshot are unchanged", () => {
  const result = staleness({
    savedNeed: { status: "hole", have: 1, required: 2 },
    liveNeed: { status: "hole", have: 1, required: 2 },
  });
  assert.deepEqual(result, { status: STALE_STATUS.FRESH, reason: null });
});

test("VALID_OUTCOME_SET is exactly the three self-report values — never a fourth, never inferred", () => {
  assert.deepEqual([...VALID_OUTCOME_SET].sort(), ["accepted", "countered", "rejected"]);
});
