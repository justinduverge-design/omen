"use strict";

const Sentry = require("@sentry/node");

const SCRUBBED = "[scrubbed]";
const SENSITIVE_KEY_PATTERN = /password|cookie|token|secret|swid|espn_s2|vault/i;
const SENSITIVE_HEADER_PATTERN = /^(cookie|set-cookie|authorization|x-api-key)$|token|secret/i;
const SENSITIVE_QUERY_PARAMETER_PATTERN = /password|cookie|token|secret|swid|espn_s2|vault|^(code|state)$/i;
/**
 * Two gaps this pattern used to have, both found by O8's containment tests:
 *
 *   1. A leading `\b` meant `access_token=...` never matched — `_token` has
 *      no word boundary before `token`. The literal names our own code uses
 *      (`access_token`, `refresh_token`, `token_secret_id`) were the exact
 *      shapes it missed. Now any key *ending or containing* a sensitive word
 *      matches.
 *   2. `key=value` matched but `"key": "value"` did not, so a secret inside
 *      a JSON body passed straight through. Provider error bodies are JSON,
 *      and O8 forwards a snippet of them by design — this is the common case
 *      here, not an edge one.
 */
const SENSITIVE_TEXT_PATTERN = /([A-Za-z0-9_-]*(?:password|cookie|token|secret|swid|espn_s2|vault)[A-Za-z0-9_-]*)("?\s*[:=]\s*"?)([^"&\s,;}]+)/gi;
const ESPN_CREDENTIAL_ROUTES = Object.freeze([
  { method: "POST", path: "/api/platforms/espn/connect" },
  { method: "POST", path: "/api/auth/espn/connect" },
  { method: "GET", path: "/api/espn/roster" },
]);

/**
 * Demo Mode must never reach the real error-tracking project.
 *
 * facts-of-record #7: mock and live data stay separated. A demo-fixture
 * failure is not a production signal — it is a bug in a deterministic
 * sample, and letting it group alongside real user errors makes genuine
 * issues harder to see. Two independent guards, because either one alone
 * has a hole: the route prefix catches anything thrown under /api/demo
 * even when nobody remembered to tag it, and the explicit tag catches
 * demo-derived work that runs outside a demo request (a cron, a job).
 */
const DEMO_ROUTE_PREFIXES = Object.freeze(["/api/demo"]);
const DEMO_MODE_TAG = "omen_mode";
const DEMO_MODE_TAG_VALUE = "demo";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function scrubText(value) {
  if (typeof value !== "string") return value;
  return value.replace(SENSITIVE_TEXT_PATTERN, (_match, key, separator) => `${key}${separator}${SCRUBBED}`);
}

function scrubValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (typeof value === "string") {
    return scrubText(value);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? SCRUBBED : scrubValue(entry),
    ]),
  );
}

function scrubHeaders(headers) {
  if (!isPlainObject(headers)) return headers;

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !SENSITIVE_HEADER_PATTERN.test(key)),
  );
}

function parseRequestUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    return new URL(rawUrl, "http://omen.local");
  } catch (_error) {
    return null;
  }
}

function requestPath(rawUrl) {
  return parseRequestUrl(rawUrl)?.pathname || "";
}

function isEspnCredentialRequest(request = {}) {
  const method = String(request.method || "").toUpperCase();
  const path = requestPath(request.url);

  return ESPN_CREDENTIAL_ROUTES.some((route) => {
    const methodMatches = !method || method === route.method;
    return methodMatches && path === route.path;
  });
}

function isDemoRequestPath(rawUrl) {
  const path = requestPath(rawUrl);
  if (!path) return false;
  return DEMO_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isDemoEvent(event = {}) {
  if (event?.tags?.[DEMO_MODE_TAG] === DEMO_MODE_TAG_VALUE) return true;
  return isDemoRequestPath(event?.request?.url);
}

function scrubUrl(rawUrl) {
  const parsed = parseRequestUrl(rawUrl);
  if (!parsed) return rawUrl;

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (SENSITIVE_QUERY_PARAMETER_PATTERN.test(key)) {
      parsed.searchParams.set(key, SCRUBBED);
    }
  }

  const wasAbsolute = /^[a-z][a-z\d+\-.]*:\/\//i.test(rawUrl);
  if (wasAbsolute) return parsed.toString();

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function truncateStackFrames(event) {
  const values = event?.exception?.values;
  if (!Array.isArray(values)) return event;

  for (const exception of values) {
    exception.value = scrubText(exception.value);
    const frames = exception?.stacktrace?.frames;
    if (Array.isArray(frames) && frames.length > 20) {
      exception.stacktrace.frames = frames.slice(-20);
    }
  }

  return event;
}

function shouldDropRequestData(hint) {
  const originalException = hint?.originalException;
  return Boolean(
    originalException
      && typeof originalException === "object"
      && originalException.__skipBodyLog === true,
  );
}

function scrubSentryEvent(event, hint) {
  if (!event) return event;

  if (isDemoEvent(event)) {
    return null;
  }

  if (isEspnCredentialRequest(event?.request)) {
    return null;
  }

  if (event?.request) {
    event.request.url = scrubUrl(event.request.url);
    event.request.headers = scrubHeaders(event.request.headers);

    if (shouldDropRequestData(hint)) {
      delete event.request.data;
    } else if (event.request.data !== undefined) {
      event.request.data = scrubValue(event.request.data);
    }
  }

  if (event?.extra) {
    event.extra = scrubValue(event.extra);
  }

  event.message = scrubText(event.message);

  if (event?.contexts) {
    event.contexts = scrubValue(event.contexts);
  }

  return truncateStackFrames(event);
}

function scrubSentryBreadcrumb(crumb) {
  if (!crumb) return crumb;

  if (crumb?.category === "console") {
    return null;
  }

  if (crumb?.data) {
    return {
      ...crumb,
      message: scrubText(crumb.message),
      data: scrubValue(crumb.data),
    };
  }

  return {
    ...crumb,
    message: scrubText(crumb?.message),
  };
}

function initSentry({ component }) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "",
    enabled: Boolean(process.env.SENTRY_DSN),
    environment: process.env.NODE_ENV || "development",
    release: process.env.GITHUB_SHA || process.env.COMMIT_SHA || undefined,
    serverName: `omen-${component}`,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubSentryBreadcrumb,
  });

  return Sentry.getClient();
}

/**
 * Terminal drain. Sentry.close() flushes *and disables the client* — after
 * this, nothing is ever reported again. Correct when the process is on its
 * way out; a silent, permanent outage of error reporting if used on a path
 * the process survives. Use drainSentry() there instead.
 */
function flushSentry(timeoutMs = 2000) {
  return Sentry.close(timeoutMs);
}

/** Non-terminal drain: send what is queued, keep the client alive. */
function drainSentry(timeoutMs = 2000) {
  return Sentry.flush(timeoutMs);
}

module.exports = {
  DEMO_MODE_TAG,
  drainSentry,
  DEMO_MODE_TAG_VALUE,
  flushSentry,
  initSentry,
  isDemoEvent,
  scrubText,
  scrubValue,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
};
