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
const aiProvider = String(process.env.AI_PROVIDER || "local").trim().toLowerCase();

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
    provider:  aiProvider,
    baseUrl:   process.env.LLM_BASE_URL || "",
    model:     process.env.LLM_MODEL || "gemma4:e2b-q4_0",
    timeoutMs: Number.isFinite(llmTimeoutMs) && llmTimeoutMs > 0 ? llmTimeoutMs : 30000,
  },

  // --- Yahoo OAuth ----------------------------------------------
  //
  // `enabled` gates the *entry point* only — starting a new Yahoo connection.
  //
  // ENTITLEMENT GRANTED 2026-08-28. Yahoo turned on Fantasy Sports API access
  // for app ZcZJXm8V; a live probe from inside the production container
  // returned 200 on `/game/nfl` and `/users;use_login=1/games`, where every
  // call had returned 403 "This application is not authorized to perform this
  // action." since 2026-08-13. `YAHOO_ENABLED=true` is set on omen_api and
  // omen_cron as of the same day.
  //
  // The flag itself stays, and still defaults to **false**: this was a review
  // decision Yahoo made once and can make again, and the failure mode it
  // guards against is nasty — the OAuth handshake keeps succeeding and writes
  // a `connected` row while every Fantasy call 403s, so the connection reads
  // as working and serves nothing. Fail closed if it is ever unset.
  //
  // To re-check at any time: `GET /api/yahoo/access-probe` (any 200 = granted;
  // four 403s = revoked). To pause again: YAHOO_ENABLED=false here AND
  // YAHOO_CONNECTIONS_ENABLED=false in frontend/src/lib/yahooAuth.js.
  yahoo: {
    clientId:     process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET,
    redirectUri:  process.env.YAHOO_REDIRECT_URI,
    enabled:      String(process.env.YAHOO_ENABLED || "").trim().toLowerCase() === "true",
  },

  // --- Draft Assistant (sidelined to 2027) ----------------------
  //
  // Draft Assistant is cut from 1.0 and sidelined to the 2027 fantasy draft
  // (founder decision 2026-08-11; facts-of-record #9). The implementation is
  // PRESERVED, not deleted — `src/routes/draftAssistant.js`,
  // `src/services/adp.js`, `src/services/sleeperDraft.js`, and
  // `src/services/sleeperDraftAccess.js` are the head start that 2027 ships on
  // a Slops-built ADP. Deleting them costs next season.
  //
  // This gates the *mount* only, and it fails closed: with the flag unset,
  // `/api/draft-assistant/*` is never registered, so it returns the app's
  // standard not-found rather than a disabled-feature error that would still
  // confirm the feature exists.
  //
  // To bring it back for 2027: set DRAFT_ASSISTANT_ENABLED=true, restore the
  // frontend route/nav/help entries listed in the decision-log re-activation
  // path, and re-add the `draft_assistant` entry to the dashboard tool list.
  // Nothing else needs to change.
  draftAssistant: {
    enabled: String(process.env.DRAFT_ASSISTANT_ENABLED || "").trim().toLowerCase() === "true",
  },

  // --- Resend (transactional email) -----------------------------
  resend: {
    apiKey: process.env.RESEND_API_KEY || null,
  },

  // --- Anthropic ------------------------------------------------
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // --- Mobile minimum supported version (O7 forced-update gate) --
  //
  // Once a build is on a phone it stays there until the user updates.
  // These are the only lever available to block a bad build after ship.
  // Bumping them does NOT push an update — it only changes what
  // GET /api/system/min-version reports. Raise deliberately and only
  // once the corresponding store version is actually live.
  minAppVersion: {
    ios:     process.env.MIN_APP_VERSION_IOS || "0.1.0",
    android: process.env.MIN_APP_VERSION_ANDROID || "0.1.0",
  },
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
// AI_PROVIDER          - local (default); cloud is disabled while the spend cap is $0
// REDIS_URL / REDIS_TOKEN - roster caching

config.isProd = config.nodeEnv === "production";
config.isDev  = !config.isProd;

module.exports = config;
