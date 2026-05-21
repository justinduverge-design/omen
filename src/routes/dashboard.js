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

function buildOmenTool(rows = []) {
  const activeRows = rows.filter((row) => row?.is_active);
  const usableYahoo = activeRows.find((row) =>
    hasUsableYahooToken(row) && hasUsableLeagueId(row)
  );

  if (usableYahoo) {
    return { available: true, mode: "live", status: "ready" };
  }
  if (activeRows.length) {
    return { available: false, mode: "live", status: "pending_live_engine" };
  }
  return { available: false, mode: "mock", status: "needs_platform" };
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
  const { data, error } = await supabase
    .from("users")
    .select("is_subscribed")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.is_subscribed);
}

router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [rows, isSubscribed] = await Promise.all([
      getPlatformRows(req.user.id),
      getSubscriptionStatus(req.user.id),
    ]);

    return res.json({
      contract_version: "dashboard-summary.v1",
      generated_at: nowIso(),
      is_mock: false,
      platforms: buildPlatformSummary(rows),
      tools: {
        draft_assistant: { available: true, mode: "free", status: "ready" },
        omen_of_the_week: buildOmenTool(rows),
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
