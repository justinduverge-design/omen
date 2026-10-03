"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const store = require("../src/services/connectionStore");

const STEP02 = fs.readFileSync(
  path.join(__dirname, "../sql/2026-10-01-redo/02_connection_credentials.up.sql"),
  "utf8"
);

function declaredParams(fn) {
  const match = STEP02.match(new RegExp(`create function public\\.${fn}\\(([^)]*)\\)`));
  assert.ok(match, `${fn} is declared in step 02`);
  return match[1].split(",").map((arg) => arg.trim().split(/\s+/)[0]);
}

function fakeSupabase(result) {
  const calls = [];
  return { calls, rpc: async (name, params) => { calls.push({ name, params }); return result; } };
}

test("every step 02 call uses the argument names declared in the SQL (a typo would fall back forever)", () => {
  for (const [fn, params] of Object.entries(store.STEP02_PARAMS)) {
    assert.deepEqual(params, declaredParams(fn), fn);
  }
});

test("each wrapper sends exactly the declared arguments", async () => {
  const supabase = fakeSupabase({ data: "conn-id", error: null });
  await store.storeEspn(supabase, { userId: "u", leagueId: "1", teamId: "7", espnS2: "s2", swid: "{w}" });
  await store.storeYahoo(supabase, { userId: "u", accessToken: "a", refreshToken: "r", expiresAt: "2026-10-03T00:00:00Z" });
  await store.rotateYahoo(supabase, { userId: "u", expectedExpiresAt: null, accessToken: "a", expiresAt: "2026-10-03T00:00:00Z" });
  await store.revoke(supabase, { userId: "u", platform: "espn" });
  for (const call of supabase.calls) {
    assert.deepEqual(Object.keys(call.params), store.STEP02_PARAMS[call.name], call.name);
  }
});

test("a missing function reports present:false for both PostgREST and Postgres codes", async () => {
  for (const code of ["PGRST202", "42883"]) {
    const result = await store.revoke(fakeSupabase({ data: null, error: { code, message: "not found" } }), { userId: "u", platform: "espn" });
    assert.deepEqual(result, { present: false });
  }
});

test("a real error throws with the function name and code only, never the arguments", async () => {
  const supabase = fakeSupabase({ data: null, error: { code: "P0001", message: "connection_revoke: 1 of 2 secrets found" } });
  await assert.rejects(
    store.storeEspn(supabase, { userId: "u", leagueId: "1", espnS2: "SECRET-S2-VALUE", swid: "{SECRET-SWID}" }),
    (err) => {
      assert.match(err.message, /connection_store_espn failed \(P0001\)/);
      assert.doesNotMatch(err.message, /SECRET/);
      return true;
    }
  );
});

test("a present function returns its data", async () => {
  assert.deepEqual(await store.rotateYahoo(fakeSupabase({ data: false, error: null }), { userId: "u", accessToken: "a", expiresAt: "x" }), { present: true, data: false });
});
