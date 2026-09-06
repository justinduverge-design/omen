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

// --- ESPN: provisional mapping, must fail closed ---------------------------

const { fromEspn } = require("../src/services/waiverSystem");

test("ESPN with no acquisition settings is not_determined", () => {
  assert.equal(fromEspn({}).system, SYSTEMS.NOT_DETERMINED);
  assert.equal(fromEspn({ settings: {} }).system, SYSTEMS.NOT_DETERMINED);
});

test("ESPN with an UNRECOGNIZED shape fails closed rather than guessing", () => {
  // A payload that exists but is shaped differently must not be coerced. This
  // is the whole safety property while the mapping is unverified.
  const m = fromEspn({
    settings: { acquisitionSettings: { acquisitionBudget: 100, someOtherFlag: "yes" } },
    team: { waiverRank: 2 },
  });
  assert.equal(m.system, SYSTEMS.NOT_DETERMINED);
  assert.equal(m.budget_total, null);
  assert.equal(m.priority_position, null);
});

test("ESPN budget flag must be a real boolean, not truthy", () => {
  const m = fromEspn({ settings: { acquisitionSettings: { isUsingAcquisitionBudget: 1 } } });
  assert.equal(m.system, SYSTEMS.NOT_DETERMINED);
});

// Fixtures below are REAL payloads captured 2026-09-05 from the founder's three
// ESPN leagues via an authenticated session — not hand-built from what the
// parser expects. See the yahoo.js note on why that distinction matters.

test("ESPN: verified FAAB league (Slops Saloon, WAIVERS_CONTINUOUS)", () => {
  const m = fromEspn({
    settings: { acquisitionSettings: { acquisitionType: "WAIVERS_CONTINUOUS", isUsingAcquisitionBudget: true, acquisitionBudget: 100, minimumBid: 0 } },
    team: { waiverRank: 4, transactionCounter: { acquisitionBudgetSpent: 0 } },
  });
  assert.equal(m.system, SYSTEMS.FAAB);
  assert.equal(m.budget_total, 100);
  assert.equal(m.budget_remaining, 100);
  assert.equal(m.bid_min, 0);
  assert.equal(m.priority_position, null, "waiverRank 4 is a decoy on a FAAB league");
});

test("ESPN: acquisitionType is NOT the discriminator", () => {
  // Both real leagues below are WAIVERS_TRADITIONAL. One is FAAB and one is
  // not. Mapping on the type string gets the second exactly wrong.
  const faab = fromEspn({
    settings: { acquisitionSettings: { acquisitionType: "WAIVERS_TRADITIONAL", isUsingAcquisitionBudget: true, acquisitionBudget: 100, minimumBid: 0 } },
    team: { waiverRank: 12, transactionCounter: { acquisitionBudgetSpent: 0 } },
  });
  const priority = fromEspn({
    settings: { acquisitionSettings: { acquisitionType: "WAIVERS_TRADITIONAL", isUsingAcquisitionBudget: false, acquisitionBudget: 100, minimumBid: 1 } },
    team: { waiverRank: 5, transactionCounter: { acquisitionBudgetSpent: 0 } },
  });
  assert.equal(faab.system, SYSTEMS.FAAB);
  assert.equal(priority.system, SYSTEMS.PRIORITY);
});

test("ESPN: a non-FAAB league never shows the budget ESPN still sends", () => {
  // acquisitionBudget: 100 is genuinely present on this priority league.
  const m = fromEspn({
    settings: { acquisitionSettings: { acquisitionType: "WAIVERS_TRADITIONAL", isUsingAcquisitionBudget: false, acquisitionBudget: 100, minimumBid: 1 } },
    team: { waiverRank: 5 },
  });
  assert.equal(m.budget_total, null);
  assert.equal(m.budget_remaining, null);
  assert.equal(m.priority_position, 5);
});

test("ESPN FAAB derives remaining and never invents a total", () => {
  const m = fromEspn({
    settings: { acquisitionSettings: { isUsingAcquisitionBudget: true, acquisitionBudget: 100 } },
    team: { transactionCounter: { acquisitionBudgetSpent: 30 } },
  });
  assert.equal(m.system, SYSTEMS.FAAB);
  assert.equal(m.budget_remaining, 70);
  assert.equal(m.priority_position, null);

  const noTotal = fromEspn({
    settings: { acquisitionSettings: { isUsingAcquisitionBudget: true } },
    team: {},
  });
  assert.equal(noTotal.system, SYSTEMS.NOT_DETERMINED);
});

test("ESPN priority reports rank and never a budget", () => {
  const m = fromEspn({
    settings: { acquisitionSettings: { isUsingAcquisitionBudget: false, acquisitionBudget: 100 } },
    team: { waiverRank: 5 },
  });
  assert.equal(m.system, SYSTEMS.PRIORITY);
  assert.equal(m.priority_position, 5);
  assert.equal(m.budget_total, null);
});

// --- Yahoo: provisional, UNVERIFIABLE, must fail closed --------------------
//
// These tests assert ONLY that fromYahoo() fails closed. They deliberately do
// NOT claim any mapping is correct. No captured traffic exists for Yahoo's
// settings endpoint yet (the entitlement is live — nobody has read it), and
// src/services/yahoo.js records what happened the
// last time this repo trusted hand-built Yahoo fixtures: three parsers written
// against an assumed shape returned empty for every real flat-object endpoint,
// with unit tests passing throughout. A green test here is evidence of safety,
// never of correctness.

const { fromYahoo } = require("../src/services/waiverSystem");

// The REAL payload shape, captured 2026-09-06 from two bound leagues:
//   fantasy_content.league = [ {…34 metadata keys…}, { settings: [ {…} ] } ]
// The settings container is in the SECOND element and is itself wrapped in a
// one-element array. The first probe run returned not_determined purely because
// league[0] was passed — the fields were recognized all along.
const YAHOO_REAL = [
  { league_key: "470.l.1255365", name: "Yahoo H2H-Pts 1255365", num_teams: 10 },
  { settings: [{ waiver_type: "R", waiver_rule: "gametime", uses_faab: "0", waiver_time: "2" }] },
];
const YAHOO_REAL_TEAM = [{ team_key: "470.l.1255365.t.5" }, { waiver_priority: 5 }];

test("Yahoo: the real captured payload maps to priority", () => {
  const m = fromYahoo({ settings: YAHOO_REAL, team: YAHOO_REAL_TEAM });
  assert.equal(m.system, SYSTEMS.PRIORITY);
  assert.equal(m.priority_position, 5);
  assert.equal(m.budget_total, null);
  assert.equal(m.budget_remaining, null);
});

test("Yahoo: settings are found in league[1], not league[0]", () => {
  // Regression for the first probe failure. Handing over only the metadata
  // element must not silently succeed, and handing over the whole payload must.
  const metadataOnly = fromYahoo({ settings: [YAHOO_REAL[0]], team: YAHOO_REAL_TEAM });
  assert.equal(metadataOnly.system, SYSTEMS.NOT_DETERMINED);
  assert.equal(fromYahoo({ settings: YAHOO_REAL, team: YAHOO_REAL_TEAM }).system, SYSTEMS.PRIORITY);
});

test("Yahoo: an already-unwrapped container is still accepted", () => {
  const m = fromYahoo({
    settings: { waiver_type: "R", uses_faab: "0" },
    team: YAHOO_REAL_TEAM,
  });
  assert.equal(m.system, SYSTEMS.PRIORITY);
});

test("Yahoo with no settings is not_determined", () => {
  assert.equal(fromYahoo({}).system, SYSTEMS.NOT_DETERMINED);
  assert.equal(fromYahoo({ settings: null }).system, SYSTEMS.NOT_DETERMINED);
});

test("Yahoo with an unrecognized shape fails closed", () => {
  const m = fromYahoo({ settings: { some_other_field: 1 }, team: { faab_balance: 50 } });
  assert.equal(m.system, SYSTEMS.NOT_DETERMINED);
  assert.equal(m.budget_remaining, null);
});

test("Yahoo rejects an ambiguous uses_faab value rather than coercing it", () => {
  // "yes" is truthy. Treating it as FAAB would be exactly the assumption that
  // broke the earlier Yahoo parsers.
  assert.equal(fromYahoo({ settings: { uses_faab: "yes" } }).system, SYSTEMS.NOT_DETERMINED);
  assert.equal(fromYahoo({ settings: { uses_faab: 2 } }).system, SYSTEMS.NOT_DETERMINED);
});

test("Yahoo handles BOTH serialisations, since the endpoint's shape is unknown", () => {
  const flat = fromYahoo({ settings: { uses_faab: "1" }, team: { faab_balance: "73" } });
  const arr = fromYahoo({ settings: [{ uses_faab: 1 }], team: [{ faab_balance: 73 }] });
  assert.equal(flat.system, SYSTEMS.FAAB);
  assert.equal(arr.system, SYSTEMS.FAAB);
  assert.equal(flat.budget_remaining, 73);
  assert.equal(arr.budget_remaining, 73);
});

test("Yahoo FAAB reports remaining but NEVER a season total it does not have", () => {
  const m = fromYahoo({ settings: { uses_faab: "1" }, team: { faab_balance: "40" } });
  assert.equal(m.budget_remaining, 40);
  assert.equal(m.budget_total, null);
});

test("Yahoo priority requires a recognized waiver_type, not merely non-FAAB", () => {
  assert.equal(
    fromYahoo({ settings: { uses_faab: "0", waiver_type: "R" }, team: { waiver_priority: 4 } }).priority_position,
    4,
  );
  // non-FAAB but an unknown waiver_type is still unknown.
  assert.equal(
    fromYahoo({ settings: { uses_faab: "0", waiver_type: "ZZ" }, team: { waiver_priority: 4 } }).system,
    SYSTEMS.NOT_DETERMINED,
  );
});
