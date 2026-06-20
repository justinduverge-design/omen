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

function loadAdapterWithDelayedAxios(payload) {
  const adapterPath = require.resolve("../src/adapters/sleeper");
  delete require.cache[adapterPath];

  const calls = [];
  let resolveGate;
  const gate = new Promise((resolve) => { resolveGate = resolve; });

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "axios" && parent?.filename === adapterPath) {
      return {
        get: async (url) => {
          calls.push(url);
          await gate;
          return { data: payload };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      adapter: require("../src/adapters/sleeper"),
      calls,
      release: () => resolveGate(),
    };
  } finally {
    Module._load = originalLoad;
  }
}

test("fetchSleeperDraft dedupes concurrent cache-miss callers to one upstream fetch", async () => {
  const { adapter, calls, release } = loadAdapterWithDelayedAxios({
    draft_id: "draft-1",
    status: "drafting",
    type: "snake",
    settings: { teams: 12, rounds: 15 },
  });

  const pending = Promise.all([
    adapter.fetchSleeperDraft("draft-1"),
    adapter.fetchSleeperDraft("draft-1"),
    adapter.fetchSleeperDraft("draft-1"),
    adapter.fetchSleeperDraft("draft-1"),
    adapter.fetchSleeperDraft("draft-1"),
  ]);

  release();
  const results = await pending;

  assert.equal(calls.length, 1, "axios should only be called once across 5 concurrent requesters");
  assert.equal(results.length, 5);
  results.forEach((r) => assert.equal(r.draft_id, "draft-1"));
});

test("fetchSleeperDraftPicks dedupes concurrent cache-miss callers to one upstream fetch", async () => {
  const { adapter, calls, release } = loadAdapterWithDelayedAxios([
    { pick_no: 1, round: 1, draft_slot: 1, roster_id: 11, player_id: "100" },
    { pick_no: 2, round: 1, draft_slot: 2, roster_id: 12, player_id: "200" },
  ]);

  const pending = Promise.all([
    adapter.fetchSleeperDraftPicks("draft-1"),
    adapter.fetchSleeperDraftPicks("draft-1"),
    adapter.fetchSleeperDraftPicks("draft-1"),
  ]);

  release();
  const results = await pending;

  assert.equal(calls.length, 1, "axios should only be called once across 3 concurrent requesters");
  assert.equal(results.length, 3);
  results.forEach((r) => assert.equal(r.length, 2));
});

test("fetchSleeperDraft re-fetches after the in-flight promise settles", async () => {
  const { adapter, calls, release } = loadAdapterWithDelayedAxios({
    draft_id: "draft-1",
    status: "drafting",
    type: "snake",
    settings: { teams: 12, rounds: 15 },
  });
  delete process.env.REDIS_URL;
  delete process.env.REDIS_TOKEN;

  release();
  await adapter.fetchSleeperDraft("draft-1");
  await adapter.fetchSleeperDraft("draft-1");

  // Without Redis the cache is a no-op, so each sequential call fetches.
  // The dedupe only fires within a single in-flight window.
  assert.equal(calls.length, 2);
});

test("Sleeper request budget fails closed and resets with its window", () => {
  let now = 100;
  const { adapter } = loadAdapterWithAxiosStub(() => ({}));
  const budget = adapter.createWindowBudget({
    limit: 2,
    windowMs: 1_000,
    now: () => now,
  });

  budget.take();
  budget.take();
  assert.throws(
    () => budget.take(),
    (error) => error.code === "sleeper_request_budget_exhausted"
      && error.retryAfterMs === 1_000,
  );
  now += 1_000;
  assert.doesNotThrow(() => budget.take());
});
