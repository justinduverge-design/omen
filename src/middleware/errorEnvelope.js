"use strict";

/**
 * ════════════════════════════════════════════════════════════════
 * Terminal error handler + the envelope it sends
 * ----------------------------------------------------------------
 * Lifted out of `server.js` for S4 so the shipped envelope can be
 * tested directly. A test that re-declares the handler proves the
 * test's copy is safe, which is not the claim S4 has to make.
 *
 * Behaviour is unchanged from the inline version in two respects:
 *   - status comes from `err.status`, defaulting to 500
 *   - production hides the message on 5xx, everywhere else shows it
 *
 * What is new: the client-facing message and the logged message and
 * stack all pass through the shared scrubber first.
 *
 * Why that is not redundant with the logger's own scrubbing: this is
 * the one place a provider error's *message* is handed straight back
 * to the caller. A message is attacker- and vendor-influenced — Yahoo
 * puts its own explanation in the body, ESPN returns login documents,
 * and a URL that carried a token in its query string ends up inside a
 * fetch failure's message verbatim. Non-production is where that gets
 * echoed, which is also where local QA, device testing, and screen
 * recordings happen.
 * ════════════════════════════════════════════════════════════════
 */

const config = require("../config");
const { logger } = require("./logging");
const { scrubText } = require("./sentry");

const PRODUCTION_5XX_MESSAGE = "Internal server error";

/**
 * The response a client sees. Kept pure so it can be tested against real
 * provider errors without a socket.
 */
function buildErrorEnvelope(err, { isProd = config.isProd } = {}) {
  const status = err?.status || 500;
  const hideDetail = isProd && status >= 500;

  return {
    status,
    body: {
      error: hideDetail
        ? PRODUCTION_5XX_MESSAGE
        : scrubText(String(err?.message ?? PRODUCTION_5XX_MESSAGE)),
    },
  };
}

function errorHandler(err, req, res, _next) {
  const { status, body } = buildErrorEnvelope(err);

  logger.error("Unhandled error", {
    err:    scrubText(String(err?.message ?? "")),
    stack:  scrubText(String(err?.stack ?? "")),
    path:   req.path,
    method: req.method,
    ip:     req.ip,
  });

  res.status(status).json(body);
}

module.exports = {
  PRODUCTION_5XX_MESSAGE,
  buildErrorEnvelope,
  errorHandler,
};
