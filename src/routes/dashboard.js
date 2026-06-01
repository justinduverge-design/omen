"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function nowIso() {
  return new Date().toISOString();
}

function hasUsableLeagueId(row) {
  const leagueId = String(row?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== "yahoo";
}

function isExpiredYahooToken(row, now = new Date()) {
  if (row?.platform !== "yahoo" || !row?.is_active || !row?.token_secret_id) return false;
  const expiresAt = row.token_expires_at ? Date.parse(row.token_expires_at) : NaN;
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

function hasUsableYahooToken(row, now = new Date()) {
  return Boolean(
    row?.platform === "yahoo"
    && row?.is_active
    && row?.token_secret_id
    && !isExpiredYahooToken(row, now)
  );
}

function hasUsableSleeperContext(row) {
  return Boolean(
    row?.platform === "sleeper"
    && row?.is_active
    && row?.platform_username
    && hasUsableLeagueId(row)
  );
}

function hasUsableEspnContext(row) {
  return Boolean(
    row?.platform === "espn"
    && row?.is_active
    && row?.espn_secret_id
    && row?.swid_secret_id
    && hasUsableLeagueId(row)
  );
}

function hasUsableOmenContext(row) {
  return (
    (hasUsableYahooToken(row) && hasUsableLeagueId(row))
    || hasUsableSleeperContext(row)
    || hasUsableEspnContext(row)
  );
}

function buildPlatformSummary(rows = [], now = new Date()) {
  const activeRows = rows.filter((row) => row?.is_active);
  const yahoo = activeRows.find((row) => row.platform === "yahoo" && row.token_secret_id);
  const yahooTokenExpired = isExpiredYahooToken(yahoo, now);
  const sleeper = activeRows.find((row) => row.platform === "sleeper" && row.platform_username);
  const espn = activeRows.find((row) =>
    row.platform === "espn" && row.espn_secret_id && row.swid_secret_id
  );

  const yahooSummary = {
    connected: Boolean(yahoo && !yahooTokenExpired),
    league_id: yahoo?.league_id || null,
  };
  if (yahooTokenExpired) {
    yahooSummary.status = "token_expired";
  }

  return {
    yahoo: yahooSummary,
    sleeper: {
      connected: Boolean(sleeper),
      username: sleeper?.platform_username || null,
    },
    espn: {
      connected: Boolean(espn),
    },
  };
}

function buildOmenTool({ rows = [], isSubscribed = false } = {}) {
  const activeRows = rows.filter((row) => row?.is_active);
  const usableOmenConnection = activeRows.find(hasUsableOmenContext);

  if (!usableOmenConnection) {
    if (activeRows.length) {
      return { available: false, mode: "pro", status: "pending_live_engine" };
    }
    return { available: false, mode: "pro", status: "needs_platform" };
  }

  if (!isSubscribed) {
    return { available: false, mode: "pro", status: "needs_subscription" };
  }

  return { available: true, mode: "pro", status: "ready" };
}

function buildWaiverTool({ rows = [], isSubscribed = false }) {
  const usableYahoo = rows.find((row) =>
    hasUsableYahooToken(row) && hasUsableLeagueId(row)
  );

  if (!usableYahoo) {
    return { available: false, mode: "pro", status: "needs_platform" };
  }
  if (!isSubscribed) {
    return { available: false, mode: "pro", status: "needs_subscription" };
  }
  return { available: true, mode: "pro", status: "ready" };
}

async function getPlatformRows(userId) {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("platform,is_active,league_id,platform_username,token_secret_id,token_expires_at,espn_secret_id,swid_secret_id")
    .eq("user_id", userId);

  if (error) throw new Error(`platform_connections lookup failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function getSubscriptionStatus(userId) {
  const [{ data: user, error: userError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase
      .from("users")
      .select("is_subscribed")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan,status,subscribed_at,canceled_at,expires_at,trial_ends_at,current_period_end,stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userError || subscriptionError) {
    return {
      is_subscribed: false,
      status: "unknown",
      plan: null,
      subscribed_at: null,
      canceled_at: null,
      expires_at: null,
      trial_ends_at: null,
      current_period_end: null,
      can_manage_billing: false,
    };
  }

  const isSubscribed = Boolean(user?.is_subscribed);
  const storedStatus = subscription?.status || null;
  const status = isSubscribed
    ? storedStatus || "active"
    : storedStatus === "canceled" ? "canceled" : "none";

  return {
    is_subscribed: isSubscribed,
    status,
    plan: subscription?.plan || null,
    subscribed_at: subscription?.subscribed_at || null,
    canceled_at: subscription?.canceled_at || null,
    expires_at: subscription?.expires_at || null,
    trial_ends_at: subscription?.trial_ends_at || null,
    current_period_end: subscription?.current_period_end || subscription?.expires_at || null,
    can_manage_billing: Boolean(subscription?.stripe_customer_id),
  };
}

async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("favorite_team")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { favorite_team: null };
  }

  return {
    favorite_team: data?.favorite_team || null,
  };
}

router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [rows, subscription, userProfile] = await Promise.all([
      getPlatformRows(req.user.id),
      getSubscriptionStatus(req.user.id),
      getUserProfile(req.user.id),
    ]);
    const isSubscribed = subscription.is_subscribed;

    return res.json({
      contract_version: "dashboard-summary.v1",
      generated_at: nowIso(),
      is_mock: false,
      user: userProfile,
      subscription,
      platforms: buildPlatformSummary(rows),
      tools: {
        draft_assistant: { available: true, mode: "free", status: "ready" },
        omen_of_the_week: buildOmenTool({ rows, isSubscribed }),
        start_sit: { available: true, mode: "free", status: "ready" },
        trade_analyzer: { available: true, mode: "free", status: "ready" },
        waiver_wire: buildWaiverTool({ rows, isSubscribed }),
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.buildPlatformSummary = buildPlatformSummary;
module.exports.buildOmenTool = buildOmenTool;
module.exports.buildWaiverTool = buildWaiverTool;
module.exports.isExpiredYahooToken = isExpiredYahooToken;
