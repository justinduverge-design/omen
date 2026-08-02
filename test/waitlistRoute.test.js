"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function loadRouter(store) {
  const routePath = require.resolve("../src/routes/waitlist");
  delete require.cache[routePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@supabase/supabase-js" && parent?.filename === routePath) {
      return {
        createClient: () => ({
          from(table) {
            assert.equal(table, "waitlist_signups");
            return {
              insert: async (row) => { store.push({ ...row }); return { error: null }; },
              delete() {
                return {
                  eq: async (field, value) => {
                    assert.equal(field, "email");
                    store.splice(0, store.length, ...store.filter((row) => row.email !== value));
                    return { error: null };
                  },
                };
              },
            };
          },
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try { return require("../src/routes/waitlist"); }
  finally { Module._load = originalLoad; }
}

async function request(app, method, body) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/waitlist`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("DELETE /api/waitlist removes normalized matching signups and returns a privacy-safe envelope", async () => {
  const store = [{ email: "person@example.com", platform: "espn" }, { email: "other@example.com" }];
  const app = express();
  app.use(express.json());
  app.use("/api/waitlist", loadRouter(store));

  const response = await request(app, "DELETE", { email: " PERSON@EXAMPLE.COM " });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, message: "If that address was on the Omen waitlist, it has been removed." });
  assert.deepEqual(store, [{ email: "other@example.com" }]);
});

test("DELETE /api/waitlist rejects malformed email without querying storage", async () => {
  const store = [{ email: "person@example.com" }];
  const app = express();
  app.use(express.json());
  app.use("/api/waitlist", loadRouter(store));

  const response = await request(app, "DELETE", { email: "not-an-email" });
  assert.equal(response.status, 400);
  assert.deepEqual(store, [{ email: "person@example.com" }]);
});

test("waitlist email identifies the sender, postal address, and unsubscribe route", () => {
  const source = require("node:fs").readFileSync(require.resolve("../src/routes/waitlist"), "utf8");
  assert.match(source, /requested this promotional email/i);
  assert.match(source, /Valor Ventures Limited Liability Company/);
  assert.match(source, /23 Darrow St, New London, CT 06320/);
  assert.match(source, /https:\/\/slopssaloon\.com\/unsubscribe/);
});
