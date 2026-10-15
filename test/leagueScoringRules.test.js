"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { recordLeagueScoringRules, recordLeagueScoringRulesSafely } = require("../src/services/leagueScoringRules");

const HASH = "a".repeat(64);
const supported = (over = {}) => ({
  contract: { ruleset_version: "scoring-contract.v1", coverage_state: "supported", rules: [{ event_key: "receiving_receptions", operator: "per_event", value: 1 }] },
  contract_version: "scoring-contract.v1",
  contract_hash: HASH,
  coverage_state: "supported",
  ...over,
});
const INPUT = { platform: "yahoo", providerLeagueId: "L1", season: 2026 };

// A tiny chainable fake of the Supabase builder: records inserts, answers selects from `state`.
function fake({ league = { id: "lg-uuid" }, existing = null, insertError = null, eventError = null } = {}) {
  const log = { inserts: [], selects: [] };
  const from = (table) => {
    const q = { table, filters: {} };
    const builder = {
      select() { return builder; },
      eq(col, val) { q.filters[col] = val; return builder; },
      maybeSingle: async () => {
        log.selects.push({ table, filters: { ...q.filters } });
        return { data: table === "leagues" ? league : existing, error: null };
      },
      insert(row) {
        q.row = row;
        log.inserts.push({ table, row });
        return {
          select: () => ({
            single: async () => {
              if (table === "data_events") return eventError ? { data: null, error: eventError } : { data: { id: 7 }, error: null };
              return insertError ? { data: null, error: insertError } : { data: { id: 99 }, error: null };
            },
          }),
        };
      },
    };
    return builder;
  };
  return { supabase: { from }, log };
}

test("a retained, supported rule set is written once, citing a scoring-rules ingest event", async () => {
  const { supabase, log } = fake();
  const result = await recordLeagueScoringRules(supabase, { ...INPUT, scoring: supported() });
  assert.deepEqual(result, { written: true, id: 99 });
  const [event, rules] = log.inserts;
  assert.equal(event.table, "data_events");
  assert.equal(event.row.event, "ingest");
  assert.equal(event.row.subject, "scoring_rules:yahoo");
  assert.equal(event.row.rights_basis, "yahoo_user_connection");
  assert.equal(event.row.source_ref, `sha256:${HASH}`);
  assert.equal(rules.table, "league_scoring_rules");
  assert.equal(rules.row.ingest_event_id, 7);
  assert.equal(rules.row.league_id, "lg-uuid");
  assert.equal(rules.row.contract_hash, HASH);
  assert.deepEqual(rules.row.uses, ["grading", "advice"]);
});

test("an unchanged rule set is a no-op: no ingest event, no row", async () => {
  const { supabase, log } = fake({ existing: { id: 5 } });
  const result = await recordLeagueScoringRules(supabase, { ...INPUT, scoring: supported() });
  assert.deepEqual(result, { written: false, reason: "unchanged", id: 5 });
  assert.deepEqual(log.inserts, []);
});

test("nothing is stored when the rights gate withheld the body, coverage is partial, or the context is incomplete", async () => {
  const { supabase, log } = fake();
  const cases = [
    [{ ...INPUT, scoring: supported({ contract: null }) }, "rules_not_retained"],
    [{ ...INPUT, scoring: supported({ coverage_state: "partial" }) }, "coverage_not_supported"],
    [{ ...INPUT, scoring: supported({ contract_hash: "nope" }) }, "contract_incomplete"],
    [{ ...INPUT, season: 1, scoring: supported() }, "context_incomplete"],
    [{ ...INPUT, platform: "fleaflicker", scoring: supported() }, "provider_unsupported"],
  ];
  for (const [input, reason] of cases) {
    assert.deepEqual(await recordLeagueScoringRules(supabase, input), { written: false, reason });
  }
  assert.deepEqual(log.inserts, []);
});

test("a league Omen has not registered is skipped, never created here", async () => {
  const { supabase, log } = fake({ league: null });
  assert.deepEqual(await recordLeagueScoringRules(supabase, { ...INPUT, scoring: supported() }), { written: false, reason: "league_not_registered" });
  assert.deepEqual(log.inserts, []);
});

test("a concurrent writer winning the race is success, not an error", async () => {
  const { supabase } = fake({ insertError: { code: "23505" } });
  assert.deepEqual(await recordLeagueScoringRules(supabase, { ...INPUT, scoring: supported() }), { written: false, reason: "unchanged" });
});

test("the safe wrapper never throws and logs only the stage and database code", async () => {
  const { supabase } = fake({ eventError: { code: "42501", message: "secret detail league L1" } });
  const logged = [];
  const log = { info: (...a) => logged.push(["info", ...a]), warn: (...a) => logged.push(["warn", ...a]) };
  const result = await recordLeagueScoringRulesSafely(supabase, { ...INPUT, scoring: supported() }, { log });
  assert.deepEqual(result, { written: false, reason: "write_failed" });
  assert.deepEqual(logged, [["warn", "League scoring rules write failed", { stage: "ingest_event", code: "42501" }]]);
  assert.ok(!JSON.stringify(logged).includes("L1"));
});
