"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ledgerRecord, decisionLedgerRow } = require("../src/routes/moves");

const call = (status, result) =>
  decisionLedgerRow({
    decision: {
      id: "d",
      season: 2026,
      week: 6,
      call_type: "start_sit",
      recommendation: { comparison_player: status === undefined ? {} : { status } },
    },
    action: null,
    outcome: { state: "resolved", provenance: "verified", result },
  });

test("contested hit rate leaves out calls against an OUT or bye alternative", () => {
  const rows = [
    call("Q", "win"),
    call(null, "loss"),
    call("OUT", "win"),
    call("BYE", "win"),
    call(undefined, "win"),
    call("Q", "loss"),
  ];
  assert.equal(rows[2].contested, false);
  assert.equal(rows[0].contested, true);
  const r = ledgerRecord(rows);
  assert.equal(r.worked, 4);
  assert.equal(r.uncontested, 2);
  assert.equal(r.contested_worked, 1);
  assert.equal(r.contested_did_not_work, 1);
  assert.equal(r.contest_unknown, 2);
  assert.equal(r.contested_hit_rate, 0.5);
});
