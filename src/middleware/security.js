"use strict";

/**
 * ════════════════════════════════════════════════════════════════
 * HTTP security middleware
 * ----------------------------------------------------------------
 * Mounted globally in server.js BEFORE any body parser or route.
 *
 * Maps to CompTIA Security+ (SY0-701):
 *   4.1  Secure baselines        - default-deny CORS, fail-closed config
 *   4.5  Application security    - hardened headers via helmet
 *   2.4  Account/auth attacks    - tiered rate limiting on /api/auth
 * ════════════════════════════════════════════════════════════════
 */

const helmet    = require("helmet");
const cors      = require("cors");
const rateLimit = require("express-rate-limit");
const config    = require("../config");

// ── helmet ────────────────────────────────────────────────────────
// Sets ~12 hardening headers (X-Frame-Options, HSTS, X-Content-Type-Options,
// Referrer-Policy, etc.). CSP is OFF for now because the React SPA is hosted
// separately; flip it on once same-origin hosting is wired up.
const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ── CORS ──────────────────────────────────────────────────────────
// Default-deny. Origins must be explicitly listed in CORS_ORIGINS
// (comma-separated). In dev, http://localhost:* is auto-allowed so the
// React dev server works without config.
const corsMiddleware = cors({
  origin: (origin, cb) => {
    // No Origin header = same-origin request, curl, or server-to-server.
    if (!origin) return cb(null, true);

    if (config.corsOrigins.includes(origin)) return cb(null, true);

    if (config.isDev && origin.startsWith("http://localhost")) {
      return cb(null, true);
    }
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
});

// ── General rate limit ────────────────────────────────────────────
// 100 requests per minute per IP. Roomy for legit users, trips bots.
// Uses standard headers (RFC draft) so clients can implement backoff.
const generalRateLimit = rateLimit({
  windowMs:        60 * 1000,
  limit:           100,
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message:         { error: "Too many requests, please slow down." },
});

// ── Auth rate limit ───────────────────────────────────────────────
// Stricter — applied to /api/auth/* only. Brute-force / credential-stuffing
// defense. 20 attempts per IP per 10 minutes.
const authRateLimit = rateLimit({
  windowMs:        10 * 60 * 1000,
  limit:           20,
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message:         { error: "Too many auth attempts. Try again in 10 minutes." },
});

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  generalRateLimit,
  authRateLimit,
};
