"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildWaiverAnalysis } = require("../src/services/waiverAnalysis");
const { fromSleeper, undetermined } = require("../src/services/waiverSystem");

const FAAB = fromSleeper({
  league: { settings: { waiver_type: 2, waiver_budget: 100 } },
  roster: { settings: { waiver_budget_used: 20 } },
});
const P = (k, n, pos, pts) => ({ player_key: k, full_name: n, eligible_positions: [pos], projected_points: pts });
const base = { platform: "sleeper", leagueId: "L1", week: 3, season: 2026, availabilityConfirmed: true };

const CASES = {
  off_season: { ...base, waiverSystem: FAAB, offSeason: true },
  engine_limitation_pool: { ...base, waiverSystem: FAAB, pool: null, roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
  engine_limitation_roster: { ...base, waiverSystem: FAAB, pool: [], roster: { slots: { starters: [], bench: [] } } },
  no_credible_move: { ...base, waiverSystem: FAAB, pool: [P("p", "B", "RB", 1)], roster: { slots: { starters: [P("s", "A", "RB", 9)], bench: [] } } },
  confirmed_opportunity: { ...base, waiverSystem: FAAB, pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [P("b", "C", "RB", 2)] } } },
};

test("every envelope state carries waiver_system — a client never has to test for the key", () => {
  for (const [name, input] of Object.entries(CASES)) {
    const out = buildWaiverAnalysis(input);
    assert.ok(out.waiver_system, `${name} dropped waiver_system`);
    assert.equal(out.waiver_system.system, "faab", `${name} lost the system`);
  }
});

test("a bid is only ever emitted alongside a best_move", () => {
  for (const [name, input] of Object.entries(CASES)) {
    const out = buildWaiverAnalysis(input);
    if (!out.best_move) continue;
    assert.equal(name, "confirmed_opportunity", `${name} produced a best_move unexpectedly`);
    assert.ok(out.best_move.bid, "confirmed FAAB opportunity should carry a bid");
    assert.equal(out.best_move.bid.implies_claim_success, false);
    assert.ok(out.best_move.bid.basis, "a bid must always state its basis");
  }
});

test("an undetermined league emits neither FAAB nor priority in any state", () => {
  for (const input of Object.values(CASES)) {
    const out = buildWaiverAnalysis({ ...input, waiverSystem: undetermined("no probe") });
    assert.equal(out.waiver_system.system, "not_determined");
    assert.equal(out.waiver_system.budget_total, null);
    assert.equal(out.waiver_system.budget_remaining, null);
    assert.equal(out.waiver_system.priority_position, null);
    assert.equal(out.best_move?.bid ?? null, null, "an unverified league must never get a bid");
  }
});

test("waiver_system is null-safe when no model is supplied at all", () => {
  const out = buildWaiverAnalysis({ ...CASES.confirmed_opportunity, waiverSystem: null });
  assert.equal(out.waiver_system, null);
  assert.equal(out.best_move.bid, null);
});

// Composed display text: the native League screen renders a budget or claim order ONLY from these two
// fields, and treats a league without them as "not determined". Before they existed every FAAB and
// priority league rendered as undetermined (S0 contract probe, 2026-09-30).
test("waiver_system carries composed budget_text / order_text, and only when every number is known", () => {
  const out = buildWaiverAnalysis({ ...CASES.confirmed_opportunity });
  assert.equal(out.waiver_system.budget_text, "Your budget $80 of $100");
  assert.equal(out.waiver_system.order_text, null, "a FAAB league has no claim order (decoy field dropped)");

  const unreadBalance = buildWaiverAnalysis({
    ...CASES.confirmed_opportunity,
    waiverSystem: fromSleeper({ league: { settings: { waiver_type: 2, waiver_budget: 100 } }, roster: { settings: {} } }),
  });
  assert.equal(unreadBalance.waiver_system.budget_remaining, null);
  assert.equal(unreadBalance.waiver_system.budget_text, null, "an unread balance must not become \"$0 of $100\"");

  const priority = buildWaiverAnalysis({
    ...CASES.confirmed_opportunity,
    waiverSystem: fromSleeper({ league: { settings: { waiver_type: 0 } }, roster: { settings: { waiver_position: 7 } } }),
  });
  assert.equal(priority.waiver_system.order_text, "Claim order 7");
  assert.equal(priority.waiver_system.budget_text, null);

  const unknown = buildWaiverAnalysis({ ...CASES.confirmed_opportunity, waiverSystem: undetermined("no probe") });
  assert.equal(unknown.waiver_system.budget_text, null);
  assert.equal(unknown.waiver_system.order_text, null);
});
