"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const { mapLineupSwapToMvpMove } = require("../src/services/omen");
const { statementsAreGrounded } = require("../src/services/evidenceWhy");

function build(swap, rosterPlayers = []) {
  return mapLineupSwapToMvpMove({
    roster: { team_key: "t1", week: 4, source: "sleeper", slots: { starters: rosterPlayers, bench: [] } },
    swap,
    connection: { platform: "sleeper", league_id: "L1" },
    connectedPlatforms: [{ platform: "sleeper" }],
  });
}

const SWAP = {
  slot: "WR", delta: 2.1, confidence: 70, confidence_reason: "Edge is meaningful.",
  from: { player_key: "a", name: "Bench Wideout", status: "questionable", projected: 13.1 },
  to: { player_key: "b", name: "Starter Wideout", status: null, projected: 15.2 },
};

test("brief: explanation carries ranked why_statements from the swap's own fields", () => {
  const response = build(SWAP);
  const statements = response.recommendation.explanation.why_statements;
  assert.deepEqual(statements.map((s) => s.basis), ["observed", "projection"]);
  assert.equal(statements[0].text, "Bench Wideout is listed questionable.");
  assert.equal(statements[1].text, "Starter Wideout projects 15.2 and Bench Wideout projects 13.1.");
  // Existing fields are untouched.
  assert.match(response.recommendation.explanation.why_it_matters, /better WR option by \+2\.10 pts/);
});

test("brief: a swap with no projections yields the honest not-enough-evidence statement, not a null-as-zero claim", () => {
  const response = build({ ...SWAP, from: { ...SWAP.from, status: null, projected: null }, to: { ...SWAP.to, projected: null } });
  const [only] = response.recommendation.explanation.why_statements;
  assert.equal(only.basis, "limitation");
  assert.deepEqual(only.evidence, []);
  assert.equal(statementsAreGrounded([only], []), true);
});
