"use strict";

/**
 * =================================================================
 * Omen API - entry point
 * -----------------------------------------------------------------
 * Bootstrap order is intentional:
 *   1. Sentry init (must run before other imports)
 *   2. config (validates env, fails fast if misconfigured)
 *   3. logger (so all subsequent errors are captured structurally)
 *   4. trust proxy (req.ip + X-Forwarded-* correct behind Nginx)
 *   5. security middleware (helmet, CORS) BEFORE body parser
 *   6. Stripe WEBHOOK router  (raw body)  -- BEFORE express.json
 *   7. body parser (express.json)
 *   8. rate limits
 *   9. routes
 *  10. 404 handler
 *  11. Sentry error capture
 *  12. error handler (last - catches anything thrown above)
 * =================================================================
 */

// Sentry MUST be required before any module that may throw at boot
// (including ./config), so init errors get captured.
const { initSentry } = require("./middleware/sentry");
initSentry({ component: "api" });

const Sentry = require("@sentry/node");
const express = require("express");
const path    = require("path");
const fs      = require("fs");
const config  = require("./config");
const systemRoutes = require("./routes/system");
const { logger, httpLogger } = require("./middleware/logging");
const {
  setSpaIndexCacheHeaders,
  setSpaStaticCacheHeaders,
} = require("./middleware/spaCache");
const {
  helmetMiddleware,
  corsMiddleware,
  generalRateLimit,
  authRateLimit,
  publicToolRateLimit,
} = require("./middleware/security");

const app = express();

// Trust the first hop (Nginx / Oracle LB) so req.ip is the real client IP
// and the rate limiter doesn't see all traffic as coming from the proxy.
// SY0-701 4.5: required for accurate access logs + rate-limit attribution.
app.set("trust proxy", 1);

// --- Security FIRST -----------------------------------------------
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use((req, res, next) => {
  const carriesEspnCredentials = (
    (req.method === "POST" && req.path === "/api/platforms/espn/connect")
    || (req.method === "POST" && req.path === "/api/auth/espn/connect")
    || (req.method === "GET" && req.path === "/api/espn/roster")
  );
  if (carriesEspnCredentials) {
    res.locals.__skipBodyLog = true;
  }
  next();
});
app.use(httpLogger);

// --- Stripe webhook BEFORE JSON parser ---------------------------
// Stripe signs the raw request body. Once express.json() parses and
// re-serializes it, the signature won't validate anymore. So we mount
// the webhook router first (it uses express.raw() internally for /webhook).
// Only the /webhook path inside this router does anything; other paths
// fall through to the JSON-bodied router below.
try {
  const { webhookRouter } = require("./routes/stripe");
  app.use("/api/stripe", webhookRouter);
} catch (e) {
  logger.error("Stripe webhook router failed to load", { err: e.message });
}

// --- Body parser --------------------------------------------------
app.use(express.json({ limit: "100kb" }));

// --- Rate limit (general) - skip health ---------------------------
app.use((req, res, next) => {
  if (req.path === "/api/health") return next();
  return generalRateLimit(req, res, next);
});

// --- Public system + mock contract routes ------------------------
app.use("/api", systemRoutes);

// --- App backbone summary routes --------------------------------
try {
  const dashboardRoutes = require("./routes/dashboard");
  app.use("/api/dashboard", dashboardRoutes);
} catch (e) {
  logger.error("Dashboard router failed to load", { err: e.message, stack: e.stack });
}

try {
  const accountRoutes = require("./routes/account");
  app.use("/api/account", accountRoutes);
} catch (e) {
  logger.error("Account router failed to load", { err: e.message, stack: e.stack });
}

// --- Draft Assistant mock contract routes -----------------------
try {
  const draftAssistantRoutes = require("./routes/draftAssistant");
  app.use("/api/draft-assistant", publicToolRateLimit, draftAssistantRoutes);
} catch (e) {
  logger.error("Draft Assistant router failed to load", { err: e.message, stack: e.stack });
}

// --- Player search autocomplete routes --------------------------
try {
  const playersRoutes = require("./routes/players");
  app.use("/api/players", publicToolRateLimit, playersRoutes);
} catch (e) {
  logger.error("Players router failed to load", { err: e.message, stack: e.stack });
}

// --- Deterministic public Demo Mode ------------------------------
try {
  const demoRoutes = require("./routes/demo");
  app.use("/api/demo", publicToolRateLimit, demoRoutes);
} catch (e) {
  logger.error("Demo Mode router failed to load", { err: e.message, stack: e.stack });
}

// Root /  -> the SPA entry (or JSON status if SPA hasn't been built)
const SPA_DIR = path.join(__dirname, "..", "frontend", "dist");
const SPA_INDEX = path.join(SPA_DIR, "index.html");
const HAS_SPA = fs.existsSync(SPA_INDEX);

if (HAS_SPA) {
  logger.info("Serving SPA from client/dist", { path: SPA_DIR });
  // Static assets (JS, CSS, images) can be cached because Vite hashes
  // build outputs. The SPA shell must revalidate so deploys do not leave
  // browsers stuck on an old index.html that points at stale assets.
  app.use(express.static(SPA_DIR, {
    maxAge: "30d",
    setHeaders: setSpaStaticCacheHeaders,
  }));
} else {
  logger.warn("No SPA found at client/dist - falling back to JSON status");
  app.get("/", (req, res) => {
    res.json({ service: "Slops Saloon Fantasy Football MVP", status: "live" });
  });
}

// --- Auth gets the stricter limiter -------------------------------
app.use("/api/auth", authRateLimit);

// --- Mount Stripe JSON routes (checkout, portal) -----------------
try {
  const { router: stripeRouter } = require("./routes/stripe");
  app.use("/api/stripe", stripeRouter);
} catch (e) {
  logger.error("Stripe router failed to load", { err: e.message });
}

// --- Mount /api/yahoo (modular roster routes) -------------------
try {
  const yahooRoutes = require("./routes/yahoo");
  app.use("/api/yahoo", yahooRoutes);
} catch (e) {
  logger.error("Yahoo router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/sleeper (public API roster adapter) --------------
try {
  const sleeperRoutes = require("./routes/sleeper");
  app.use("/api/sleeper", sleeperRoutes);
} catch (e) {
  logger.error("Sleeper router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/espn (cookie-backed roster adapter) --------------
try {
  const espnRoutes = require("./routes/espn");
  app.use("/api/espn", espnRoutes);
} catch (e) {
  logger.error("ESPN router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/platforms (connection status + connect/disconnect)
try {
  const platformsRoutes = require("./routes/platforms");
  app.use("/api/platforms", platformsRoutes);
} catch (e) {
  logger.error("Platforms router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/user (privacy export/delete + consent) -----------
try {
  const userPrivacyRoutes = require("./routes/userPrivacy");
  app.use("/api/user", userPrivacyRoutes);
} catch (e) {
  logger.error("User privacy router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/moves (Omen history + W/L effectiveness) --------
try {
  const movesRoutes = require("./routes/moves");
  app.use("/api/moves", movesRoutes);
} catch (e) {
  logger.error("Moves router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/league (canonical connected-league contracts) ---
try {
  const leagueRoutes = require("./routes/league");
  app.use("/api/league", leagueRoutes);
} catch (e) {
  logger.error("League router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/optimizer (Pro-gated lineup + waiver routes) ----
try {
  const optimizerRoutes = require("./routes/optimizer");
  app.use("/api/optimizer", optimizerRoutes);
} catch (e) {
  logger.error("Optimizer router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/start-sit (free public manual comparison) --------
try {
  const startSitRoutes = require("./routes/startSit");
  app.use("/api/start-sit", startSitRoutes);
} catch (e) {
  logger.error("Start/Sit router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/omen (contract-stable MVP Move mock endpoint) ----
try {
  const omenRoutes = require("./routes/omen");
  app.use("/api/omen", omenRoutes);
} catch (e) {
  logger.error("Omen router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/trade (free, auth-gated trade comparison) --------
try {
  const tradeRoutes = require("./routes/trade");
  app.use("/api/trade", publicToolRateLimit, tradeRoutes);
} catch (e) {
  logger.error("Trade router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount /api/waitlist (public waitlist signup + welcome email)
try {
  const waitlistRoutes = require("./routes/waitlist");
  app.use("/api/waitlist", publicToolRateLimit, waitlistRoutes);
} catch (e) {
  logger.error("Waitlist router failed to load", { err: e.message, stack: e.stack });
}

// --- Mount the v2 router (Sleeper, Yahoo OAuth, ESPN, standings) -
// NOTE: still hosts the original auth/* + league/* routes. As we
// migrate them to src/routes/*.js, this will shrink and eventually
// be removed.
try {
  const apiRoutes = require("./omen_api_v2");
  app.use("/api", apiRoutes);
} catch (e) {
  logger.error("API routes failed to load", { err: e.message, stack: e.stack });
}

// --- SPA fallback ------------------------------------------------
// Any non-API GET that didn't match a static file should serve the
// React app's index.html so client-side routing can take over.
// API requests (any /api/*) and unknown verbs fall through to the
// 404 handler below.
if (HAS_SPA) {
  // Canonical SPA fallback. app.get("*", ...) is the standard
  // pattern; using app.use(cb) here was racing with the JSON 404
  // handler in some configurations.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (req.path.includes("."))       return next();  // missed static asset = 404
    setSpaIndexCacheHeaders(res);
    res.sendFile(SPA_INDEX, (err) => {
      if (err) {
        logger.error("SPA sendFile failed", { err: err.message, path: req.path });
        next(err);
      }
    });
  });
}

// --- 404 handler --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.use((err, _req, res, next) => {
  if (res.locals.__skipBodyLog && err && typeof err === "object") {
    Object.defineProperty(err, "__skipBodyLog", {
      value: true,
      configurable: true,
    });
  }
  next(err);
});

Sentry.setupExpressErrorHandler(app);

// --- Error handler (last) -----------------------------------------
// Logs full detail server-side; sends sanitized message to client in prod
// so we don't leak stack traces or implementation details.
// SY0-701 4.5: don't reveal implementation details on error.
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  logger.error("Unhandled error", {
    err:    err.message,
    stack:  err.stack,
    path:   req.path,
    method: req.method,
    ip:     req.ip,
  });
  res.status(status).json({
    error: config.isProd && status >= 500
      ? "Internal server error"
      : err.message,
  });
});

// --- Listen -------------------------------------------------------
const server = app.listen(config.port, () => {
  logger.info("Omen API listening", {
    port: config.port,
    env:  config.nodeEnv,
  });
});

// --- Graceful shutdown --------------------------------------------
// On SIGTERM (Docker stop), drain in-flight requests cleanly. Force exit
// after 10s if anything hangs. SY0-701 4.5: orderly service teardown.
const shutdown = (signal) => {
  logger.info(`${signal} received, draining...`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("Shutdown timeout; forcing exit");
    process.exit(1);
  }, 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
