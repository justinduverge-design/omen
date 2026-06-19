"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadAdapterWithAxiosStub(handler) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  delete require.cache[adapterPath];

  const calls = [];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return {
        get: async (url, options = {}) => {
          calls.push({ url, options });
          return { data: handler(url) };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { adapter: require("../src/adapters/sleeper"), calls };
  } finally {
    Module._load = originalLoad;
  }
}

test("fetchSleeperLeagueDrafts returns an array even if upstream returns null", async () => {
  const { adapter } = loadAdapterWithAxiosStub((url) => {
    if (url.includes("/league/league-1/drafts")) return null;
    throw new Error(`Unexpected URL ${url}`);
  });

  const drafts = await adapter.fetchSleeperLeagueDrafts("league-1");
  assert.deepEqual(drafts, []);
});

test("fetchSleeperLeagueDrafts passes leagueId through encodeURIComponent", async () => {
  const { adapter, calls } = loadAdapterWithAxiosStub(() => [
    { draft_id: "d1", status: "drafting" },
  ]);

  await adapter.fetchSleeperLeagueDrafts("league space");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes("/league/league%20space/drafts"));
});

test("fetchSleeperDraft surfaces 404 when upstream returns non-object", async () => {
  const { adapter } = loadAdapterWithAxiosStub((url) => {
    if (url.endsWith("/draft/missing")) return null;
    throw new Error(`Unexpected URL ${url}`);
  });

  await assert.rejects(
    () => adapter.fetchSleeperDraft("missing"),
    (err) => {
      assert.equal(err.status, 404);
      assert.match(err.message, /Sleeper draft not found/);
      return true;
    },
  );
});

test("fetchSleeperDraftPicks returns sorted picks array (empty on null)", async () => {
  const { adapter } = loadAdapterWithAxiosStub((url) => {
    if (url.includes("/picks")) return null;
    throw new Error(`Unexpected URL ${url}`);
  });

  const picks = await adapter.fetchSleeperDraftPicks("draft-1");
  assert.deepEqual(picks, []);
});
