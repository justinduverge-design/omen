"use strict";

/**
 * ════════════════════════════════════════════════════════════════
 * Logging middleware
 * ----------------------------------------------------------------
 * winston: structured application logger (severity, metadata, errors)
 * morgan:  per-request HTTP access log, piped through winston
 *
 * In production: JSON to stdout. Docker captures stdout; the host
 * (or a log shipper like Loki/Datadog) handles persistence and
 * retention. No file rotation in-process — keeps containers
 * stateless. SY0-701 4.9: continuous monitoring + audit trail.
 *
 * In development: colorized, human-readable single-line format.
 *
 * S4: every line leaves through `scrubLogFormat` below. Provider error
 * paths are the ones carrying the token, so containment cannot rest on
 * each of ~40 call sites remembering to pass only safe fields.
 * ════════════════════════════════════════════════════════════════
 */

const winston = require("winston");
const morgan  = require("morgan");
const config  = require("../config");
const { scrubText, scrubValue } = require("./sentry");

/**
 * Redact credential-shaped material from every log line, whatever produced it.
 *
 * S4. Before this, containment was a per-call-site convention: pass
 * `err.message`, never the error object; pass `sanitizedError(e)`, never `e`.
 * That convention held — but it is exactly the kind of guarantee that holds
 * until the next person adds a field, and its failure mode is silent. The
 * scrubber that already protects error-tracking payloads now runs on stdout
 * too, so a mistake at a call site is redacted rather than published.
 *
 * This is a backstop, not a licence: call sites still pass only what they need.
 *
 * `message` and `stack` are strings and get the text pass. Everything else in
 * the `info` object is metadata and gets the full key+value pass, so a meta key
 * named `access_token` is dropped by name even when its value looks innocuous.
 * `level` and `service` are winston's own routing fields and are left alone.
 * The object is mutated rather than rebuilt so winston's symbol-keyed internals
 * survive.
 */
const UNSCRUBBED_META_KEYS = new Set(["level", "service"]);

const scrubLogFormat = winston.format((info) => {
  if (typeof info.message === "string") info.message = scrubText(info.message);
  if (typeof info.stack === "string") info.stack = scrubText(info.stack);

  for (const key of Object.keys(info)) {
    if (key === "message" || key === "stack") continue;
    if (UNSCRUBBED_META_KEYS.has(key)) continue;
    // Wrapped as a single-entry object so the key itself is tested, not just
    // the value. `scrubValue("ya29.abc")` is a no-op — a bare string carries no
    // key to match on — but `scrubValue({ access_token: "ya29.abc" })` redacts
    // by name. Meta keys are exactly where a credential arrives with a
    // telling name and an unremarkable-looking value.
    info[key] = scrubValue({ [key]: info[key] })[key];
  }

  return info;
})();

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  // errors() first, so a raw Error has been expanded into message + stack
  // before the scrubber sees it.
  winston.format.errors({ stack: true }),
  scrubLogFormat,
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  scrubLogFormat,
  winston.format.printf(({ timestamp, level, message, stack, ...rest }) => {
    const meta = Object.keys(rest).length ? " " + JSON.stringify(rest) : "";
    return stack
      ? `${timestamp} ${level} ${message}${meta}\n${stack}`
      : `${timestamp} ${level} ${message}${meta}`;
  })
);

const logger = winston.createLogger({
  level:        config.logLevel,
  defaultMeta:  { service: "omen-api" },
  transports:   [
    new winston.transports.Console({
      format: config.isProd ? prodFormat : devFormat,
    }),
  ],
});

function safeRequestPath(req) {
  const rawUrl = req.originalUrl || req.url || req.path || "/";

  try {
    return new URL(rawUrl, "http://omen.local").pathname;
  } catch (_error) {
    return String(rawUrl).split("?", 1)[0] || "/";
  }
}

function accessLogFormat(tokens, req, res) {
  const remoteAddress = tokens["remote-addr"](req, res) || "-";
  const timestamp = tokens.date(req, res, "clf") || "-";
  const method = tokens.method(req, res) || "-";
  const protocol = tokens["http-version"](req, res) || "-";
  const status = tokens.status(req, res) || "-";
  const contentLength = tokens.res(req, res, "content-length") || "-";
  const responseTime = tokens["response-time"](req, res) || "-";

  // Query strings can contain OAuth codes, CSRF state, and provider credentials.
  // Keep the route and operational response fields, but never put query data,
  // referrers, or user agents into the access log.
  return `${remoteAddress} - - [${timestamp}] "${method} ${safeRequestPath(req)} HTTP/${protocol}" ${status} ${contentLength} ${responseTime}ms`;
}

// Morgan -> Winston bridge.
// Health checks are skipped — they hit every few seconds and would drown signal.
const httpLogger = morgan(
  config.isProd ? accessLogFormat : "dev",
  {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip:   (req, res) => req.path === "/api/health" || Boolean(res.locals.__skipBodyLog),
  }
);

module.exports = { accessLogFormat, logger, httpLogger, safeRequestPath, scrubLogFormat };
