"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function liveEnvelope() {
  return {
    state: "success",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_test",
    generated_at: "2026-05-25T00:00:00.000Z",
    platform: { name: "yahoo", status: "connected", recovery: null },
    league: { id: "414.l.12345", name: null, season: 2026, week: 8, scoring_format: "ppr" },
    team: { id: "414.t.7", name: null },
    signals: {
      roster: { status: "live", used: true, source: "yahoo_roster", message: "Roster imported." },
    },
    recommendation: {
      type: "start_sit",
      title: "Start Bench Breakout over Starter Wideout",
      confidence: { score: 82, label: "medium_high", rationale: "Live edge." },
      risk: { level: "low", reasons: ["Live route test."] },
      explanation: {
        summary: "Start Bench Breakout.",
        why_it_matters: "Live route test.",
        risk: "Low.",
        confidence: "82 out of 100.",
        data_used: ["Yahoo roster"],
      },
    },
    alternatives: [],
    warnings: [],
  };
}

function authEnvelope(message = "Missing bearer token") {
  return {
    state: "error",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_auth",
    generated_at: "2026-05-25T00:00:00.000Z",
    platform: {
      name: "unknown",
      status: "auth_required",
      recovery: { code: "sign_in", message, cta: "Sign In" },
    },
    league: null,
    team: null,
    signals: {
      roster: {
        status: "unavailable",
        used: false,
        source: "platform_adapter",
        message,
      },
    },
    recommendation: null,
    alternatives: [],
    warnings: [],
    error: { code: "omen_auth_required", message, retryable: false },
  };
}


function loadOmenRouter() {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];

  const state = {
    authHeaders: [],
    llmPayloads: [],
    liveUserIds: [],
  };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../services/omen" && parent?.filename === routePath) {
      return {
        authenticateOmenRequest: async (authHeader) => {
          state.authHeaders.push(authHeader || null);
          if (authHeader !== "Bearer valid-token") {
            throw Object.assign(new Error("Missing bearer token"), { status: 401 });
          }
          return { id: "user-1" };
        },
        authRequiredMvpResponse: (message) => ({ status: 401, body: authEnvelope(message) }),
        buildLiveOmenMvpMoveForUser: async (userId) => {
          state.liveUserIds.push(userId);
          return { status: 200, body: liveEnvelope() };
        },
        buildOmenMvpMoveResponse: () => ({ status: 200, body: liveEnvelope() }),
      };
    }
    if (request === "../services/llm" && parent?.filename === routePath) {
      return {
        explainOmenMvpMove: async (payload) => {
          state.llmPayloads.push(payload);
          return {
            summary: "Live Gemma says this is the move.",
            why_it_matters: "It adds value without changing the rest of the roster.",
            risk: "The risk is low.",
            confidence: "Confidence is 82 out of 100.",
            data_used: ["Yahoo roster"],
          };
        },
      };
    }
    if (request === "../services/matchupService" && parent?.filename === routePath) {
      return { getDvpContext: async () => null };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return { router: require("../src/routes/omen"), state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options) {
  const app = express();
  const loaded = loadOmenRouter(options);
  app.use(express.json());
  app.use("/api/omen", loaded.router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state: loaded.state };
}

async function post(app, { headers = {}, body = {} } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/omen/mvp-move`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/omen/mvp-move requires auth for live requests", async () => {
  const { app, state } = buildApp();
  const res = await post(app);

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "omen_auth_required");
  assert.deepEqual(state.liveUserIds, []);
});


test("POST /api/omen/mvp-move returns live Omen MVP envelope for authorized users", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: false, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.equal(res.body.feature, "omen_mvp_move");
  assert.equal(res.body.mode, "live");
  assert.equal(res.body.platform.name, "yahoo");
  assert.equal(res.body.recommendation.type, "start_sit");
  assert.deepEqual(state.liveUserIds, ["user-1"]);
});

test("POST /api/omen/mvp-move skips LLM by default for live empty-body requests", async () => {
  const { app, state } = buildApp();
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.state, "success");
  assert.deepEqual(state.llmPayloads, []);
});

test("POST /api/omen/mvp-move allows explicit live LLM opt-in", async () => {
  const { app, state } = buildApp({ subscribed: true });
  const res = await post(app, {
    headers: { authorization: "Bearer valid-token" },
    body: { include_signals: { llm_reasoning: true, matchup_dvp: false } },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.recommendation.explanation.summary, "Live Gemma says this is the move.");
  assert.equal(state.llmPayloads.length, 1);
  assert.equal(state.llmPayloads[0].state, "success");
});
