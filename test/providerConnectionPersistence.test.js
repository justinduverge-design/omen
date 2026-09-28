"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  BASE_COLUMNS,
  EXTENDED_COLUMNS,
  isMissingColumnError,
  selectConnections,
  upsertConnection,
} = require("../src/services/providerConnectionPersistence");

function fakeSupabase({ extendedError = null } = {}) {
  const calls = [];
  return {
    calls,
    from() {
      return {
        select(columns) {
          calls.push({ op: "select", columns });
          return { eq: async () => columns === EXTENDED_COLUMNS && extendedError
            ? { data: null, error: extendedError }
            : { data: [{ platform: "espn" }], error: null } };
        },
        upsert(payload) {
          calls.push({ op: "upsert", payload });
          return Promise.resolve(payload.connection_state && extendedError
            ? { data: null, error: extendedError }
            : { data: null, error: null });
        },
      };
    },
  };
}

test("recognizes only schema-missing errors for compatibility fallback", () => {
  assert.equal(isMissingColumnError({ code: "PGRST204", message: "missing" }), true);
  assert.equal(isMissingColumnError({ code: "23505", message: "duplicate" }), false);
  assert.equal(isMissingColumnError({ message: "Could not find the 'connection_state' column" }), true);
});

test("select falls back to the base contract when health columns are absent", async () => {
  const supabase = fakeSupabase({ extendedError: { code: "PGRST204", message: "missing column" } });
  const result = await selectConnections(supabase, "user-1");
  assert.equal(result.stateColumnsAvailable, false);
  assert.equal(supabase.calls[0].columns, EXTENDED_COLUMNS);
  assert.equal(supabase.calls[1].columns, BASE_COLUMNS);
});

test("upsert writes connected health state when columns exist", async () => {
  const supabase = fakeSupabase();
  await upsertConnection(supabase, { user_id: "user-1", platform: "espn" }, { onConflict: "user_id,platform" }, new Date("2026-09-28T12:00:00.000Z"));
  assert.equal(supabase.calls[0].payload.connection_state, "connected");
  assert.equal(supabase.calls[0].payload.last_status, 200);
});

test("upsert retries the original payload when health columns are absent", async () => {
  const supabase = fakeSupabase({ extendedError: { code: "PGRST204", message: "missing column" } });
  const result = await upsertConnection(supabase, { user_id: "user-1", platform: "espn" }, { onConflict: "user_id,platform" });
  assert.equal(result.stateColumnsAvailable, false);
  assert.equal(supabase.calls.length, 2);
  assert.equal(supabase.calls[1].payload.connection_state, undefined);
});
