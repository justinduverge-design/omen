"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { getOmenReadiness, isOmenReadyConnection } = require("../src/services/omenReadiness");

test("Omen readiness uses one provider-specific eligibility rule", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");

  assert.deepEqual(getOmenReadiness({ rows: [], now }), {
    available: false,
    mode: "free",
    status: "needs_platform",
  });
  assert.deepEqual(getOmenReadiness({
    rows: [{ platform: "sleeper", is_active: true, platform_username: "sleepy" }],
    now,
  }), {
    available: false,
    mode: "free",
    status: "pending_live_engine",
  });
  assert.deepEqual(getOmenReadiness({
    rows: [{
      platform: "espn",
      is_active: true,
      league_id: "12345",
      espn_secret_id: "opaque-secret-reference",
      swid_secret_id: "opaque-swid-reference",
    }],
    now,
  }), {
    available: true,
    mode: "free",
    status: "ready",
  });
  assert.deepEqual(getOmenReadiness({
    rows: [{
      platform: "yahoo",
      is_active: true,
      league_id: "449.l.123",
      token_secret_id: "opaque-token-reference",
      token_expires_at: "2026-09-30T12:00:00.000Z",
    }],
    now,
  }), {
    available: false,
    mode: "free",
    status: "pending_live_engine",
  });
  assert.equal(isOmenReadyConnection({
    platform: "sleeper",
    is_active: true,
    league_id: "sleeper-league",
    platform_username: "sleepy",
  }, now), true);
});

test("off-season overrides only an otherwise-ready Omen connection", () => {
  const readySleeper = {
    platform: "sleeper",
    is_active: true,
    league_id: "sleeper-league",
    platform_username: "sleepy",
  };

  assert.deepEqual(getOmenReadiness({ rows: [readySleeper], offSeason: true }), {
    available: false,
    mode: "free",
    status: "off_season",
  });
  assert.deepEqual(getOmenReadiness({
    rows: [{ platform: "sleeper", is_active: true, platform_username: "sleepy" }],
    offSeason: true,
  }), {
    available: false,
    mode: "free",
    status: "pending_live_engine",
  });
});
