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
    this.state.reads = (this.state.reads || 0) + 1;
    const row = this.state.rows.find((candidate) =>
      this.filters.every(({ field, value }) => candidate[field] === value)
    );
    const copy = row ? { ...row } : null;
    // Simulates another request finishing its refresh right after this one read the row.
    if (this.state.refreshedByOtherAfterRead === this.state.reads && row) {
      Object.assign(row, { token_expires_at: new Date(Date.now() + 3600_000).toISOString(), token_secret_id: "other-access-secret" });
    }
    return Promise.resolve({ data: copy, error: null });
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
        update(payload) {
          state.updates.push(payload);
          const chain = { eq: () => chain, then: (resolve) => resolve({ data: null, error: null }) };
          return chain;
        },
      };
    },
    rpc(name, params) {
      state.rpcs.push({ name, params });
      if (name.startsWith("connection_")) {
        // Production today: step 02 is not applied, so PostgREST reports the function as missing.
        if (!state.step02) {
          return Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
        }
        if (name === "connection_rotate_yahoo") return Promise.resolve({ data: state.rotateWins, error: null });
        return Promise.resolve({ data: "conn-uuid", error: null });
      }
      if (name === "vault_decrypt_secret") {
        return Promise.resolve({ data: { decrypted_secret: `${params.secret_id}-plain` }, error: null });
      }
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

function loadYahooAuth(rows = [], { step02 = false, rotateWins = true, refreshFails = false, otherProcessRefreshes = false, refreshedByOtherAfterRead = null } = {}) {
  const servicePath = require.resolve("../src/services/yahooAuth");
  delete require.cache[servicePath];

  const state = {
    rows: rows.map((row) => ({ ...row })),
    selects: [],
    upserts: [],
    updates: [],
    rpcs: [],
    step02,
    rotateWins,
    refreshFails,
    otherProcessRefreshes,
    refreshedByOtherAfterRead,
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
        refreshYahooToken: async (refreshToken) => {
          state.refreshedWith = refreshToken;
          state.refreshCalls = (state.refreshCalls || 0) + 1;
          await new Promise((resolve) => setImmediate(resolve));
          if (state.refreshFails) {
            if (state.otherProcessRefreshes) {
              Object.assign(state.rows[0], { token_expires_at: "2026-10-03T09:00:00+00:00", token_secret_id: "other-access-secret" });
            }
            throw new Error("yahoo refresh rejected");
          }
          return { access_token: "fresh-access", refresh_token: "fresh-refresh", expires_in: 3600 };
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
  const vaultRpcs = state.rpcs.filter((rpc) => rpc.name.startsWith("vault_"));
  assert.deepEqual(vaultRpcs.map((rpc) => rpc.name), [
    "vault_update_secret",
    "vault_update_secret",
  ]);
  assert.deepEqual(vaultRpcs.map((rpc) => rpc.params.secret_id), [
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

  const vaultRpcs = state.rpcs.filter((rpc) => rpc.name.startsWith("vault_"));
  assert.deepEqual(vaultRpcs.map((rpc) => rpc.name), [
    "vault_create_secret",
    "vault_create_secret",
  ]);
  assert.equal(vaultRpcs[0].params.name, "yahoo_access_user-2");
  assert.equal(vaultRpcs[1].params.name, "yahoo_refresh_user-2");
  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].payload.league_id, "new-league");
  assert.equal(state.upserts[0].payload.token_secret_id, "yahoo_access_user-2-id");
  assert.equal(state.upserts[0].payload.refresh_secret_id, "yahoo_refresh_user-2-id");
});

test("persistYahooTokens never writes a null league_id (platform_connections.league_id is NOT NULL)", async () => {
  const { service, state } = loadYahooAuth();

  await service.persistYahooTokens("user-3", {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
  });

  assert.equal(state.upserts.length, 1);
  assert.notEqual(state.upserts[0].payload.league_id, null);
  assert.equal(state.upserts[0].payload.league_id, "yahoo");
});

// Plan A0: Yahoo token writes go through redo step 02 once it is applied.
const EXPIRED_ROW = {
  user_id: "user-9",
  platform: "yahoo",
  league_id: "449.l.1",
  token_secret_id: "access-secret",
  refresh_secret_id: "refresh-secret",
  token_expires_at: "2026-10-01T00:00:00.123456+00:00",
};

test("persistYahooTokens stores through connection_store_yahoo when step 02 is present", async () => {
  const { service, state } = loadYahooAuth([], { step02: true });
  await service.persistYahooTokens("user-4", {
    access_token: "access-token", refresh_token: "refresh-token", expires_in: 3600, xoauth_yahoo_guid: "guid-4",
  }, "449.l.4");

  assert.deepEqual(state.rpcs.map((rpc) => rpc.name), ["connection_store_yahoo"]);
  const params = state.rpcs[0].params;
  assert.equal(params.p_user_id, "user-4");
  assert.equal(params.p_access_token, "access-token");
  assert.equal(params.p_refresh_token, "refresh-token");
  assert.equal(params.p_yahoo_guid, "guid-4");
  assert.equal(params.p_league_id, "449.l.4");
  assert.ok(!Number.isNaN(Date.parse(params.p_expires_at)));
  assert.equal(state.upserts.length, 0);
});

test("an expired Yahoo token is rotated by compare-and-swap on the expiry the request read", async () => {
  const { service, state } = loadYahooAuth([EXPIRED_ROW], { step02: true });
  const { accessToken } = await service.getAuthenticatedYahooClient("user-9");

  assert.equal(accessToken, "fresh-access");
  assert.equal(state.refreshedWith, "refresh-secret-plain");
  const rotate = state.rpcs.find((rpc) => rpc.name === "connection_rotate_yahoo");
  assert.equal(rotate.params.p_expected_expires_at, EXPIRED_ROW.token_expires_at);
  assert.equal(rotate.params.p_access_token, "fresh-access");
  assert.equal(rotate.params.p_refresh_token, "fresh-refresh");
  assert.equal(state.rpcs.some((rpc) => rpc.name === "vault_update_secret"), false);
  assert.equal(state.updates.length, 0);
});

test("a Yahoo refresh that loses the race writes nothing and still serves its own fresh token", async () => {
  const { service, state } = loadYahooAuth([EXPIRED_ROW], { step02: true, rotateWins: false });
  const { accessToken } = await service.getAuthenticatedYahooClient("user-9");

  assert.equal(accessToken, "fresh-access");
  assert.equal(state.rpcs.some((rpc) => rpc.name === "vault_update_secret"), false);
  assert.equal(state.updates.length, 0);
});

test("an expired Yahoo token keeps today's refresh writes while step 02 is not applied", async () => {
  const { service, state } = loadYahooAuth([EXPIRED_ROW]);
  const { accessToken } = await service.getAuthenticatedYahooClient("user-9");

  assert.equal(accessToken, "fresh-access");
  assert.deepEqual(
    state.rpcs.filter((rpc) => rpc.name === "vault_update_secret").map((rpc) => rpc.params.secret_id),
    ["access-secret", "refresh-secret"]
  );
  assert.equal(state.updates.length, 1);
});

test("concurrent requests for one expired Yahoo token share a single exchange with Yahoo (Codex, #525)", async () => {
  const { service, state } = loadYahooAuth([EXPIRED_ROW], { step02: true });
  const results = await Promise.all([
    service.getAuthenticatedYahooClient("user-9"),
    service.getAuthenticatedYahooClient("user-9"),
    service.getAuthenticatedYahooClient("user-9"),
  ]);

  assert.equal(state.refreshCalls, 1);
  assert.deepEqual(results.map((r) => r.accessToken), ["fresh-access", "fresh-access", "fresh-access"]);
  assert.equal(state.rpcs.filter((rpc) => rpc.name === "connection_rotate_yahoo").length, 1);
});

test("a Yahoo exchange that fails because another process refreshed first uses the token it stored", async () => {
  const { service, state } = loadYahooAuth([{ ...EXPIRED_ROW }], { step02: true, refreshFails: true, otherProcessRefreshes: true });
  const { accessToken } = await service.getAuthenticatedYahooClient("user-9");

  assert.equal(accessToken, "other-access-secret-plain");
  assert.equal(state.rpcs.some((rpc) => rpc.name === "connection_rotate_yahoo"), false);
});

test("a Yahoo exchange that fails with nobody else refreshing still fails, and writes nothing", async () => {
  const { service, state } = loadYahooAuth([{ ...EXPIRED_ROW }], { step02: true, refreshFails: true });
  await assert.rejects(service.getAuthenticatedYahooClient("user-9"), /yahoo refresh rejected/);
  assert.equal(state.rpcs.some((rpc) => rpc.name === "connection_rotate_yahoo"), false);
  assert.equal(state.updates.length, 0);
});

test("a request whose snapshot went stale while it waited uses the token another request stored, without a second exchange (Codex, #525)", async () => {
  // The row is read expired; before this request becomes the refresh leader, another request refreshes it.
  const { service, state } = loadYahooAuth([{ ...EXPIRED_ROW }], { step02: true, refreshedByOtherAfterRead: 1 });
  const { accessToken } = await service.getAuthenticatedYahooClient("user-9");

  assert.equal(accessToken, "other-access-secret-plain");
  assert.equal(state.refreshCalls || 0, 0);
  assert.equal(state.rpcs.some((rpc) => rpc.name === "connection_rotate_yahoo"), false);
});
