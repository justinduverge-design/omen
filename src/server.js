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
 *   6. body parser (express.json)
 *   7. rate limits
 *   8. routes
 *   9. 404 handler
 *  10. Sentry error capture
 *  11. error handler (last - catches anything thrown above)
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
  setAppleAppSiteAssociationHeaders,
  createAppleAppSiteAssociationSendFileOptions,
  setSpaIndexCacheHeaders,
  setSpaStaticCacheHeaders,
} = require("./middleware/spaCache");
const {
  buildTradeShareMetaForRequest,
  injectTradeShareMeta,
  tradeShareHashFromPath,
} = require("./services/tradeShareMeta");
const {
  helmetMiddleware,
  corsMiddleware,
  generalRateLimit,
  authRateLimit,
  permissionsPolicyMiddleware,
  publicToolRateLimit,
} = require("./middleware/security");

const app = express();

// Trust the first hop (Nginx / Oracle LB) so req.ip is the real client IP
// and the rate limiter doesn't see all traffic as coming from the proxy.
// SY0-701 4.5: required for accurate access logs + rate-limit attribution.
app.set("trust proxy", 1);

// --- Security FIRST -----------------------------------------------
app.use(helmetMiddleware);
app.use(permissionsPolicyMiddleware);
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

// --- Body parser --------------------------------------------------
app.use(express.json({ limit: "100kb" }));

// --- Rate limit (general) - API routes only, skip health -----------
// Scoped to /api/* so static assets and the SPA shell (index.html,
// hashed JS/CSS/image chunks) never count against the same 100/min
// budget as API calls. Un-scoped, a handful of normal page loads could
// exceed 100 requests once every asset is counted, tripping this
// limiter and serving raw rate-limit JSON as a full-page response
// instead of the React app (no Content-Type-driven client ever gets a
// chance to catch it, since the SPA hasn't mounted yet).
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
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

// --- Draft Assistant — sidelined to 2027, not mounted -----------
//
// Cut from 1.0 (founder decision 2026-08-11; facts-of-record #9). The router
// is preserved in the tree for the 2027 draft and is mounted only when
// DRAFT_ASSISTANT_ENABLED=true. Unmounted, the path falls through to the
// app's standard 404 — the feature is absent, not merely refused, so nothing
// on the public surface confirms it exists. See `config.draftAssistant` for
// the full re-activation procedure.
if (config.draftAssistant.enabled) {
  try {
    const draftAssistantRoutes = require("./routes/draftAssistant");
    app.use("/api/draft-assistant", publicToolRateLimit, draftAssistantRoutes);
    logger.warn("Draft Assistant mounted — this feature is cut from 1.0");
  } catch (e) {
    logger.error("Draft Assistant router failed to load", { err: e.message, stack: e.stack });
  }
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
const AASA_FILE = path.join(SPA_DIR, ".well-known", "apple-app-site-association");
const HAS_SPA = fs.existsSync(SPA_INDEX);

if (HAS_SPA) {
  logger.info("Serving SPA from client/dist", { path: SPA_DIR });
  // Express static ignores dot-prefixed paths by default. Serve the AASA
  // contract explicitly so iOS can validate the webcredentials association.
  if (fs.existsSync(AASA_FILE)) {
    app.get("/.well-known/apple-app-site-association", (req, res, next) => {
      setAppleAppSiteAssociationHeaders(res);
      res.sendFile(AASA_FILE, createAppleAppSiteAssociationSendFileOptions(), (err) => {
        if (err) next(err);
      });
    });
  }
  // Static assets (JS, CSS, images) can be cached because Vite hashes
  // build outputs. The SPA shell must revalidate so deploys do not leave
  // browsers stuck on an old index.html that points at stale assets.
  app.use(express.static(SPA_DIR, {
    maxAge: "30d",
    setHeaders: setSpaStaticCacheHeaders,
  }));
} else {
  logger.warn(`No SPA found at ${SPA_DIR} - falling back to JSON status`);
  app.get("/", (req, res) => {
    res.json({ service: "Omen", status: "live" });
  });
}

// --- Auth gets the stricter limiter -------------------------------
app.use("/api/auth", authRateLimit);

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
  // Canonical SPA fallback. Using app.use(cb) here was racing with the
  // JSON 404 handler in some configurations, so this stays a GET route.
  //
  // The catch-all is written as the regex /.*/ rather than the string "*".
  // Express 5 ships path-to-regexp 8, which rejects a bare "*" at route
  // registration ("Missing parameter name") and would kill the server on
  // boot. A RegExp path is accepted unchanged by both Express 4 and 5 and
  // matches the identical set of paths, so this is version-agnostic.
  app.get(/^\/trade\/share\/[^/]+\/?$/i, (req, res, next) => {
    const hash = tradeShareHashFromPath(req.path);
    if (!hash) return next();

    fs.readFile(SPA_INDEX, "utf8", (err, html) => {
      if (err) {
        logger.error("Trade share SPA index read failed", { err: err.message, path: req.path });
        return next(err);
      }

      setSpaIndexCacheHeaders(res);
      res.type("html").send(injectTradeShareMeta(html, buildTradeShareMetaForRequest(req, hash)));
    });
  });

  app.get(/.*/, (req, res, next) => {
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
