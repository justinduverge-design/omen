"use strict";

/**
 * Tier-2 endpoint smoke test.
 *
 * Usage:
 *   CORVUS_BASE_URL=https://slopssaloon.com `
 *   CORVUS_AUTH_TOKEN=<supabase-access-token> `
 *   CORVUS_TIER2_WRITE=1 `
 *   CORVUS_TIER2_CLEANUP=1 `
 *   node scripts/smoke-tier2-endpoints.js
 *
 * Notes:
 * - The token is only read from the current process environment.
 * - The token is never printed.
 * - Write checks are opt-in with CORVUS_TIER2_WRITE=1.
 * - Preference writes are restored to the prior dashboard value.
 * - Feedback writes are idempotent for user + season + week. Use a test
 *   account when running against production.
 * - Cleanup mode rewrites the same smoke row to followed=false, stars=null,
 *   and a cleanup note after Move History has verified the row.
 */

const baseUrl = (process.env.CORVUS_BASE_URL || "https://slopssaloon.com").replace(/\/$/, "");
const authToken = process.env.CORVUS_AUTH_TOKEN || "";
const writeMode = process.env.CORVUS_TIER2_WRITE === "1";
const cleanupMode = process.env.CORVUS_TIER2_CLEANUP === "1";
const allowAuthSkips = process.env.CORVUS_ALLOW_AUTH_SKIPS === "1";
const expectConnectedLeague = process.env.CORVUS_EXPECT_CONNECTED_LEAGUE !== "0";
const feedbackSeason = parseInt(process.env.CORVUS_TIER2_FEEDBACK_SEASON || "2099", 10);
const feedbackWeek = parseInt(process.env.CORVUS_TIER2_FEEDBACK_WEEK || "1", 10);

const results = [];

function result(name, status, details = {}) {
  results.push({ name, status, ...details });
}

function pass(name, details = {}) {
  result(name, "pass", details);
}

function fail(name, details = {}) {
  result(name, "fail", details);
}

function skip(name, reason) {
  result(name, "skip", { reason });
}

function safeBodyShape(body) {
  if (!body || typeof body !== "object") return { type: typeof body };
  return {
    keys: Object.keys(body).sort(),
    contract_version: body.contract_version || null,
    code: body.code || null,
    error: body.error || null,
  };
}

async function request(name, method, path, { body, auth = false } = {}) {
  const started = performance.now();
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && authToken) headers.authorization = `Bearer ${authToken}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const parsed = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  return {
    name,
    method,
    path,
    status: res.status,
    ok: res.ok,
    elapsed_ms: Math.round(performance.now() - started),
    body: parsed,
  };
}

function requireToken(name) {
  if (authToken) return true;
  skip(name, "CORVUS_AUTH_TOKEN missing");
  return false;
}

async function smokeStripePrices() {
  const res = await request("stripe_prices", "GET", "/api/stripe/prices");
  const plans = Array.isArray(res.body?.plans) ? res.body.plans : [];
  const monthly = plans.find((plan) => plan.id === "monthly");
  const season = plans.find((plan) => plan.id === "season");
  const configured = plans.every((plan) => plan.stripe_price_id_configured === true);
  const priced = plans.every((plan) => plan.price?.display);

  if (
    res.status === 200
    && res.body?.contract_version === "stripe-prices.v1"
    && monthly
    && season
    && configured
    && priced
  ) {
    pass("stripe_prices", {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      source: res.body.source,
      displays: plans.map((plan) => ({ id: plan.id, display: plan.price.display })),
    });
    return;
  }

  fail("stripe_prices", {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
    plan_count: plans.length,
    configured,
    priced,
  });
}

async function smokeAuthGuards() {
  const checks = [
    request("preferences_auth_guard", "PATCH", "/api/account/preferences", {
      body: { favorite_team: "KC" },
    }),
    request("feedback_auth_guard", "POST", "/api/omen/feedback", {
      body: { followed: true, stars: 5, note: "auth guard smoke", week: 1, season: 2099 },
    }),
    request("moves_auth_guard", "GET", "/api/moves"),
    request("standings_auth_guard", "GET", "/api/league/standings"),
  ];

  const responses = await Promise.all(checks);
  for (const res of responses) {
    if (res.status === 401) {
      pass(res.name, { status_code: res.status, elapsed_ms: res.elapsed_ms });
    } else {
      fail(res.name, {
        status_code: res.status,
        elapsed_ms: res.elapsed_ms,
        shape: safeBodyShape(res.body),
      });
    }
  }
}

async function getDashboardSummary(name) {
  const res = await request(name, "GET", "/api/dashboard/summary", { auth: true });
  if (res.status !== 200 || res.body?.contract_version !== "dashboard-summary.v1") {
    fail(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      shape: safeBodyShape(res.body),
    });
    return null;
  }
  pass(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    favorite_team_present: Object.prototype.hasOwnProperty.call(res.body?.user || {}, "favorite_team"),
  });
  return res.body;
}

async function patchPreference(name, favoriteTeam) {
  const res = await request(name, "PATCH", "/api/account/preferences", {
    auth: true,
    body: { favorite_team: favoriteTeam },
  });

  if (res.status === 200 && res.body?.updated === true && res.body.favorite_team === favoriteTeam) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      favorite_team: res.body.favorite_team,
    });
    return true;
  }

  fail(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
  });
  return false;
}

async function smokePreferences() {
  const name = "account_preferences";
  if (!requireToken(name)) return;
  if (!writeMode) {
    skip(name, "CORVUS_TIER2_WRITE not set; skipping production write");
    return;
  }

  const before = await getDashboardSummary("dashboard_summary_before_preference");
  if (!before) return;

  const originalFavorite = before.user?.favorite_team ?? null;
  const smokeFavorite = originalFavorite === "BAL" ? "KC" : "BAL";

  const patched = await patchPreference("account_preferences_patch", smokeFavorite);
  if (!patched) return;

  const afterPatch = await getDashboardSummary("dashboard_summary_after_preference");
  if (afterPatch?.user?.favorite_team === smokeFavorite) {
    pass("account_preferences_rehydrated", { favorite_team: smokeFavorite });
  } else {
    fail("account_preferences_rehydrated", {
      expected: smokeFavorite,
      actual: afterPatch?.user?.favorite_team ?? null,
    });
  }

  const restored = await patchPreference("account_preferences_restore", originalFavorite);
  if (!restored) {
    fail("account_preferences_restore_warning", {
      message: "Preference smoke changed the favorite team and restore failed.",
      original_favorite_team: originalFavorite,
    });
  }
}

async function smokeFeedback() {
  const name = "omen_feedback";
  if (!requireToken(name)) return;
  if (!writeMode) {
    skip(name, "CORVUS_TIER2_WRITE not set; skipping production write");
    return;
  }
  if (!Number.isInteger(feedbackSeason) || !Number.isInteger(feedbackWeek)) {
    fail(name, {
      message: "CORVUS_TIER2_FEEDBACK_SEASON and CORVUS_TIER2_FEEDBACK_WEEK must be integers",
    });
    return;
  }

  const res = await request(name, "POST", "/api/omen/feedback", {
    auth: true,
    body: {
      followed: true,
      stars: 5,
      note: `Corvus Tier-2 smoke ${new Date().toISOString()}`,
      week: feedbackWeek,
      season: feedbackSeason,
    },
  });

  if (res.status === 200 && res.body?.recorded === true && res.body.move_id) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      season: feedbackSeason,
      week: feedbackWeek,
      move_id_present: true,
    });
    return res.body.move_id;
  }

  fail(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
  });
  return null;
}

async function cleanupFeedback({ expectedMoveId } = {}) {
  const name = "omen_feedback_cleanup";
  if (!expectedMoveId) {
    skip(name, "No smoke move id returned; cleanup not attempted");
    return;
  }
  if (!cleanupMode) {
    skip(name, "CORVUS_TIER2_CLEANUP not set; leaving idempotent season/week smoke row");
    return;
  }

  const res = await request(name, "POST", "/api/omen/feedback", {
    auth: true,
    body: {
      followed: false,
      stars: null,
      note: `Corvus Tier-2 smoke cleanup ${new Date().toISOString()}`,
      week: feedbackWeek,
      season: feedbackSeason,
    },
  });

  if (res.status === 200 && res.body?.recorded === true && res.body.move_id === expectedMoveId) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      season: feedbackSeason,
      week: feedbackWeek,
      same_move_id: true,
    });
    return;
  }

  fail(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
  });
}

async function smokeMoves({ expectedMoveId } = {}) {
  const name = "moves_history";
  if (!requireToken(name)) return;

  const path = expectedMoveId
    ? `/api/moves?season=${feedbackSeason}&limit=5`
    : "/api/moves?limit=5";
  const res = await request(name, "GET", path, { auth: true });
  const moves = Array.isArray(res.body?.moves) ? res.body.moves : [];
  const expectedMoveFound = expectedMoveId
    ? moves.some((move) => move.id === expectedMoveId)
    : undefined;

  if (
    res.status === 200
    && res.body?.contract_version === "moves-history.v1"
    && res.body?.summary
    && Array.isArray(res.body.moves)
    && (!expectedMoveId || expectedMoveFound)
  ) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      season: res.body.season,
      total_count: res.body.summary.total_count,
      returned_count: moves.length,
      expected_move_found: expectedMoveFound,
    });
    return;
  }

  fail(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
    expected_move_found: expectedMoveFound,
  });
}

async function smokeStandings() {
  const name = "league_standings";
  if (!requireToken(name)) return;

  const res = await request(name, "GET", "/api/league/standings", { auth: true });
  if (
    res.status === 200
    && res.body?.contract_version === "league-standings.v1"
    && Array.isArray(res.body.standings)
  ) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      platform: res.body.platform,
      league_id_present: Boolean(res.body.league_id),
      standings_count: res.body.standings.length,
    });
    return;
  }

  const safeNoLeague = !expectConnectedLeague
    && res.status === 404
    && res.body?.code === "league_not_connected";

  if (safeNoLeague) {
    pass(name, {
      status_code: res.status,
      elapsed_ms: res.elapsed_ms,
      code: res.body.code,
      note: "No connected league expected for this auth token.",
    });
    return;
  }

  fail(name, {
    status_code: res.status,
    elapsed_ms: res.elapsed_ms,
    shape: safeBodyShape(res.body),
  });
}

async function main() {
  await smokeStripePrices();
  await smokeAuthGuards();

  if (!authToken && !allowAuthSkips) {
    fail("authenticated_smoke_blocked", {
      message: "Set CORVUS_AUTH_TOKEN or CORVUS_ALLOW_AUTH_SKIPS=1.",
    });
  }

  await smokePreferences();
  const moveId = await smokeFeedback();
  await smokeMoves({ expectedMoveId: moveId });
  await cleanupFeedback({ expectedMoveId: moveId });
  await smokeStandings();

  const summary = {
    base_url: baseUrl,
    auth_token_supplied: Boolean(authToken),
    write_mode: writeMode,
    cleanup_mode: cleanupMode,
    expect_connected_league: expectConnectedLeague,
    feedback_target: { season: feedbackSeason, week: feedbackWeek },
    totals: {
      pass: results.filter((item) => item.status === "pass").length,
      fail: results.filter((item) => item.status === "fail").length,
      skip: results.filter((item) => item.status === "skip").length,
    },
    results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.totals.fail > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(JSON.stringify({
    error: err.message,
    stack: err.stack,
  }, null, 2));
  process.exit(1);
});
