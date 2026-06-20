"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSleeperDraftAccess } = require("../src/services/sleeperDraftAccess");

function fakeSupabase(data, error = null, calls = null) {
  const query = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() { return { data, error }; },
  };
  return {
    from() {
      if (calls) calls.count += 1;
      return query;
    },
  };
}

const CONNECTION = {
  league_id: "league-1",
  platform_user_id: "user-1",
};

test("allows only the authenticated user's connected Sleeper league", async () => {
  const access = createSleeperDraftAccess({
    supabaseClient: fakeSupabase(CONNECTION),
  });

  assert.deepEqual(
    await access.assertLeagueAccess("app-user-1", "league-1"),
    CONNECTION,
  );
  await assert.rejects(
    access.assertLeagueAccess("app-user-1", "league-2"),
    (error) => error.status === 404 && error.code === "sleeper_draft_not_found",
  );
});

test("rejects a draft outside the connected league", async () => {
  const access = createSleeperDraftAccess({
    supabaseClient: fakeSupabase(CONNECTION),
  });

  await assert.rejects(
    access.assertDraftAccess("app-user-1", { league_id: "league-2" }),
    (error) => error.status === 404 && error.code === "sleeper_draft_not_found",
  );
});

test("coalesces and caches connection ownership lookups", async () => {
  const calls = { count: 0 };
  const access = createSleeperDraftAccess({
    supabaseClient: fakeSupabase(CONNECTION, null, calls),
  });

  await Promise.all([
    access.getConnection("app-user-1"),
    access.getConnection("app-user-1"),
  ]);
  await access.getConnection("app-user-1");

  assert.equal(calls.count, 1);
});

test("fails closed when no active Sleeper connection exists", async () => {
  const access = createSleeperDraftAccess({
    supabaseClient: fakeSupabase(null),
  });

  await assert.rejects(
    access.getConnection("app-user-1"),
    (error) => error.status === 404 && error.code === "sleeper_connection_not_found",
  );
});
