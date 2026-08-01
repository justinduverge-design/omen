"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

// Real-filtering fake, unlike espnRoute.test.js's unconditional-return mock, to prove
// GET /roster's .eq("user_id", ...).eq("platform", "espn") actually excludes another
// user's platform_connections row rather than merely being present in the source.
// F1 audit (2026-07-31) found the route code correctly scoped but untested at this
// isolation level — this closes that gap.
const CONNECTIONS = [
  { user_id: "user-1", platform: "espn", espn_secret_id: "secret-espn-user1", swid_secret_id: "swid-user1", league_id: "L1" },
  { user_id: "user-2", platform: "espn", espn_secret_id: "secret-espn-user2", swid_secret_id: "swid-user2", league_id: "L2" },
];

const VAULT_VALUES = {
  "secret-espn-user1": "decrypted-s2-user1",
  "swid-user1": "decrypted-swid-user1",
  "secret-espn-user2": "decrypted-s2-user2",
  "swid-user2": "decrypted-swid-user2",
};

function loadEspnRouter({ actingUserId, capturedRosterCalls }) {
  const routePath = require.resolve("../src/routes/espn");
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return {
        createClient: () => ({
          from: (table) => ({
            select: (_cols) => ({
              eq(field1, value1) {
                return {
                  eq(field2, value2) {
                    return {
                      async maybeSingle() {
                        assert.equal(table, "platform_connections");
                        const row = CONNECTIONS.find(
                          (c) => c[field1] === value1 && c[field2] === value2
                        );
                        return { data: row || null, error: null };
                      },
                    };
                  },
                };
              },
            }),
          }),
          rpc: async (_fn, args) => ({
            data: { decrypted_secret: VAULT_VALUES[args.secret_id] || null },
            error: null,
          }),
        }),
      };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: actingUserId };
          next();
        },
      };
    }
    if (request === "../adapters/espn" && parent?.filename === routePath) {
      return {
        buildNormalizedRoster: async (leagueId, espnS2, swid, week) => {
          capturedRosterCalls.push({ leagueId, espnS2, swid, week });
          return { source: "espn", week, league_key: String(leagueId), slots: { starters: [], bench: [], ir: [] } };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/espn");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/api/espn", loadEspnRouter(options));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /roster decrypts only the requesting user's own ESPN secrets, never another user's", async () => {
  const capturedRosterCalls = [];
  const app = buildApp({ actingUserId: "user-1", capturedRosterCalls });

  const res = await request(app, "/api/espn/roster?leagueId=12345&week=1");

  assert.equal(res.status, 200);
  assert.equal(capturedRosterCalls.length, 1);
  assert.equal(capturedRosterCalls[0].espnS2, "decrypted-s2-user1");
  assert.equal(capturedRosterCalls[0].swid, "decrypted-swid-user1");
  assert.notEqual(capturedRosterCalls[0].espnS2, "decrypted-s2-user2");
  assert.notEqual(capturedRosterCalls[0].swid, "decrypted-swid-user2");
});

test("GET /roster for a different user resolves that user's own connection, not the first row in the table", async () => {
  const capturedRosterCalls = [];
  const app = buildApp({ actingUserId: "user-2", capturedRosterCalls });

  const res = await request(app, "/api/espn/roster?leagueId=99999&week=2");

  assert.equal(res.status, 200);
  assert.equal(capturedRosterCalls[0].espnS2, "decrypted-s2-user2");
  assert.equal(capturedRosterCalls[0].swid, "decrypted-swid-user2");
});

test("GET /roster returns 401 for a user with no ESPN connection, without falling back to another user's row", async () => {
  const capturedRosterCalls = [];
  const app = buildApp({ actingUserId: "user-with-no-connection", capturedRosterCalls });

  const res = await request(app, "/api/espn/roster?leagueId=12345&week=1");

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "ESPN not connected");
  assert.equal(capturedRosterCalls.length, 0);
});
