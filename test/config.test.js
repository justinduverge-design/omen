"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

function restoreEnv(previous) {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function loadConfigWithBilling(value, legacyValue) {
  const configPath = require.resolve("../src/config");
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    OMEN_BILLING_ENABLED: process.env.OMEN_BILLING_ENABLED,
    CORVUS_BILLING_ENABLED: process.env.CORVUS_BILLING_ENABLED,
  };

  delete require.cache[configPath];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "test-service-key";
  if (value === undefined) delete process.env.OMEN_BILLING_ENABLED;
  else process.env.OMEN_BILLING_ENABLED = value;
  if (legacyValue === undefined) delete process.env.CORVUS_BILLING_ENABLED;
  else process.env.CORVUS_BILLING_ENABLED = legacyValue;

  try {
    return require("../src/config");
  } finally {
    delete require.cache[configPath];
    restoreEnv(previous);
  }
}

test("billing config defaults disabled when OMEN_BILLING_ENABLED is unset", () => {
  const config = loadConfigWithBilling(undefined);

  assert.deepEqual(config.billing, { enabled: false });
});

test("billing config enables only when OMEN_BILLING_ENABLED is true", () => {
  assert.equal(loadConfigWithBilling("true").billing.enabled, true);
  assert.equal(loadConfigWithBilling("false").billing.enabled, false);
});

test("billing config accepts legacy CORVUS_BILLING_ENABLED fallback", () => {
  assert.equal(loadConfigWithBilling(undefined, "true").billing.enabled, true);
});
