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
// Referrer-Policy, etc.) plus a minimal same-origin CSP for the bundled SPA.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ── CORS ──────────────────────────────────────────────────────────
// Default-deny with sensible same-origin shortcut. Vite-built SPAs use
// <script type="module" crossorigin> tags, which make even same-origin
// asset fetches send an Origin header that triggers CORS evaluation.
// We treat any request whose Origin's host matches the request's own
// Host as same-origin (always allowed), then fall back to the explicit
// CORS_ORIGINS allowlist, then localhost in dev.
const corsMiddleware = cors((req, cb) => {
  const origin = req.header("Origin");

  // 1. No Origin header at all = curl, server-to-server, or same-origin
  //    that the browser didn't tag as cross-origin. Allow.
  if (!origin) return cb(null, { origin: true, credentials: true });

  // 2. Origin's host matches the request's own Host header = same-origin
  //    even if the browser tagged it as crossorigin (Vite module scripts
  //    do this). Allow without flagging.
  try {
    const originHost = new URL(origin).host;
    if (originHost && originHost === req.headers.host) {
      return cb(null, { origin: true, credentials: true });
    }
  } catch (_) { /* malformed Origin -> fall through to allowlist */ }

  // 3. Explicit allowlist from CORS_ORIGINS env var.
  if (config.corsOrigins.includes(origin)) {
    return cb(null, { origin: true, credentials: true });
  }

  // 4. Dev convenience: localhost on any port.
  if (config.isDev && origin.startsWith("http://localhost")) {
    return cb(null, { origin: true, credentials: true });
  }

  // 5. Default deny.
  return cb(new Error(`CORS blocked: ${origin}`));
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
