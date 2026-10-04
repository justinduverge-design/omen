"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { buildEvidenceWhy, statementsAreGrounded, NOT_ENOUGH_EVIDENCE } = require("../src/services/evidenceWhy");
const { START_SIT } = require("../src/services/evidenceVocabulary");

const row = (category, kind, statement) => ({ category, kind, statement });
const LEAGUE = row("league_fact", "verified", "This league awards 1 point per reception.");
const PROJ = row("player_game_fact", "projection", "Tyreek Hill projects 21.7 and Josh Allen projects 18.2 in this league's scoring.");
const BREAKDOWN = row("points_breakdown", "projected", "Tyreek Hill's 21.7 is 14.2 from receiving and 7.5 from other scoring.");
const BREAKDOWN_LIMIT = row("points_breakdown", "limitation", "Points breakdown unavailable for Josh Allen: no provider stat lines.");
const USAGE = row("recent_usage", "verified", "Tyreek Hill had 9 targets over the last 3 games.");
const USAGE2 = row("recent_usage", "verified", "Josh Allen had 4 carries over the last 3 games.");
const USAGE3 = row("recent_usage", "verified", "Josh Allen had 31 attempts over the last 3 games.");
const STATUS = row("current_status", "verified", "Tyreek Hill is listed questionable.");
const TEAM = row("team_system", "observed_context", "Miami ranks 3rd in pass rate.");
const INFER = row("omen_inference", "inference", "The available data favors Tyreek Hill.");

const texts = (rows) => buildEvidenceWhy(rows).map((s) => s.text);

test("ranking: observed facts, then projection gap, then inference; max three", () => {
  const out = buildEvidenceWhy([LEAGUE, PROJ, BREAKDOWN, USAGE, STATUS, TEAM, INFER]);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((s) => s.basis), ["observed", "observed", "observed"]);
  assert.deepEqual(out.map((s) => s.text), [USAGE.statement, STATUS.statement, BREAKDOWN.statement]);
  assert.deepEqual(out.map((s) => s.rank), [1, 2, 3]);
});

const CASES = [
  { name: "projection then inference when nothing observed", rows: [LEAGUE, INFER, PROJ], expect: [PROJ.statement, INFER.statement] },
  { name: "league_fact alone is context, not a reason", rows: [LEAGUE], expect: [NOT_ENOUGH_EVIDENCE] },
  { name: "empty array", rows: [], expect: [NOT_ENOUGH_EVIDENCE] },
  { name: "not an array", rows: null, expect: [NOT_ENOUGH_EVIDENCE] },
  { name: "malformed rows are ignored", rows: [null, 5, { category: "recent_usage", kind: "verified" }], expect: [NOT_ENOUGH_EVIDENCE] },
  { name: "at most two per category", rows: [USAGE, USAGE2, USAGE3, PROJ], expect: [USAGE.statement, USAGE2.statement, PROJ.statement] },
  { name: "limitation outranks inference", rows: [INFER, BREAKDOWN_LIMIT, PROJ], expect: [PROJ.statement, BREAKDOWN_LIMIT.statement, INFER.statement] },
  { name: "limitation is never crowded out by the cap", rows: [USAGE, STATUS, BREAKDOWN, TEAM, BREAKDOWN_LIMIT], expect: [USAGE.statement, STATUS.statement, BREAKDOWN_LIMIT.statement] },
  { name: "limitation alone is surfaced", rows: [BREAKDOWN_LIMIT], expect: [BREAKDOWN_LIMIT.statement] },
  {
    name: "overclaiming rows are dropped",
    rows: [row("omen_inference", "inference", "Omen predicts Tyreek Hill beats the projection."), PROJ],
    expect: [PROJ.statement],
  },
];
for (const { name, rows, expect } of CASES) {
  test(`evidenceWhy: ${name}`, () => assert.deepEqual(texts(rows), expect));
}

test("limitation statement keeps the honest basis tag", () => {
  const out = buildEvidenceWhy([USAGE, STATUS, BREAKDOWN, BREAKDOWN_LIMIT]);
  const limitation = out.find((s) => s.basis === "limitation");
  assert.ok(limitation);
  assert.match(limitation.text, /unavailable/i);
});

test("empty evidence is an honest statement with no sources", () => {
  const [only] = buildEvidenceWhy([]);
  assert.equal(only.basis, "limitation");
  assert.deepEqual(only.evidence, []);
});

test("every statement cites its rows and invents no number or name", () => {
  const rows = [LEAGUE, PROJ, BREAKDOWN, USAGE, STATUS, TEAM, INFER, BREAKDOWN_LIMIT];
  const out = buildEvidenceWhy(rows);
  assert.ok(statementsAreGrounded(out, rows));
  for (const statement of out) {
    assert.equal(statement.evidence.length, 1);
    const source = rows[Number(/\d+/.exec(statement.evidence[0].id)[0])];
    assert.equal(source.statement, statement.text);
    assert.ok(START_SIT.categories.includes(statement.evidence[0].category));
    assert.ok(START_SIT.kinds.includes(statement.evidence[0].kind));
  }
  // The checker really rejects a fabricated figure.
  assert.equal(statementsAreGrounded([{ ...out[0], text: "Tyreek Hill had 99 targets." }], rows), false);
});

test("explicit row ids are carried through", () => {
  const [one] = buildEvidenceWhy([{ ...USAGE, id: "ev_usage_1" }]);
  assert.equal(one.evidence[0].id, "ev_usage_1");
});

test("input rows are not mutated and output is deterministic", () => {
  const rows = [PROJ, USAGE, INFER];
  const snapshot = JSON.stringify(rows);
  assert.deepEqual(buildEvidenceWhy(rows), buildEvidenceWhy(rows));
  assert.equal(JSON.stringify(rows), snapshot);
});

test("signal-vs-noise usage rows (recent_usage / observed_context) rank as observed facts", () => {
  const out = buildEvidenceWhy([
    { category: "omen_inference", kind: "inference", statement: "The available data favors A B." },
    { category: "recent_usage", kind: "observed_context", statement: "Snap share held at 80% over the last 4 games, so A B's recent usage is steady." },
  ]);
  assert.equal(out[0].basis, "observed");
  assert.equal(out[0].evidence[0].category, "recent_usage");
});
