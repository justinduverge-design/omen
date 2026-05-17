"use strict";

/**
 * =================================================================
 * Central environment configuration
 * -----------------------------------------------------------------
 * Read once at boot. Validate required keys. Fail loud + fast if
 * misconfigured (SY0-701 4.1: secure baselines).
 *
 * Never log raw secrets; only log key NAMES on validation errors.
 * =================================================================
 */

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
];

const config = {
  // --- Server ---------------------------------------------------
  port:        parseInt(process.env.PORT, 10) || 3000,
  nodeEnv:     process.env.NODE_ENV || "development",
  appBaseUrl:  process.env.APP_BASE_URL || "http://localhost:3000",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean),

  // --- Logging --------------------------------------------------
  logLevel: process.env.LOG_LEVEL || "info",

  // --- Supabase -------------------------------------------------
  supabaseUrl:        process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // --- Upstash Redis --------------------------------------------
  redisUrl:   process.env.REDIS_URL,
  redisToken: process.env.REDIS_TOKEN,

  // --- OpenWeatherMap (optional - graceful fallback when not set)
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || null,

  // --- Yahoo OAuth ----------------------------------------------
  yahoo: {
    clientId:     process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET,
    redirectUri:  process.env.YAHOO_REDIRECT_URI,
  },

  // --- Stripe ---------------------------------------------------
  stripe: {
    secretKey:      process.env.STRIPE_SECRET_KEY,
    webhookSecret:  process.env.STRIPE_WEBHOOK_SECRET,
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    seasonPriceId:  process.env.STRIPE_SEASON_PRICE_ID,
  },

  // --- Anthropic ------------------------------------------------
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
};

// Validate at boot - never let the process come up with required vars missing.
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `FATAL: missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

// Optional env vars (no crash if missing - services fall back gracefully):
// OPENWEATHER_API_KEY - weather data for MVP Move agents
// LLM_BASE_URL        - Gemma on Hostinger
// REDIS_URL / REDIS_TOKEN - roster caching

config.isProd = config.nodeEnv === "production";
config.isDev  = !config.isProd;

module.exports = config;
