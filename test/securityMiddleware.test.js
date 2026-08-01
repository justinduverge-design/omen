"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const {
  PERMISSIONS_POLICY,
  permissionsPolicyMiddleware,
} = require("../src/middleware/security");

test("permissions policy disables browser capabilities Omen does not use", () => {
  const headers = new Map();
  let nextCalled = false;

  permissionsPolicyMiddleware({}, {
    setHeader(name, value) {
      headers.set(name, value);
    },
  }, () => {
    nextCalled = true;
  });

  assert.equal(headers.get("Permissions-Policy"), PERMISSIONS_POLICY);
  assert.match(PERMISSIONS_POLICY, /camera=\(\)/);
  assert.match(PERMISSIONS_POLICY, /microphone=\(\)/);
  assert.match(PERMISSIONS_POLICY, /geolocation=\(\)/);
  assert.equal(nextCalled, true);
});
