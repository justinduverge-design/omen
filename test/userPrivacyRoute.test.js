"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DELETE_CONFIRMATION,
  LEGACY_DELETE_CONFIRMATION,
  isDeleteConfirmed,
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
  assert.equal(DELETE_CONFIRMATION, "delete");
});

test("account deletion accepts the short phrase however a phone capitalizes it", () => {
  // Shortened from "DELETE MY OMEN DATA" on 2026-09-03. Autocapitalize makes "Delete" the
  // likeliest thing typed on a phone, and a trailing space is one fat-finger away; failing a
  // user there protects nothing. The guardrail is that a word is typed at all.
  for (const accepted of ["delete", "Delete", "DELETE", "  delete  "]) {
    assert.equal(isDeleteConfirmed(accepted), true, `should accept ${JSON.stringify(accepted)}`);
  }
  for (const rejected of ["", "   ", "del", "delete my account", "remove", null, undefined]) {
    assert.equal(isDeleteConfirmed(rejected), false, `should reject ${JSON.stringify(rejected)}`);
  }
});

test("account deletion still accepts the legacy phrase shipped clients send", () => {
  // **Do not delete this test to tidy up.** Every already-installed app and the deployed web
  // bundle send the old phrase, and this is the App Store 5.1.1 deletion path — a window where
  // a stale client cannot delete their own account is worse than a long phrase ever was.
  // Retire the legacy branch only once no shipped client sends it.
  assert.equal(LEGACY_DELETE_CONFIRMATION, "DELETE MY OMEN DATA");
  assert.equal(isDeleteConfirmed("DELETE MY OMEN DATA"), true);
});
