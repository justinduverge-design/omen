"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadAppUserService() {
  const servicePath = require.resolve("../src/services/appUser");
  delete require.cache[servicePath];

  const state = { upserts: [] };
  const fakeSupabase = {
    from(table) {
      assert.equal(table, "users");
      return {
        upsert(payload, options) {
          state.upserts.push({ payload, options });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === servicePath) {
      return { createClient: () => fakeSupabase };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { service: require("../src/services/appUser"), state };
  } finally {
    Module._load = originalLoad;
  }
}

test("ensureAppUser upserts only app-user identity fields", async () => {
  const { service, state } = loadAppUserService();

  const result = await service.ensureAppUser({
    id: "user-1",
    email: "User@Example.com",
  });

  assert.deepEqual(result, { id: "user-1", email: "user@example.com" });
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].options.onConflict, "id");
  assert.equal(state.upserts[0].payload.id, "user-1");
  assert.equal(state.upserts[0].payload.email, "user@example.com");
  assert.deepEqual(Object.keys(state.upserts[0].payload).sort(), ["email", "id"]);
});

test("ensureAppUser rejects authenticated users without email", async () => {
  const { service, state } = loadAppUserService();

  await assert.rejects(
    () => service.ensureAppUser({ id: "user-1" }),
    (err) => err.status === 422 && err.message === "Authenticated user email is required"
  );
  assert.deepEqual(state.upserts, []);
});
