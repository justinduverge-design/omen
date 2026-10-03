"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { redactEspnPath } = require("../src/adapters/espn");

test("ESPN request paths are logged without the query or the user's SWID", () => {
  const swid = "{ABCDEF12-3456-7890-ABCD-EF1234567890}";
  assert.equal(redactEspnPath(`/apis/v2/fans/${swid}?featureFlags=challengeEntries`), "/apis/v2/fans/[swid]");
  assert.equal(redactEspnPath(`/apis/v2/fans/${encodeURIComponent(swid)}`), "/apis/v2/fans/[swid]");
  assert.equal(redactEspnPath("/apis/v3/games/ffl/seasons/2026/segments/0/leagues/123?view=mRoster"),
    "/apis/v3/games/ffl/seasons/2026/segments/0/leagues/123");
  assert.equal(redactEspnPath(`/x/${swid}/y`), "/x/[swid]/y", "a SWID anywhere in the path is removed");
  assert.equal(redactEspnPath(undefined), "");
});

test("the ESPN adapter never logs or reports a raw request path", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "adapters", "espn.js"), "utf8");
  assert.doesNotMatch(src, /\$\{path\.split\("\?"\)\[0\]\}/);
  assert.doesNotMatch(src, /path: String\(path \|\| ""\)\.split/);
});

test("the data export selects only columns that exist and includes the new Ledger", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "routes", "userPrivacy.js"), "utf8");
  const moves = src.match(/selectRows\("moves", "([^"]+)"/)[1].split(",");
  // Production moves columns, 2026-10-03.
  const real = new Set("id,user_id,week_num,season,move_type,headline,reasoning,confidence,target_player,vorp_score,followed,outcome,created_at,user_stars,user_note,eff,scoring,scoring_contract,scoring_contract_hash,scoring_contract_version,scoring_contract_required,scoring_coverage_state,provider_rule_snapshot_hash,provider_final_outcome,reconciliation_state,platform,league_id".split(","));
  assert.deepEqual(moves.filter((c) => !real.has(c)), []);
  assert.match(src, /selectRows\("decisions", "/);
});
