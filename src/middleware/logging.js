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
 * ════════════════════════════════════════════════════════════════
 */

const winston = require("winston");
const morgan  = require("morgan");
const config  = require("../config");

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
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

// Morgan -> Winston bridge.
// In production, the `combined` format adds user-agent and referer for forensics.
// Health checks are skipped — they hit every few seconds and would drown signal.
const httpLogger = morgan(
  config.isProd ? "combined" : "dev",
  {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip:   (req, res) => req.path === "/api/health" || Boolean(res.locals.__skipBodyLog),
  }
);

module.exports = { logger, httpLogger };
