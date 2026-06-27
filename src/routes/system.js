"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const packageJson = require("../../package.json");
const {
  getHealthStatus,
  getPlatformStatus,
} = require("../services/systemContracts");
const { getLlmBridgeStatus } = require("../services/llm");
const { authenticateOmenRequest } = require("../services/omen");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

router.get("/health", (_req, res) => {
  res.json(getHealthStatus());
});

router.get("/ready", async (_req, res) => {
  const llmStatus = getLlmBridgeStatus();
  const criticalConfig = {
    supabase_url: Boolean(config.supabaseUrl),
    supabase_service_key: Boolean(config.supabaseServiceKey),
  };
  const optionalServices = {
    stripe: Boolean(config.stripe.secretKey && config.stripe.webhookSecret),
    yahoo_oauth: Boolean(config.yahoo.clientId && config.yahoo.clientSecret && config.yahoo.redirectUri),
    redis: Boolean(config.redisUrl && config.redisToken),
    llm_private: llmStatus.status === "configured_private",
    openweather: Boolean(config.openWeatherApiKey),
  };

  let supabaseReachable = false;
  let supabaseError = null;
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    supabaseReachable = !error;
    supabaseError = error?.message || null;
  } catch (err) {
    supabaseError = err.message;
  }

  const ready = Object.values(criticalConfig).every(Boolean) && supabaseReachable;
  return res.status(ready ? 200 : 503).json({
    contract_version: "system-ready.v1",
    status: ready ? "ready" : "not_ready",
    generated_at: new Date().toISOString(),
    checks: {
      supabase: {
        status: supabaseReachable ? "reachable" : "unreachable",
        error: supabaseError,
      },
      critical_config: criticalConfig,
      optional_services: optionalServices,
      llm: llmStatus,
    },
  });
});

router.get("/version", (_req, res) => {
  res.json({
    contract_version: "system-version.v1",
    service: "omen-api",
    package_name: packageJson.name,
    package_version: packageJson.version,
    node_env: config.nodeEnv,
    git_sha: process.env.GITHUB_SHA
      || process.env.COMMIT_SHA
      || process.env.SOURCE_VERSION
      || process.env.RENDER_GIT_COMMIT
      || null,
    build_id: process.env.GITHUB_RUN_ID
      || process.env.BUILD_ID
      || process.env.RENDER_SERVICE_ID
      || null,
    image_tag: process.env.IMAGE_TAG || process.env.GHCR_IMAGE_TAG || null,
    generated_at: new Date().toISOString(),
  });
});

router.get("/session", async (req, res) => {
  const unauthenticated = {
    authenticated: false,
    user: null,
    contract_version: "session.v1",
  };

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json(unauthenticated);
  }

  try {
    const user = await authenticateOmenRequest(authHeader);
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || null,
      },
      contract_version: "session.v1",
    });
  } catch (_e) {
    return res.json(unauthenticated);
  }
});

router.get("/system/current-week", (_req, res) => {
  res.json({
    contract_version: "system-current-week.v1",
    generated_at: new Date().toISOString(),
    ...getCurrentNflWeekContext(),
  });
});

router.get("/platform-status", (_req, res) => {
  res.json(getPlatformStatus(config));
});

module.exports = router;
