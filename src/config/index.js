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

const llmTimeoutMs = Number(process.env.LLM_TIMEOUT);

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

  // --- Local LLM / Ollama (optional - internal only) -------------
  llm: {
    baseUrl:   process.env.LLM_BASE_URL || "",
    model:     process.env.LLM_MODEL || "gemma3:4b",
    timeoutMs: Number.isFinite(llmTimeoutMs) && llmTimeoutMs > 0 ? llmTimeoutMs : 30000,
  },

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

  // --- Billing --------------------------------------------------
  billing: {
    enabled: process.env.CORVUS_BILLING_ENABLED === "true",
  },

  // --- Resend (transactional email) -----------------------------
  resend: {
    apiKey: process.env.RESEND_API_KEY || null,
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
// LLM_MODEL           - Ollama model name
// LLM_TIMEOUT         - Ollama request timeout in ms
// REDIS_URL / REDIS_TOKEN - roster caching

config.isProd = config.nodeEnv === "production";
config.isDev  = !config.isProd;

module.exports = config;
