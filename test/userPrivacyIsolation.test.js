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
      const rows = this.store[this.table].filter((row) => this._matches(row));
      return { data: rows, error: null };
    }).then(resolve, reject);
  }
}

function makeFakeSupabase(store) {
  return {
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
    async rpc(_fn, _args) {
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
    oauth_state: [
      { user_id: "user-1", state: "state-1", platform: "yahoo" },
      { user_id: "user-2", state: "state-2", platform: "yahoo" },
    ],
    deletion_audit_log: [],
  };
}

function loadUserPrivacyRouter({ store, actingUserId = "user-1" } = {}) {
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

  // Cross-user leak assertions: user-2's data must not appear anywhere in the response.
  const serialized = JSON.stringify(res.body);
  assert.ok(!serialized.includes("user-2"));
  assert.ok(!serialized.includes("user2@example.com"));
  assert.ok(!serialized.includes("user-2-handle"));
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

test("DELETE /delete removes only the requesting user's rows, never another user's", async () => {
  const store = seedStore();
  const app = buildApp({ store, actingUserId: "user-1" });

  const res = await request(app, "/api/account/delete", {
    method: "DELETE",
    body: { confirmation: "DELETE MY OMEN DATA" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, true);

  // user-1's rows are gone from every user-owned table.
  assert.equal(store.moves.some((m) => m.user_id === "user-1"), false);
  assert.equal(store.platform_connections.some((c) => c.user_id === "user-1"), false);
  assert.equal(store.oauth_state.some((s) => s.user_id === "user-1"), false);
  assert.equal(store.consent_records.some((c) => c.user_id === "user-1"), false);
  assert.equal(store.users.some((u) => u.id === "user-1"), false);

  // user-2's rows are untouched.
  assert.equal(store.moves.some((m) => m.user_id === "user-2"), true);
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
