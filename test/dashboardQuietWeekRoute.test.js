"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const Module = require("node:module");

function fakeSupabase() {
  return {
    from() {
      return {
        select() { return this; },
        eq() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  };
}

function loadDashboardRouter({ liveBody }) {
  const routePath = require.resolve("../src/routes/dashboard");
  const omenPath = require.resolve("../src/services/omen");
  delete require.cache[routePath];
  require.cache[omenPath] = {
    id: omenPath,
    filename: omenPath,
    loaded: true,
    exports: {
      buildLiveOmenMvpMoveForUser: async (userId, options) => {
        assert.equal(userId, "user-1");
        assert.equal(options.contextId, "ctx-1");
        return { status: 200, body: liveBody };
      },
    },
  };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../config") {
      return { supabaseUrl: "https://example.supabase.co", supabaseServiceKey: "service-key" };
    }
    if (request === "@supabase/supabase-js") {
      return { createClient: () => fakeSupabase() };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "user-1" };
          next();
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("../src/routes/dashboard");
  } finally {
    Module._load = originalLoad;
  }
}

async function get(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return { status: res.status, body: await res.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/dashboard/quiet-week returns the negotiated quiet-week contract", async () => {
  const liveBody = {
    state: "empty",
    platform: { name: "espn", status: "connected" },
    league: { id: "league-1" },
    quiet_inputs: { injured_starter: false },
    signals: { roster: { status: "live" } },
  };
  const app = express();
  app.use("/api/dashboard", loadDashboardRouter({ liveBody }));

  const res = await get(app, "/api/dashboard/quiet-week?context_id=ctx-1");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "quiet-week.v1");
  assert.equal(res.body.eligible, true);
  assert.equal(res.body.variant, "straight");
  assert.deepEqual(res.body.reasons, ["recent_result_unknown"]);
});

test("GET /api/dashboard/quiet-week rejects overlong context ids before live generation", async () => {
  const app = express();
  app.use("/api/dashboard", loadDashboardRouter({ liveBody: { state: "empty" } }));

  const res = await get(app, `/api/dashboard/quiet-week?context_id=${"x".repeat(129)}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_context_id");
});
