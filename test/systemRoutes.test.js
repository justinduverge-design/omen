"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
process.env.LLM_BASE_URL = "http://ollama.internal:11434";
process.env.LLM_MODEL = "gemma3:4b";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  limit() {
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve({
      data: this.rows.filter((row) =>
        this.filters.every(({ field, value }) => row[field] === value)
      ),
      error: null,
    }).then(resolve, reject);
  }
}

function loadSystemRouter({
  authUser = { id: "test-user" },
  authError = null,
  rows = [],
} = {}) {
  const routePath = require.resolve("../src/routes/system");
  const omenPath = require.resolve("../src/services/omen");
  const systemContractsPath = require.resolve("../src/services/systemContracts");
  const llmPath = require.resolve("../src/services/llm");
  const configPath = require.resolve("../src/config");
  delete require.cache[routePath];
  delete require.cache[omenPath];
  delete require.cache[systemContractsPath];
  delete require.cache[llmPath];
  delete require.cache[configPath];

  const fakeSupabase = {
    auth: {
      getUser: async () => (
        authError
          ? { data: null, error: authError }
          : { data: { user: authUser }, error: null }
      ),
    },
    from(table) {
      assert.ok(["platform_connections", "users"].includes(table));
      return {
        select() {
          return new FakeQuery(rows);
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return { createClient: () => fakeSupabase };
    }
    if (request === "@supabase/supabase-js" && parent?.filename === omenPath) {
      return { createClient: () => fakeSupabase };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("../src/routes/system");
  } finally {
    Module._load = originalLoad;
  }
}

function buildApp(options = {}) {
  const app = express();
  app.use("/api", loadSystemRouter(options));
  app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
  });
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function request(app, path, options = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: options.headers,
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/health returns stable public health shape", async () => {
  const app = buildApp();
  const res = await request(app, "/api/health");

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "omen-api");
  assert.equal(res.body.contract_version, "system-health.v1");
  assert.equal(typeof res.body.uptime, "number");
});

test("GET /api/ready separates dependency readiness from health", async () => {
  const app = buildApp();
  const res = await request(app, "/api/ready");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "system-ready.v1");
  assert.equal(res.body.status, "ready");
  assert.equal(res.body.checks.supabase.status, "reachable");
  assert.equal(res.body.checks.critical_config.supabase_url, true);
  assert.equal(res.body.checks.optional_services.llm_private, true);
});

test("GET /api/version returns safe deploy metadata", async () => {
  const oldGithubSha = process.env.GITHUB_SHA;
  const oldGithubRunId = process.env.GITHUB_RUN_ID;
  process.env.GITHUB_SHA = "abc123";
  process.env.GITHUB_RUN_ID = "98765";

  try {
    const app = buildApp();
    const res = await request(app, "/api/version");

    assert.equal(res.status, 200);
    assert.equal(res.body.contract_version, "system-version.v1");
    assert.equal(res.body.service, "omen-api");
    assert.equal(res.body.package_name, "omen");
    assert.equal(res.body.package_version, "1.0.0");
    assert.equal(res.body.git_sha, "abc123");
    assert.equal(res.body.build_id, "98765");
    assert.equal(typeof res.body.generated_at, "string");

    const serialized = JSON.stringify(res.body).toLowerCase();
    assert.equal(serialized.includes("service_key"), false);
    assert.equal(serialized.includes("secret"), false);
  } finally {
    if (oldGithubSha == null) delete process.env.GITHUB_SHA;
    else process.env.GITHUB_SHA = oldGithubSha;
    if (oldGithubRunId == null) delete process.env.GITHUB_RUN_ID;
    else process.env.GITHUB_RUN_ID = oldGithubRunId;
  }
});

test("GET /api/session returns unauthenticated shell without auth", async () => {
  const app = buildApp();
  const res = await request(app, "/api/session");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    authenticated: false,
    user: null,
    contract_version: "session.v1",
  });
});

test("GET /api/session returns authenticated user for valid bearer token", async () => {
  const app = buildApp({
    authUser: { id: "user-123", email: "user@example.com" },
  });
  const res = await request(app, "/api/session", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    authenticated: true,
    user: {
      id: "user-123",
      email: "user@example.com",
    },
    contract_version: "session.v1",
  });
});

test("GET /api/session returns unauthenticated shell for invalid bearer token", async () => {
  const app = buildApp({ authError: new Error("bad token") });
  const res = await request(app, "/api/session", {
    headers: { authorization: "Bearer bad-token" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    authenticated: false,
    user: null,
    contract_version: "session.v1",
  });
});

test("GET /api/system/current-week returns public NFL week context", async () => {
  const app = buildApp();
  const res = await request(app, "/api/system/current-week");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "system-current-week.v1");
  assert.equal(typeof res.body.generated_at, "string");
  assert.equal(Number.isInteger(res.body.season), true);
  assert.equal(Number.isInteger(res.body.week), true);
  assert.equal(res.body.week >= 1 && res.body.week <= 18, true);
  assert.ok(["regular", "postseason"].includes(res.body.season_type));
});

test("GET /api/omen-of-the-week is retired without auth", async () => {
  const app = buildApp();
  const res = await request(app, "/api/omen-of-the-week");
  const previewRes = await request(app, "/api/omen-of-the-week?preview=mock");

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, {
    error: "Not found",
    path: "/api/omen-of-the-week",
  });
  assert.equal(previewRes.status, 404);
  assert.deepEqual(previewRes.body, {
    error: "Not found",
    path: "/api/omen-of-the-week",
  });
});

test("GET /api/omen-of-the-week is retired for authenticated users", async () => {
  const app = buildApp();
  const res = await request(app, "/api/omen-of-the-week", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, {
    error: "Not found",
    path: "/api/omen-of-the-week",
  });
});

test("GET /api/omen-of-the-week retirement does not expose connection data", async () => {
  const app = buildApp({
    rows: [
      {
        user_id: "test-user",
        platform: "sleeper",
        league_id: "league-1",
        platform_username: "sleepy",
        is_active: true,
        token_secret_id: "do-not-return",
      },
    ],
  });
  const res = await request(app, "/api/omen-of-the-week", {
    headers: { authorization: "Bearer valid-token" },
  });

  assert.equal(res.status, 404);
  assert.equal(JSON.stringify(res.body).includes("do-not-return"), false);
});

test("GET /api/omen-of-the-week stays retired for invalid authenticated requests", async () => {
  const app = buildApp({ authError: new Error("bad token") });
  const res = await request(app, "/api/omen-of-the-week", {
    headers: { authorization: "Bearer bad-token" },
  });

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, {
    error: "Not found",
    path: "/api/omen-of-the-week",
  });
});

test("GET /api/platform-status reports readiness without leaking LLM URL", async () => {
  const app = buildApp();
  const res = await request(app, "/api/platform-status");

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.dependencies.llm.status, "configured_private");
  assert.equal(res.body.dependencies.llm.public_url_exposed, false);
  assert.equal(res.body.endpoints.omen_of_the_week.method, "POST");
  assert.equal(res.body.endpoints.omen_of_the_week.path, "/api/omen/mvp-move");
  assert.equal(res.body.endpoints.omen_of_the_week.status, "mock_ready_live_auth_gated");
  assert.equal(res.body.endpoints.omen_of_the_week.note.includes("Pro subscription"), false);

  const serialized = JSON.stringify(res.body);
  assert.equal(serialized.includes("ollama.internal"), false);
  assert.equal(serialized.includes("11434"), false);
});

test("GET /api/platform-status reports public LLM URLs as misconfigured without leaking them", async () => {
  const oldBaseUrl = process.env.LLM_BASE_URL;
  process.env.LLM_BASE_URL = "https://ollama.example.com:11434";

  try {
    const app = buildApp();
    const statusRes = await request(app, "/api/platform-status");
    const readyRes = await request(app, "/api/ready");

    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.dependencies.llm.status, "misconfigured_public");
    assert.equal(statusRes.body.dependencies.llm.public_url_exposed, false);
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.body.checks.optional_services.llm_private, false);
    assert.equal(readyRes.body.checks.llm.status, "misconfigured_public");

    const serialized = JSON.stringify({ status: statusRes.body, ready: readyRes.body });
    assert.equal(serialized.includes("ollama.example.com"), false);
    assert.equal(serialized.includes("11434"), false);
  } finally {
    if (oldBaseUrl == null) delete process.env.LLM_BASE_URL;
    else process.env.LLM_BASE_URL = oldBaseUrl;
  }
});
