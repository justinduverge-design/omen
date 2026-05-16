"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;
delete process.env.REDIS_TOKEN;

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

class FakeQuery {
  constructor(state) {
    this.state = state;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  maybeSingle() {
    const row = this.state.rows.find((candidate) =>
      this.filters.every(({ field, value }) => candidate[field] === value)
    );
    return Promise.resolve({ data: row || null, error: null });
  }
}

function makeSupabase(state) {
  return {
    from(table) {
      assert.equal(table, "platform_connections");
      return {
        select(columns) {
          state.selects.push(columns);
          return new FakeQuery(state);
        },
        upsert(payload, options) {
          state.upserts.push({ payload, options });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    rpc(name, params) {
      state.rpcs.push({ name, params });
      if (name === "vault_create_secret") {
        return Promise.resolve({ data: `${params.name}-id`, error: null });
      }
      if (name === "vault_update_secret") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function loadYahooAuth(rows = []) {
  const servicePath = require.resolve("../src/services/yahooAuth");
  delete require.cache[servicePath];

  const state = {
    rows: rows.map((row) => ({ ...row })),
    selects: [],
    upserts: [],
    rpcs: [],
  };
  const fakeSupabase = makeSupabase(state);
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === servicePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../middleware/logging" && parent?.filename === servicePath) {
      return { logger: { error() {}, warn() {}, info() {} } };
    }
    if (request === "../middleware/yahooOAuth" && parent?.filename === servicePath) {
      return {
        refreshYahooToken: async () => {
          throw new Error("refresh path not exercised in persistYahooTokens tests");
        },
      };
    }
    if (request === "./yahoo" && parent?.filename === servicePath) {
      return function FakeYahooClient() {};
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { service: require("../src/services/yahooAuth"), state };
  } finally {
    Module._load = originalLoad;
  }
}

test("persistYahooTokens updates existing Vault secrets and preserves existing league_id", async () => {
  const { service, state } = loadYahooAuth([
    {
      user_id: "user-1",
      platform: "yahoo",
      league_id: "existing-league",
      token_secret_id: "access-secret",
      refresh_secret_id: "refresh-secret",
    },
  ]);

  await service.persistYahooTokens("user-1", {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    expires_in: 7200,
    xoauth_yahoo_guid: "guid-1",
  });

  assert.equal(state.selects[0], "league_id, token_secret_id, refresh_secret_id");
  assert.deepEqual(state.rpcs.map((rpc) => rpc.name), [
    "vault_update_secret",
    "vault_update_secret",
  ]);
  assert.deepEqual(state.rpcs.map((rpc) => rpc.params.secret_id), [
    "access-secret",
    "refresh-secret",
  ]);
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].payload.league_id, "existing-league");
  assert.equal(state.upserts[0].payload.token_secret_id, "access-secret");
  assert.equal(state.upserts[0].payload.refresh_secret_id, "refresh-secret");
  assert.equal(state.upserts[0].options.onConflict, "user_id,platform");
});

test("persistYahooTokens creates Vault secrets when no Yahoo connection exists", async () => {
  const { service, state } = loadYahooAuth();

  await service.persistYahooTokens("user-2", {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
  }, "new-league");

  assert.deepEqual(state.rpcs.map((rpc) => rpc.name), [
    "vault_create_secret",
    "vault_create_secret",
  ]);
  assert.equal(state.rpcs[0].params.name, "yahoo_access_user-2");
  assert.equal(state.rpcs[1].params.name, "yahoo_refresh_user-2");
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].payload.league_id, "new-league");
  assert.equal(state.upserts[0].payload.token_secret_id, "yahoo_access_user-2-id");
  assert.equal(state.upserts[0].payload.refresh_secret_id, "yahoo_refresh_user-2-id");
});
