"use strict";

/**
 * =================================================================
 * SSFFMVP API - entry point
 * -----------------------------------------------------------------
 * Bootstrap order is intentional:
 *   1. config (validates env, fails fast if misconfigured)
 *   2. logger (so all subsequent errors are captured structurally)
 *   3. trust proxy (req.ip + X-Forwarded-* correct behind Nginx)
 *   4. security middleware (helmet, CORS) BEFORE body parser
 *   5. Stripe WEBHOOK router  (raw body)  -- BEFORE express.json
 *   6. body parser (express.json)
 *   7. rate limits
 *   8. routes
 *   9. 404 handler
 *  10. error handler (last - catches anything thrown above)
 * =================================================================
 */

const express = require("express");
const config  = require("./config");
const { logger, httpLogger } = require("./middleware/logging");
const {
  helmetMiddleware,
  corsMiddleware,
  generalRateLimit,
  authRateLimit,
} = require("./middleware/security");

const app = express();

// Trust the first hop (Nginx / Oracle LB) so req.ip is the real client IP
// and the rate limiter doesn't see all traffic as coming from the proxy.
// SY0-701 4.5: required for accurate access logs + rate-limit attribution.
app.set("trust proxy", 1);

// --- Security FIRST -----------------------------------------------
app.use(helmetMiddleware);
app.use(corsMiddleware);
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

// --- Public routes ------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "ssffmvp-api",
    uptime:  process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.json({ service: "Slops Saloon Fantasy Football MVP", status: "live" });
});

// --- Auth gets the stricter limiter -------------------------------
app.use("/api/auth", authRateLimit);

// --- Mount Stripe JSON routes (checkout, portal) -----------------
try {
  const { router: stripeRouter } = require("./routes/stripe");
  app.use("/api/stripe", stripeRouter);
} catch (e) {
  logger.error("Stripe router failed to load", { err: e.message });
}

// --- Mount the v2 router (Sleeper, Yahoo, ESPN, league data) -----
try {
  const apiRoutes = require("./ssffmvp_api_v2");
  app.use("/api", apiRoutes);
} catch (e) {
  logger.error("API routes failed to load", { err: e.message, stack: e.stack });
}

// --- 404 handler --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

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
  logger.info("SSFFMVP API listening", {
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
