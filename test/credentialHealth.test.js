"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { classify, createCredentialHealthChecker } = require("../src/services/credentialHealth");

test("only a definite provider refusal counts; outages and expired-but-refreshable tokens never do", () => {
  assert.equal(classify("espn", Object.assign(new Error("ESPN rejected"), { status: 401 })), "espn_unauthorized");
  assert.equal(classify("espn", Object.assign(new Error("ESPN 502"), { status: 502 })), null);
  assert.equal(classify("espn", Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), null);
  assert.equal(
    classify(
      "yahoo",
      Object.assign(new Error("refresh failed (400)"), { status: 400, yahoo_error: { error: "invalid_grant" } }),
    ),
    "yahoo_refresh_refused",
  );
  assert.equal(classify("yahoo", Object.assign(new Error("yahoo_token_expired"), { status: 401 })), null);
  assert.equal(classify("yahoo", Object.assign(new Error("Yahoo API error: 500"), { status: 500 })), null);
});

function harness(rows, outcomes) {
  const rpcs = [];
  const supabase = {
    from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: rows, error: null }) }) }) }),
    rpc: async (name, args) => {
      rpcs.push({ name, args });
      return { error: null };
    },
  };
  const checks = {
    espn: async (row) => {
      const o = outcomes[row.user_id];
      if (o) throw o;
    },
    yahoo: async (row) => {
      const o = outcomes[row.user_id];
      if (o) throw o;
    },
  };
  return { checker: createCredentialHealthChecker({ supabase, checks }), rpcs };
}

test("a refused credential is invalidated; an accepted one is marked valid; an outage changes nothing", async () => {
  const rows = [
    { user_id: "ok", platform: "espn", league_id: "1", espn_secret_id: "a", swid_secret_id: "b" },
    { user_id: "dead", platform: "espn", league_id: "2", espn_secret_id: "a", swid_secret_id: "b" },
    { user_id: "outage", platform: "yahoo", league_id: "3", token_secret_id: "t" },
    { user_id: "gone", platform: "yahoo", league_id: "4", token_secret_id: "t" },
    { user_id: "nosecret", platform: "espn", league_id: "5" },
  ];
  const { checker, rpcs } = harness(rows, {
    dead: Object.assign(new Error("ESPN rejected"), { status: 401 }),
    outage: Object.assign(new Error("Yahoo API error: 503"), { status: 503 }),
    gone: Object.assign(new Error("refresh refused"), { status: 400, yahoo_error: { error: "invalid_grant" } }),
  });
  const tally = await checker.run();
  assert.deepEqual(tally, { checked: 4, valid: 1, invalidated: 2, transient: 1, skipped: 1 });
  assert.deepEqual(rpcs.map((r) => `${r.name}:${r.args.p_user_id}:${r.args.p_failure_code ?? ""}`).sort(), [
    "connection_invalidate:dead:espn_unauthorized",
    "connection_invalidate:gone:yahoo_refresh_refused",
    "connection_record_health:ok:",
  ]);
});
