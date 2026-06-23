"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadMiddleware({
  billingEnabled = true,
  subscriptionRow = { is_subscribed: true },
  supabaseError = null,
} = {}) {
  const middlewarePath = require.resolve("../src/middleware/subscription");
  delete require.cache[middlewarePath];

  const state = {
    tables: [],
    selects: [],
    filters: [],
    maybeSingleCalls: 0,
  };

  const fakeSupabase = {
    from(table) {
      state.tables.push(table);
      return {
        select(columns) {
          state.selects.push(columns);
          return {
            eq(column, value) {
              state.filters.push({ column, value });
              return {
                maybeSingle: async () => {
                  state.maybeSingleCalls += 1;
                  if (supabaseError) {
                    return { data: null, error: { message: supabaseError } };
                  }
                  return { data: subscriptionRow, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === middlewarePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../config" && parent?.filename === middlewarePath) {
      return {
        appBaseUrl: "https://omen.example",
        billing: { enabled: billingEnabled },
        supabaseUrl: "https://example.supabase.co",
        supabaseServiceKey: "test-service-key",
      };
    }
    if (request === "./logging" && parent?.filename === middlewarePath) {
      return { logger: { warn() {}, error() {} } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return {
      requireSubscription: require("../src/middleware/subscription").requireSubscription,
      state,
    };
  } finally {
    Module._load = originalLoad;
  }
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function runMiddleware(options) {
  const { requireSubscription, state } = loadMiddleware(options);
  const req = { user: { id: "user-1" } };
  const res = makeRes();
  let nextCalls = 0;

  await requireSubscription(req, res, () => {
    nextCalls += 1;
  });

  return { state, res, nextCalls };
}

test("requireSubscription passes non-subscribed users through when billing is disabled", async () => {
  const { state, res, nextCalls } = await runMiddleware({
    billingEnabled: false,
    subscriptionRow: { is_subscribed: false },
  });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, null);
  assert.deepEqual(state.tables, []);
  assert.equal(state.maybeSingleCalls, 0);
});

test("requireSubscription returns 402 for non-subscribed users when billing is enabled", async () => {
  const { state, res, nextCalls } = await runMiddleware({
    billingEnabled: true,
    subscriptionRow: { is_subscribed: false },
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 402);
  assert.deepEqual(res.body, {
    error: "Pro subscription required",
    upgrade: "https://omen.example/?upgrade=true",
  });
  assert.deepEqual(state.tables, ["users"]);
  assert.deepEqual(state.selects, ["is_subscribed"]);
  assert.deepEqual(state.filters, [{ column: "id", value: "user-1" }]);
  assert.equal(state.maybeSingleCalls, 1);
});

test("requireSubscription passes subscribed users through when billing is enabled", async () => {
  const { res, nextCalls } = await runMiddleware({
    billingEnabled: true,
    subscriptionRow: { is_subscribed: true },
  });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, null);
});
