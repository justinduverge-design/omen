"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const { accessLogFormat, safeRequestPath } = require("../src/middleware/logging");

test("access logging keeps the route but strips OAuth query parameters", () => {
  const path = safeRequestPath({
    originalUrl: "/api/yahoo/callback?code=authorization-code&state=csrf-state&error=invalid_scope",
  });

  assert.equal(path, "/api/yahoo/callback");
});

test("production access logging omits OAuth query parameters and referrers", () => {
  const tokens = {
    "remote-addr": () => "203.0.113.42",
    date: () => "24/Jul/2026:12:00:00 +0000",
    method: () => "GET",
    "http-version": () => "1.1",
    status: () => "302",
    res: () => "0",
    "response-time": () => "4.2",
  };
  const line = accessLogFormat(tokens, {
    originalUrl: "/api/yahoo/callback?code=authorization-code&state=csrf-state",
    headers: { referer: "https://provider.example/callback?code=other-code" },
  }, {});

  assert.match(line, /GET \/api\/yahoo\/callback HTTP\/1\.1/);
  assert.equal(line.includes("authorization-code"), false);
  assert.equal(line.includes("csrf-state"), false);
  assert.equal(line.includes("other-code"), false);
});
