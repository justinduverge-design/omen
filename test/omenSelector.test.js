"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DECISION_TYPES,
  TIE_BREAK_ORDER,
  REJECTION,
  evaluateEligibility,
  selectDecision,
} = require("../src/services/omenSelector");

/** A candidate with every eligibility precondition satisfied. */
function liveCandidate(overrides = {}) {
  return {
    id: "cand_1",
    type: "start_sit",
    decisionScore: 4,
    requiredSignalsLive: true,
    contextVerified: true,
    inputKinds: ["live"],
    ...overrides,
  };
}

test("declares all three canonical decision types", () => {
  assert.deepEqual(DECISION_TYPES, ["start_sit", "waiver_pickup", "trade_suggestion"]);
});

test("tie-break order is documented and covers every decision type", () => {
  assert.deepEqual(TIE_BREAK_ORDER, ["start_sit", "waiver_pickup", "trade_suggestion"]);
  for (const type of DECISION_TYPES) {
    assert.ok(TIE_BREAK_ORDER.includes(type), `${type} has no documented tie-break position`);
  }
});

// --- Step 4: rejection of non-live inputs -----------------------------------

test("rejects a candidate whose required signal is not live", () => {
  const verdict = evaluateEligibility(liveCandidate({ requiredSignalsLive: false }));
  assert.equal(verdict.eligible, false);
  assert.equal(verdict.reason, REJECTION.SIGNAL_NOT_LIVE);
});

test("rejects mock, stub, stale, fixture, and sample inputs", () => {
  for (const kind of ["mock", "stub", "stale", "fixture", "sample"]) {
    const verdict = evaluateEligibility(liveCandidate({ inputKinds: ["live", kind] }));
    assert.equal(verdict.eligible, false, `${kind} input was accepted`);
    assert.equal(verdict.reason, REJECTION.NON_LIVE_INPUT);
  }
});

test("rejects a cross-context candidate", () => {
  const verdict = evaluateEligibility(liveCandidate({ contextVerified: false }));
  assert.equal(verdict.eligible, false);
  assert.equal(verdict.reason, REJECTION.CONTEXT_MISMATCH);
});

test("rejects a type with no provider capability, preserving its reason", () => {
  const verdict = evaluateEligibility({
    type: "trade_suggestion",
    available: false,
    reason: REJECTION.NO_PROVIDER_CAPABILITY,
  });
  assert.equal(verdict.eligible, false);
  assert.equal(verdict.reason, REJECTION.NO_PROVIDER_CAPABILITY);
});

test("treats a null decision_score as unknown, not zero", () => {
  // Number(null) is 0 and finite. A Number.isFinite guard alone would admit
  // every unscored candidate — the same null-vs-zero trap as the S0 fix.
  const verdict = evaluateEligibility(liveCandidate({ decisionScore: null }));
  assert.equal(verdict.eligible, false);
  assert.equal(verdict.reason, REJECTION.SCORE_NOT_FINITE);
});

test("rejects a non-numeric decision_score", () => {
  for (const score of ["banana", undefined, NaN, {}]) {
    const verdict = evaluateEligibility(liveCandidate({ decisionScore: score }));
    assert.equal(verdict.eligible, false, `score ${String(score)} was accepted`);
  }
});

test("rejects a zero or negative edge rather than filling the screen", () => {
  for (const score of [0, -0.5, -12]) {
    const verdict = evaluateEligibility(liveCandidate({ decisionScore: score }));
    assert.equal(verdict.eligible, false, `score ${score} was accepted`);
    assert.equal(verdict.reason, REJECTION.NO_EDGE);
  }
});

test("accepts a fully live candidate with a positive edge", () => {
  assert.deepEqual(evaluateEligibility(liveCandidate()), { eligible: true, reason: null });
});

// --- Step 5: deterministic ranking ------------------------------------------

test("chooses the highest decision_score regardless of type", () => {
  const waiver = liveCandidate({ id: "w", type: "waiver_pickup", decisionScore: 11.4 });
  const startSit = liveCandidate({ id: "s", type: "start_sit", decisionScore: 2.1 });

  const result = selectDecision([startSit, waiver]);
  assert.equal(result.selected.type, "waiver_pickup");
  assert.deepEqual(result.ranked.map((c) => c.type), ["waiver_pickup", "start_sit"]);
});

test("a lineup swap wins when it out-scores the waiver add", () => {
  const waiver = liveCandidate({ id: "w", type: "waiver_pickup", decisionScore: 3 });
  const startSit = liveCandidate({ id: "s", type: "start_sit", decisionScore: 9 });

  assert.equal(selectDecision([waiver, startSit]).selected.type, "start_sit");
});

test("selection does not depend on input order", () => {
  const a = liveCandidate({ id: "a", type: "start_sit", decisionScore: 5 });
  const b = liveCandidate({ id: "b", type: "waiver_pickup", decisionScore: 8 });

  const forward = selectDecision([a, b]).selected;
  const reverse = selectDecision([b, a]).selected;
  assert.equal(forward.id, reverse.id);
});

// --- Step 5: stable ties -----------------------------------------------------

test("equal scores break by documented type order, not input order", () => {
  const waiver = liveCandidate({ id: "w", type: "waiver_pickup", decisionScore: 6 });
  const startSit = liveCandidate({ id: "s", type: "start_sit", decisionScore: 6 });

  assert.equal(selectDecision([waiver, startSit]).selected.type, "start_sit");
  assert.equal(selectDecision([startSit, waiver]).selected.type, "start_sit");
});

test("equal scores and equal types break by stable id", () => {
  const second = liveCandidate({ id: "zeta", decisionScore: 6 });
  const first = liveCandidate({ id: "alpha", decisionScore: 6 });

  assert.equal(selectDecision([second, first]).selected.id, "alpha");
  assert.equal(selectDecision([first, second]).selected.id, "alpha");
});

test("ranking is repeatable across many shuffles", () => {
  const candidates = [
    liveCandidate({ id: "a", type: "start_sit", decisionScore: 6 }),
    liveCandidate({ id: "b", type: "waiver_pickup", decisionScore: 6 }),
    liveCandidate({ id: "c", type: "waiver_pickup", decisionScore: 9 }),
    liveCandidate({ id: "d", type: "start_sit", decisionScore: 1 }),
  ];
  const expected = selectDecision(candidates).ranked.map((c) => c.id);

  for (let i = 0; i < 24; i += 1) {
    const shuffled = candidates.slice().reverse();
    shuffled.push(shuffled.shift());
    assert.deepEqual(selectDecision(shuffled).ranked.map((c) => c.id), expected);
  }
});

// --- Step 6: no fallback, no screen-filling ---------------------------------

test("returns no selection when every candidate is rejected", () => {
  const result = selectDecision([
    liveCandidate({ type: "start_sit", requiredSignalsLive: false }),
    liveCandidate({ type: "waiver_pickup", inputKinds: ["mock"] }),
    { type: "trade_suggestion", available: false },
  ]);

  assert.equal(result.selected, null);
  assert.deepEqual(result.ranked, []);
  assert.deepEqual(
    result.rejected.map((r) => r.reason),
    [REJECTION.SIGNAL_NOT_LIVE, REJECTION.NON_LIVE_INPUT, REJECTION.NO_PROVIDER_CAPABILITY]
  );
});

test("a rejected top scorer is never presented, even as a lower-ranked result", () => {
  // The highest-scoring candidate is missing a live signal. It must not appear
  // anywhere in the output — not selected, not ranked.
  const dead = liveCandidate({ id: "dead", type: "waiver_pickup", decisionScore: 99, requiredSignalsLive: false });
  const alive = liveCandidate({ id: "alive", type: "start_sit", decisionScore: 3 });

  const result = selectDecision([dead, alive]);
  assert.equal(result.selected.id, "alive");
  assert.ok(!result.ranked.some((c) => c.id === "dead"));
  assert.equal(result.rejected[0].reason, REJECTION.SIGNAL_NOT_LIVE);
});

test("an empty candidate list yields no advice rather than throwing", () => {
  const result = selectDecision([]);
  assert.equal(result.selected, null);
  assert.deepEqual(result.ranked, []);
  assert.deepEqual(result.rejected, []);
});

test("tolerates a malformed candidate list without throwing", () => {
  for (const input of [null, undefined, "nope", 42, {}]) {
    const result = selectDecision(input);
    assert.equal(result.selected, null);
  }
});

test("a null entry inside the list is rejected, not crashed on", () => {
  const result = selectDecision([null, liveCandidate({ id: "ok" })]);
  assert.equal(result.selected.id, "ok");
  assert.equal(result.rejected[0].reason, REJECTION.NO_CANDIDATE);
});

// --- Trade: declared but unavailable ----------------------------------------

test("trade_suggestion is declared as a type but never selectable without capability", () => {
  // Per the capability matrix, no provider exposes a normalized opponent-roster
  // trade surface. Trade must report unavailable rather than not existing.
  assert.ok(DECISION_TYPES.includes("trade_suggestion"));

  const result = selectDecision([
    { type: "trade_suggestion", available: false, reason: REJECTION.NO_PROVIDER_CAPABILITY },
  ]);
  assert.equal(result.selected, null);
  assert.equal(result.rejected[0].type, "trade_suggestion");
  assert.equal(result.rejected[0].reason, REJECTION.NO_PROVIDER_CAPABILITY);
});

test("an unknown decision type sorts last but does not break ranking", () => {
  const known = liveCandidate({ id: "k", type: "start_sit", decisionScore: 5 });
  const unknown = liveCandidate({ id: "u", type: "some_future_type", decisionScore: 5 });

  const result = selectDecision([unknown, known]);
  assert.equal(result.selected.type, "start_sit");
  assert.equal(result.ranked.length, 2);
});
