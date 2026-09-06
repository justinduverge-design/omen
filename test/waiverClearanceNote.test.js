"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const { waiverClearanceNote } = require("../src/services/omen");
const { fromSleeper, undetermined } = require("../src/services/waiverSystem");

const FAAB = fromSleeper({
  league: { settings: { waiver_type: 2, waiver_budget: 100 } },
  roster: { settings: { waiver_budget_used: 40, waiver_position: 4 } },
});
const PRIORITY = fromSleeper({
  league: { settings: { waiver_type: 0, waiver_budget: 100 } },
  roster: { settings: { waiver_position: 6 } },
});

test("a verified FAAB league is told its real remaining budget", () => {
  const note = waiverClearanceNote(FAAB, "Sleeper");
  assert.match(note, /\$60 left/);
  assert.doesNotMatch(note, /not modeled/);
});

test("a verified priority league is told its real position, never a budget", () => {
  const note = waiverClearanceNote(PRIORITY, "Sleeper");
  assert.match(note, /number 6/);
  assert.doesNotMatch(note, /\$/);
  assert.doesNotMatch(note, /not modeled/);
});

test("an undetermined league keeps the honest not-modeled language", () => {
  const note = waiverClearanceNote(undetermined("no probe"), "ESPN");
  assert.match(note, /not modeled/);
  assert.match(note, /ESPN/);
});

test("a null model keeps the not-modeled language rather than throwing", () => {
  assert.match(waiverClearanceNote(null, "Yahoo"), /not modeled/);
});

test("no phrasing ever claims the add will clear", () => {
  for (const m of [FAAB, PRIORITY, undetermined("x"), null]) {
    const note = waiverClearanceNote(m, "Sleeper");
    assert.doesNotMatch(note, /will clear|guaranteed|you will win|succeeds/i);
  }
});
