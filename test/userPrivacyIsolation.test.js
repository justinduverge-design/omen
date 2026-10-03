"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

// Real-filtering fake Supabase client: proves userPrivacy.js's export/consent/delete
// routes are scoped to the requesting user and never touch another user's row.
// F1 audit (2026-07-31) found the route code correctly scoped but untested at this
// isolation level — this closes that gap.
class FakeQuery {
  constructor(table, store) {
    this.table = table;
    this.store = store;
    this.filters = [];
    this.mode = "select";
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  _matches(row) {
    return this.filters.every(({ field, value }) => row[field] === value);
  }

  async maybeSingle() {
    const rows = this.store[this.table].filter((row) => this._matches(row));
    return { data: rows[0] || null, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => {
      if (this.mode === "delete") {
        const remaining = this.store[this.table].filter((row) => !this._matches(row));
        const removedCount = this.store[this.table].length - remaining.length;
        this.store[this.table] = remaining;
        return { data: null, error: null, count: removedCount };
      }
      if (this.store.__missingTables?.has(this.table)) {
        return { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
      }
      const rows = this.store[this.table].filter((row) => this._matches(row));
      return { data: rows, error: null };
    }).then(resolve, reject);
  }
}

function makeFakeSupabase(store) {
  const adminDeleteCalls = [];
  const rpcCalls = [];
  return {
    __adminDeleteCalls: adminDeleteCalls,
    auth: {
      admin: {
        async deleteUser(userId) {
          adminDeleteCalls.push(userId);
          return { error: null };
        },
      },
    },
    from(table) {
      return {
        select(_columns) {
          return new FakeQuery(table, store);
        },
        delete() {
          return new FakeQuery(table, store).delete();
        },
        async upsert(payload) {
          store[table] = store[table] || [];
          store[table].push({ ...payload });
          return { error: null };
        },
        async insert(payload) {
          store[table] = store[table] || [];
          store[table].push({ ...payload });
          return { error: null };
        },
      };
    },
    __rpcCalls: rpcCalls,
    async rpc(fn, args) {
      rpcCalls.push({ fn, args });
      if (fn === "account_erase") {
        // Production today: redo step 10 is not applied, so PostgREST reports the function as missing.
        if (!store.__accountErase) return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
        if (store.__accountErase.error) return { data: null, error: store.__accountErase.error };
        if (!store.users.some((u) => u.id === args.p_user_id)) return { data: { erased: false, reason: "no_such_user" }, error: null };
        for (const table of ["platform_connections", "moves", "consent_records", "oauth_state", "beta_reports"]) {
          store[table] = store[table].filter((row) => row.user_id !== args.p_user_id);
        }
        store.deletion_audit_log.push({ user_id_hash: "hash-from-function", method: args.p_method });
        store.users = store.users.filter((u) => u.id !== args.p_user_id);
        return { data: { erased: true }, error: null };
      }
      return { error: null };
    },
  };
}

function seedStore() {
  return {
    users: [
      { id: "user-1", email: "user1@example.com", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
      { id: "user-2", email: "user2@example.com", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    ],
    platform_connections: [
      { user_id: "user-1", platform: "sleeper", platform_username: "user-1-handle", league_id: "L1", is_active: true },
      { user_id: "user-2", platform: "sleeper", platform_username: "user-2-handle", league_id: "L2", is_active: true },
    ],
    consent_records: [
      { user_id: "user-1", consent_type: "analytics", granted: true },
      { user_id: "user-2", consent_type: "analytics", granted: true },
    ],
    moves: [
      { user_id: "user-1", id: "move-1", feature: "omen", move_type: "start_sit", created_at: "2026-01-01T00:00:00.000Z" },
      { user_id: "user-2", id: "move-2", feature: "omen", move_type: "waiver", created_at: "2026-01-01T00:00:00.000Z" },
    ],
    beta_reports: [
      {
        user_id: "user-1",
        id: "report-1",
        screen: "command_center",
        message: "owner report",
        app_version: "1.0",
        build: "100",
        os_version: "iOS 26.0",
        device_model: "iPhone",
        connection_state: "espn:connected",
        recent_error_codes: ["sample"],
        disclosure_accepted: true,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-01-31T00:00:00.000Z",
      },
      {
        user_id: "user-2",
        id: "report-2",
        screen: "trade",
        message: "other user report",
        app_version: "1.0",
        build: "100",
        os_version: "Android 17",
        device_model: "Pixel",
        connection_state: "sleeper:connected",
        recent_error_codes: ["other"],
        disclosure_accepted: true,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2026-01-31T00:00:00.000Z",
      },
    ],
    oauth_state: [
      { user_id: "user-1", state: "state-1", platform: "yahoo" },
      { user_id: "user-2", state: "state-2", platform: "yahoo" },
    ],
    saved_trades: [
      {
        user_id: "user-1", provider: "sleeper", provider_league_id: "L1", season: 2026, week: 5, provider_team_id: "3",
        candidate_id: "b1.find_x", trade: { give: { player_id: "4984" }, receive: { player_id: "6794" }, opponent_team_id: "7" },
        reasoning: { fills_need_for: "WR" }, state: "sent", outcome: "accepted", outcome_provenance: "self_reported",
        saved_at: "2026-10-01T00:00:00.000Z", sent_at: "2026-10-01T01:00:00.000Z", outcome_at: "2026-10-02T00:00:00.000Z",
      },
      {
        user_id: "user-2", provider: "sleeper", provider_league_id: "L2", season: 2026, week: 5, provider_team_id: null,
        candidate_id: "b2.find_y", trade: { give: { player_id: "1" }, receive: { player_id: "2" }, opponent_team_id: "4" },
        reasoning: {}, state: "saved", outcome: null, outcome_provenance: null,
        saved_at: "2026-10-01T00:00:00.000Z", sent_at: null, outcome_at: null,
      },
    ],
    deletion_audit_log: [],
  };
}

function loadUserPrivacyRouter({ store, actingUserId = "user-1", fakeOut } = {}) {
  const routePath = require.resolve("../src/routes/userPrivacy");
  delete require.cache[routePath];

  const fakeSupabase = makeFakeSupabase(store);
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: actingUserId };
          next();
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    if (fakeOut) fakeOut.client = fakeSupabase;
    return require("../src/routes/userPrivacy");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/account", loadUserPrivacyRouter(options));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path, { method = "GET", body } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /export returns only the requesting user's data, never another user's", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const res = await request(app, "/api/account/export");

  assert.equal(res.status, 200);
  assert.equal(res.body.user.id, "user-1");
  assert.equal(res.body.user.email, "user1@example.com");
  assert.deepEqual(res.body.platform_connections.map((c) => c.platform_username), ["user-1-handle"]);
  assert.deepEqual(res.body.consent_records.map((c) => c.user_id), ["user-1"]);
  assert.deepEqual(res.body.moves.map((m) => m.id), ["move-1"]);
  assert.deepEqual(res.body.beta_reports.map((r) => r.id), ["report-1"]);

  // Cross-user leak assertions: user-2's data must not appear anywhere in the response.
  const serialized = JSON.stringify(res.body);
  assert.ok(!serialized.includes("user-2"));
  assert.ok(!serialized.includes("user2@example.com"));
  assert.ok(!serialized.includes("user-2-handle"));
  assert.ok(!serialized.includes("other user report"));
});

test("POST /consent upserts a consent row scoped to the authenticated user, ignoring any body-supplied user id", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const res = await request(app, "/api/account/consent", {
    method: "POST",
    body: { consent_type: "marketing", granted: true, user_id: "user-2" },
  });

  assert.equal(res.status, 200);
  const inserted = store.consent_records.find((row) => row.consent_type === "marketing");
  assert.ok(inserted, "expected a new consent_records row");
  assert.equal(inserted.user_id, "user-1", "route must scope to req.user.id, not a client-supplied id");
});

test("POST /legal-acceptance records only the current 13+ final-v1 contract", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const invalid = await request(app, "/api/account/legal-acceptance", {
    method: "POST",
    body: { terms_version: "old", privacy_version: "old", minimum_age_confirmed: true },
  });
  assert.equal(invalid.status, 422);

  const accepted = await request(app, "/api/account/legal-acceptance", {
    method: "POST",
    body: { terms_version: "2026-08-02", privacy_version: "2026-08-02", minimum_age_confirmed: true },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.contract_version, "legal-acceptance.v1");
  assert.deepEqual(
    store.consent_records.filter((row) => row.user_id === "user-1").map((row) => row.consent_type).sort(),
    ["age_13_plus:2026-08-02", "analytics", "privacy_notice:2026-08-02", "terms_of_use:2026-08-02"],
  );
});

test("DELETE /delete removes only the requesting user's rows, never another user's", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const res = await request(app, "/api/account/delete", {
    method: "DELETE",
    body: { confirmation: "DELETE MY OMEN DATA" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, true);
  assert.equal(res.body.auth_identity_deleted, true);

  // user-1's rows are gone from every user-owned table.
  assert.equal(store.moves.some((m) => m.user_id === "user-1"), false);
  assert.equal(store.beta_reports.some((r) => r.user_id === "user-1"), false);
  assert.equal(store.platform_connections.some((c) => c.user_id === "user-1"), false);
  assert.equal(store.oauth_state.some((s) => s.user_id === "user-1"), false);
  assert.equal(store.consent_records.some((c) => c.user_id === "user-1"), false, "account deletion wipes everything including consent records");
  assert.equal(store.users.some((u) => u.id === "user-1"), false);

  // user-2's rows are untouched.
  assert.equal(store.moves.some((m) => m.user_id === "user-2"), true);
  assert.equal(store.beta_reports.some((r) => r.user_id === "user-2"), true);
  assert.equal(store.platform_connections.some((c) => c.user_id === "user-2"), true);
  assert.equal(store.oauth_state.some((s) => s.user_id === "user-2"), true);
  assert.equal(store.consent_records.some((c) => c.user_id === "user-2"), true);
  assert.equal(store.users.some((u) => u.id === "user-2"), true);
});

test("DELETE /delete rejects a mismatched confirmation phrase without touching any row", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const res = await request(app, "/api/account/delete", {
    method: "DELETE",
    body: { confirmation: "delete my omen data" },
  });

  assert.equal(res.status, 400);
  assert.equal(store.users.some((u) => u.id === "user-1"), true);
});

// Redo step 12: saved trades are part of the person's export (and cascade with the users row on erase).
test("GET /export includes only the requesting user's saved trades", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });
  const res = await request(app, "/api/account/export");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.saved_trades.map((t) => t.candidate_id), ["b1.find_x"]);
});

test("GET /export returns an empty saved_trades list while step 12 is not applied", async () => {
  const store = seedStore();
  store.__missingTables = new Set(["saved_trades"]);
  const app = buildApp({ store, actingUserId: "user-1" });
  const res = await request(app, "/api/account/export");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.saved_trades, []);
});

// Plan A1: once redo steps 05 and 10 are applied, deletion is one transaction in account_erase().
// Until then the route keeps today's table-by-table path.
const CONFIRM = { confirmation: "DELETE MY OMEN DATA" };

test("DELETE /delete erases through account_erase() in one call when the function exists", async () => {
  const store = seedStore();
  store.__accountErase = {};
  const fakeOut = {};
  const app = buildApp({ store, actingUserId: "user-1", fakeOut });

  const res = await request(app, "/api/account/delete", { method: "DELETE", body: CONFIRM });

  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, true);
  assert.equal(res.body.auth_identity_deleted, true);
  assert.deepEqual(fakeOut.client.__rpcCalls, [{ fn: "account_erase", args: { p_user_id: "user-1", p_method: "user_requested" } }]);
  assert.deepEqual(fakeOut.client.__adminDeleteCalls, ["user-1"]);
  assert.equal(store.deletion_audit_log.length, 1, "the function writes the audit row; the route must not write a second");
  assert.equal(store.users.some((u) => u.id === "user-1"), false);
  assert.equal(store.users.some((u) => u.id === "user-2"), true);
  assert.equal(store.moves.some((m) => m.user_id === "user-2"), true);
});

test("DELETE /delete keeps today's path while account_erase() is not applied", async () => {
  const store = seedStore();
  const fakeOut = {};
  const app = buildApp({ store, actingUserId: "user-1", fakeOut });

  const res = await request(app, "/api/account/delete", { method: "DELETE", body: CONFIRM });

  assert.equal(res.status, 200);
  assert.equal(fakeOut.client.__rpcCalls[0].fn, "account_erase");
  assert.equal(store.users.some((u) => u.id === "user-1"), false);
  assert.equal(store.moves.some((m) => m.user_id === "user-1"), false);
  assert.equal(store.deletion_audit_log.length, 1);
});

test("DELETE /delete fails without touching anything, and keeps the sign-in, when account_erase() refuses", async () => {
  const store = seedStore();
  store.__accountErase = { error: { code: "P0001", message: "account_erase: 1 of 2 secrets found; refusing to erase a partial account" } };
  const fakeOut = {};
  const app = buildApp({ store, actingUserId: "user-1", fakeOut });

  const res = await request(app, "/api/account/delete", { method: "DELETE", body: CONFIRM });

  assert.equal(res.status, 500);
  assert.deepEqual(fakeOut.client.__adminDeleteCalls, []);
  assert.equal(store.users.some((u) => u.id === "user-1"), true);
  assert.equal(store.moves.some((m) => m.user_id === "user-1"), true);
  assert.equal(store.deletion_audit_log.length, 0);
});

test("DELETE /delete with no app user row clears the sign-in's own rows before recording the deletion (Codex, #526)", async () => {
  const store = seedStore();
  store.__accountErase = {};
  // A sign-in that accepted the legal terms but never got an app user row: consent and OAuth state only.
  store.users = store.users.filter((u) => u.id !== "user-1");
  for (const table of ["moves", "beta_reports", "platform_connections"]) {
    store[table] = store[table].filter((row) => row.user_id !== "user-1");
  }
  const fakeOut = {};
  const app = buildApp({ store, actingUserId: "user-1", fakeOut });

  const res = await request(app, "/api/account/delete", { method: "DELETE", body: CONFIRM });

  assert.equal(res.status, 200);
  assert.equal(store.consent_records.some((c) => c.user_id === "user-1"), false);
  assert.equal(store.oauth_state.some((s) => s.user_id === "user-1"), false);
  assert.equal(store.consent_records.some((c) => c.user_id === "user-2"), true);
  assert.deepEqual(fakeOut.client.__adminDeleteCalls, ["user-1"]);
  assert.equal(store.deletion_audit_log.length, 1);
});
