"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SYSTEMS,
  fromSleeper,
  mayShowFaab,
  mayShowPriority,
  mayShowClaimProbability,
} = require("../src/services/waiverSystem");

// Fixtures are the real shapes observed 2026-09-05 against the founder's
// leagues. Both carry EVERY waiver field regardless of system — that is the
// point of the module and the point of these tests.

// EB FOOTBALL (1311998161723600896) — waiver_type 2, FAAB, founder-confirmed.
// Note waiver_position IS present on the roster: the decoy.
const FAAB_LEAGUE = {
  name: "EB FOOTBALL",
  settings: { waiver_type: 2, waiver_budget: 100, waiver_bid_min: 0, waiver_day_of_week: 2 },
};
const FAAB_ROSTER = { roster_id: 1, settings: { waiver_budget_used: 17, waiver_position: 4 } };

// Omen App Data (1387633793615036416) — waiver_type 0, priority.
// Note waiver_budget: 100 IS present on the league: the other decoy.
const PRIORITY_LEAGUE = {
  name: "Omen App Data",
  settings: { waiver_type: 0, waiver_budget: 100, waiver_bid_min: 0, waiver_day_of_week: 2 },
};
const PRIORITY_ROSTER = { roster_id: 3, settings: { waiver_budget_used: 0, waiver_position: 5 } };

test("FAAB league is identified and reports budget and remaining", () => {
  const m = fromSleeper({ league: FAAB_LEAGUE, roster: FAAB_ROSTER });
  assert.equal(m.system, SYSTEMS.FAAB);
  assert.equal(m.budget_total, 100);
  assert.equal(m.budget_remaining, 83); // 100 - 17, derived not assumed
  assert.equal(mayShowFaab(m), true);
});

test("FAAB league NEVER reports a priority position, though Sleeper supplies one", () => {
  const m = fromSleeper({ league: FAAB_LEAGUE, roster: FAAB_ROSTER });
  // The roster genuinely carries waiver_position: 4. Showing it would be wrong.
  assert.equal(FAAB_ROSTER.settings.waiver_position, 4);
  assert.equal(m.priority_position, null);
  assert.equal(mayShowPriority(m), false);
});

test("priority league is identified and reports its position", () => {
  const m = fromSleeper({ league: PRIORITY_LEAGUE, roster: PRIORITY_ROSTER });
  assert.equal(m.system, SYSTEMS.PRIORITY);
  assert.equal(m.priority_position, 5);
  assert.equal(mayShowPriority(m), true);
});

test("priority league NEVER reports a FAAB budget, though Sleeper supplies one", () => {
  const m = fromSleeper({ league: PRIORITY_LEAGUE, roster: PRIORITY_ROSTER });
  // The league genuinely carries waiver_budget: 100. This is the intent's
  // stated failure: a FAAB number in a non-FAAB league is worse than silence.
  assert.equal(PRIORITY_LEAGUE.settings.waiver_budget, 100);
  assert.equal(m.budget_total, null);
  assert.equal(m.budget_remaining, null);
  assert.equal(mayShowFaab(m), false);
});

test("waiver_type 1 is priority (241 real 2025 txns, zero bids)", () => {
  const m = fromSleeper({
    league: { settings: { waiver_type: 1, waiver_budget: 100 } },
    roster: { settings: { waiver_position: 2 } },
  });
  assert.equal(m.system, SYSTEMS.PRIORITY);
  assert.equal(m.budget_total, null);
});

test("unrecognized waiver_type is not_determined, never the nearest guess", () => {
  const m = fromSleeper({
    league: { settings: { waiver_type: 99, waiver_budget: 100 } },
    roster: { settings: { waiver_position: 1, waiver_budget_used: 5 } },
  });
  assert.equal(m.system, SYSTEMS.NOT_DETERMINED);
  assert.equal(m.budget_total, null);
  assert.equal(m.priority_position, null);
  assert.equal(mayShowFaab(m), false);
  assert.equal(mayShowPriority(m), false);
});

test("absent settings or waiver_type is not_determined", () => {
  assert.equal(fromSleeper({}).system, SYSTEMS.NOT_DETERMINED);
  assert.equal(fromSleeper({ league: {} }).system, SYSTEMS.NOT_DETERMINED);
  assert.equal(
    fromSleeper({ league: { settings: { waiver_budget: 100 } } }).system,
    SYSTEMS.NOT_DETERMINED,
  );
});

test("missing budget_used leaves remaining unknown, never zero", () => {
  const m = fromSleeper({ league: FAAB_LEAGUE, roster: { settings: {} } });
  assert.equal(m.system, SYSTEMS.FAAB);
  assert.equal(m.budget_total, 100);
  assert.equal(m.budget_remaining, null); // not 0 — "cannot bid" is a different claim
});

test("claim probability stays forbidden for every league in v1", () => {
  assert.equal(mayShowClaimProbability(fromSleeper({ league: FAAB_LEAGUE, roster: FAAB_ROSTER })), false);
  assert.equal(mayShowClaimProbability(fromSleeper({ league: PRIORITY_LEAGUE, roster: PRIORITY_ROSTER })), false);
});

test("same league, different season, different system — never cache across years", () => {
  // EB FOOTBALL really did run waiver_type 1 in 2025 and 2 in 2026.
  const y2025 = fromSleeper({
    league: { settings: { waiver_type: 1, waiver_budget: 100 } },
    roster: { settings: { waiver_position: 4 } },
  });
  const y2026 = fromSleeper({ league: FAAB_LEAGUE, roster: FAAB_ROSTER });
  assert.equal(y2025.system, SYSTEMS.PRIORITY);
  assert.equal(y2026.system, SYSTEMS.FAAB);
});
