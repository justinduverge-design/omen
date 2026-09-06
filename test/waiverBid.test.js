"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { recommendBid, SEASON_DEFINING_POINTS } = require("../src/services/waiverBid");
const { fromSleeper, SYSTEMS } = require("../src/services/waiverSystem");

const FAAB = fromSleeper({
  league: { settings: { waiver_type: 2, waiver_budget: 100 } },
  roster: { settings: { waiver_budget_used: 0, waiver_position: 4 } },
});
const PRIORITY = fromSleeper({
  league: { settings: { waiver_type: 0, waiver_budget: 100 } },
  roster: { settings: { waiver_position: 7 } },
});

test("no bid is ever produced for a priority league", () => {
  assert.equal(PRIORITY.system, SYSTEMS.PRIORITY);
  assert.equal(recommendBid({ waiverSystem: PRIORITY, improvement: 5, week: 1 }), null);
});

test("no bid for a not_determined league", () => {
  const unknown = fromSleeper({ league: { settings: { waiver_type: 99, waiver_budget: 100 } } });
  assert.equal(recommendBid({ waiverSystem: unknown, improvement: 5, week: 1 }), null);
});

test("a FAAB league with full inputs gets a bid that states its basis", () => {
  const bid = recommendBid({ waiverSystem: FAAB, improvement: 2, week: 1 });
  assert.ok(bid);
  assert.ok(bid.amount > 0 && bid.amount <= 100);
  assert.match(bid.basis, /remaining \$100/);
  assert.equal(bid.implies_claim_success, false);
});

test("bid never exceeds remaining budget", () => {
  // Huge improvement, late season: share caps at 1.0.
  const bid = recommendBid({ waiverSystem: FAAB, improvement: 99, week: 2 });
  assert.equal(bid.amount, 100);
});

test("a season-defining add commits the full remaining budget", () => {
  // improvement * weeksRemaining == SEASON_DEFINING_POINTS exactly, at week 18 (1 week left).
  const bid = recommendBid({ waiverSystem: FAAB, improvement: SEASON_DEFINING_POINTS, week: 18 });
  assert.equal(bid.amount, 100);
});

test("missing improvement yields no bid, never zero", () => {
  assert.equal(recommendBid({ waiverSystem: FAAB, improvement: null, week: 1 }), null);
  assert.equal(recommendBid({ waiverSystem: FAAB, improvement: 0, week: 1 }), null);
});

test("missing week yields no bid — weeks remaining is required", () => {
  assert.equal(recommendBid({ waiverSystem: FAAB, improvement: 5, week: null }), null);
});

test("exhausted budget yields no bid rather than a zero bid", () => {
  const spent = fromSleeper({
    league: { settings: { waiver_type: 2, waiver_budget: 100 } },
    roster: { settings: { waiver_budget_used: 100 } },
  });
  assert.equal(spent.budget_remaining, 0);
  assert.equal(recommendBid({ waiverSystem: spent, improvement: 5, week: 3 }), null);
});

test("a tiny improvement still respects the league's minimum bid", () => {
  const bid = recommendBid({ waiverSystem: FAAB, improvement: 0.01, week: 18, minBid: 3 });
  assert.equal(bid.amount, 3);
});

test("past the final regular week there is no bid", () => {
  assert.equal(recommendBid({ waiverSystem: FAAB, improvement: 5, week: 19 }), null);
});

test("a routine Week 1 upgrade does NOT recommend the entire budget", () => {
  // Regression: valuing the edge across all 18 remaining weeks made a 5 pts/wk
  // Week 1 add recommend $100 of $100. The horizon cap is what prevents it.
  const bid = recommendBid({ waiverSystem: FAAB, improvement: 5, week: 1 });
  assert.ok(bid.amount < 100, `expected a partial bid, got $${bid.amount}`);
  assert.match(bid.basis, /over the next 4 weeks/);
});
