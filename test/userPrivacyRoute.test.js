"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DELETE_CONFIRMATION,
  redactPlatformConnection,
} = require("../src/routes/userPrivacy");

test("privacy export redacts raw tokens and Vault secret identifiers from platform rows", () => {
  const redacted = redactPlatformConnection({
    platform: "espn",
    platform_username: "coach",
    league_id: "123",
    espn_team_id: "7",
    is_active: true,
    token_expires_at: "2026-09-01T00:00:00.000Z",
    token_secret_id: "vault-token",
    refresh_secret_id: "vault-refresh",
    espn_secret_id: "vault-espn",
    swid_secret_id: "vault-swid",
  });

  assert.deepEqual(Object.keys(redacted).sort(), [
    "created_at",
    "espn_team_id",
    "is_active",
    "league_id",
    "platform",
    "platform_username",
    "token_expires_at",
    "updated_at",
  ].sort());
  assert.equal(redacted.token_secret_id, undefined);
  assert.equal(redacted.refresh_secret_id, undefined);
  assert.equal(redacted.espn_secret_id, undefined);
  assert.equal(redacted.swid_secret_id, undefined);
});

test("privacy deletion requires an explicit product-specific confirmation phrase", () => {
  assert.equal(DELETE_CONFIRMATION, "DELETE MY CORVUS DATA");
});
