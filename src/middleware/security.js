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

const PERMISSIONS_POLICY = [
  "camera=()",
  "geolocation=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

// ── helmet ────────────────────────────────────────────────────────
// Sets ~12 hardening headers (X-Frame-Options, HSTS, X-Content-Type-Options,
// Referrer-Policy, etc.) plus a minimal same-origin CSP for the bundled SPA.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      fontSrc:    ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
      // `useDefaults` stays on (true) so Helmet's other CSP defaults
      // (base-uri, form-action, frame-ancestors, script-src-attr, etc.)
      // still apply as extra hardening. But `upgrade-insecure-requests` is
      // one of those defaults, and it breaks this app: TLS is terminated
      // at the Nginx/LB layer (see `trust proxy` below), so the Node
      // process itself only ever speaks plain HTTP -- including when hit
      // directly for local/LAN device QA. Real WebKit enforces that
      // directive by silently rewriting every same-origin http:// asset
      // fetch to https://, which fails outright with nothing listening on
      // TLS, and the SPA never mounts (confirmed via real Safari WebDriver
      // testing, phase 1.13 mobile QA sweep, 2026-07-03). Setting it to
      // `null` explicitly excludes just this one default directive.
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

function permissionsPolicyMiddleware(_req, res, next) {
  // Omen has no camera, microphone, geolocation, payment, or USB feature.
  // Explicitly deny them so a future browser-side regression cannot request
  // these capabilities without an intentional policy change.
  res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
  next();
}

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
// 600 requests per minute per IP, app-wide across `/api/*`.
//
// This is a **flood backstop, not a cost control.** Everything expensive is
// separately capped much tighter and much closer to the work:
//
//   /api/omen/mvp-move    20/min/IP + 10/min/credential   (provider fan-out + LLM)
//   /api/trade/compare    20/min/IP + 20/min/credential   (LLM)
//   /api/dashboard/summary 60/min/IP + 30/min/credential
//   /api/players          PLAYER_SEARCH_PER_MINUTE below
//
// See `middleware/hotRouteLimits.js`. Because those exist, this number does not
// need to be small to protect spend — and when it is small it does real damage:
// **mobile clients sit behind carrier-grade NAT**, where thousands of unrelated
// users share a handful of public IPs. At 100/min/IP, a few dozen Omen users on
// the same carrier could exhaust the app-wide budget for every other user on
// that carrier, and each of them would see failures they cannot explain or fix.
//
// Raised from 100 on 2026-08-31 for exactly that reason. Uses standard headers
// (RFC draft) so clients can implement real backoff.
const generalRateLimit = rateLimit({
  windowMs:        60 * 1000,
  limit:           600,
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

// ── Public tool rate limit ───────────────────────────────────────
// Applied to high-work public endpoints: Trade Analyzer, Draft Assistant, demo
// and waitlist. Keeps the free surface usable without letting one client turn
// it into an unbounded compute sink.
//
// Raised 30 → 120 on 2026-08-31. The old 30 was shared across `/api/trade`,
// `/api/demo`, `/api/draft-assistant`, `/api/waitlist` **and** `/api/players`,
// which meant cheap autocomplete keystrokes competed for budget with
// LLM-backed trade analysis and could lock a user out of the product's front
// door mid-sentence. `/api/players` now has its own budget below, and the
// genuinely expensive endpoint under this prefix — `/api/trade/compare` — keeps
// its own tighter 20/min/IP + 20/min/credential limiter, so this prefix-wide
// number is the loose outer bound and not the thing protecting spend.
const publicToolRateLimit = rateLimit({
  windowMs:        60 * 1000,
  limit:           120,
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message:         {
    error: "Too many tool requests, please slow down.",
    code: "public_tool_rate_limited",
  },
});

// ── Player search rate limit ─────────────────────────────────────
// `GET /api/players/search` — the Trade autocomplete. Its own bucket, because
// it is the one public route that fires **per keystroke** and is by far the
// cheapest thing Omen serves.
//
// The number is set from measured cost, not from a round figure. The route
// reads an in-process cache of the Sleeper player blob (refreshed daily) and,
// since the search index is built once per blob rather than once per request,
// costs **0.23ms of CPU per search** over 11.4k players — down from 3.9ms, a
// 17× reduction measured on the same fixture. One core sustains ~4,300
// searches/second.
//
// At 300/min/IP the worst a single IP can extract is 69ms of CPU per minute:
// about 0.1% of one core. That is cheap enough to be generous with, which
// matters because this budget is shared by everyone behind the same NAT.
//
// For scale: a debounced client spends 3–6 requests per player name typed, so
// 300/min is roughly 50–100 player lookups a minute — far past what one person
// can type, and room for dozens of simultaneous users on one carrier IP.
const PLAYER_SEARCH_PER_MINUTE = 300;

const playerSearchRateLimit = rateLimit({
  windowMs:        60 * 1000,
  limit:           PLAYER_SEARCH_PER_MINUTE,
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message:         {
    error: "Too many player searches, please slow down.",
    code: "player_search_rate_limited",
  },
});

module.exports = {
  PERMISSIONS_POLICY,
  helmetMiddleware,
  corsMiddleware,
  generalRateLimit,
  authRateLimit,
  permissionsPolicyMiddleware,
  publicToolRateLimit,
  playerSearchRateLimit,
  PLAYER_SEARCH_PER_MINUTE,
};
