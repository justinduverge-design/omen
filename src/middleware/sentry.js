"use strict";

const Sentry = require("@sentry/node");

const SCRUBBED = "[scrubbed]";
/**
 * `authorization` joined this list for S4. It was missing, and the miss was
 * live: an axios failure carries `error.config.headers`, which is where a
 * Sleeper or Supabase request's `Authorization` header sits. Anything that
 * put that object into a log line or an error report published the header
 * verbatim — every other key on it was covered, and this one was not.
 */
const SENSITIVE_KEY_PATTERN = /password|cookie|token|secret|swid|espn_s2|vault|authorization/i;
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
const SENSITIVE_TEXT_PATTERN = /([A-Za-z0-9_-]*(?:password|cookie|token|secret|swid|espn_s2|vault|authorization)[A-Za-z0-9_-]*)("?\s*[:=]\s*"?)([^"&\s,;}]+)/gi;

/**
 * OAuth authorization codes, scrubbed separately and narrowly.
 *
 * `code` cannot go in the vocabulary above: that pattern allows any prefix/suffix, so it would
 * also redact `status_code=500`, `error_code=...`, `country_code=US` — destroying the
 * diagnostics an error report exists for. This matches `code` ONLY in query-parameter position,
 * which is where an OAuth code actually appears.
 *
 * Found by A8 on 2026-08-30: a Yahoo/Discord callback error carried `?code=<value>` into the
 * error backend. A code is single-use and short-lived, and it is still a credential.
 */
const OAUTH_CODE_TEXT_PATTERN = /(^|[?&\s])(code)(=)([^&\s"',;}]+)/gi;
/**
 * `Bearer <token>` and `Basic <token>` need their own rule, because the
 * key/value rule above stops a value at the first space — so
 * `authorization: Bearer ya29.secret` would have redacted the word "Bearer"
 * and published the token that follows it. Found by S4's containment tests;
 * the key/value rule alone reported success on the exact string it was
 * failing to protect.
 *
 * Deliberately limited to these two schemes. An `OAuth` challenge header is
 * scheme + `key=value` parameters, already covered above, and blanket-redacting
 * it would destroy the `oauth_problem` diagnostic that made the Yahoo 403
 * tractable in the first place.
 */
const AUTHORIZATION_SCHEME_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
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
  // Scheme first: it is the rule that can see past a space, and running it
  // before the key/value pass means `authorization: Bearer x` loses the token
  // rather than the word "Bearer".
  return value
    .replace(AUTHORIZATION_SCHEME_PATTERN, (_match, scheme) => `${scheme} ${SCRUBBED}`)
    .replace(SENSITIVE_TEXT_PATTERN, (_match, key, separator) => `${key}${separator}${SCRUBBED}`)
    .replace(OAUTH_CODE_TEXT_PATTERN, (_match, lead, key, eq) => `${lead}${key}${eq}${SCRUBBED}`);
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
      // Exact-match `code` rather than substring, for the same reason the text pattern is
      // narrow: `status_code` and `error_code` must survive.
      SENSITIVE_KEY_PATTERN.test(key) || key.toLowerCase() === "code"
        ? SCRUBBED
        : scrubValue(entry),
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
    // A8, 2026-08-30. `query_string` was never passed through the scrubber, so an OAuth
    // callback error delivered `code=<value>` and `access_token=<value>` to the error backend
    // verbatim while the URL beside it was correctly redacted. `beforeSend` covered url,
    // headers, data, extra, message and contexts — and not this one.
    if (event.request.query_string !== undefined) {
      event.request.query_string = scrubText(event.request.query_string);
    }

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

/**
 * Describe the configured DSN without ever exposing its key.
 *
 * This exists because of a real, live production failure found 2026-08-21:
 * both `omen_api` and `omen_cron` carried `SENTRY_DSN` set to the literal
 * string `paste_the_value_here` with a real DSN glued onto the end. The
 * old guard was `enabled: Boolean(process.env.SENTRY_DSN)` — a non-empty
 * string, so the SDK reported `enabled: true`, built **no transport**, and
 * dropped every event in silence. Omen reported errors nowhere at all,
 * and nothing anywhere said so.
 *
 * That is the worst failure mode a monitoring tool has: a configuration
 * mistake that looks exactly like "no errors happening". Truthiness is not
 * validity, and a health check that only asks "is it set?" would have gone
 * on passing this forever.
 *
 * Returns only host and project id — never the key, so this is safe to put
 * in an API response and safe to log.
 */
function describeSentryDsn(rawDsn = process.env.SENTRY_DSN) {
  const raw = typeof rawDsn === "string" ? rawDsn.trim() : "";

  if (!raw) {
    return { configured: false, valid: false, host: null, project_id: null, reason: "not_configured" };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_error) {
    // The production failure lands here: "paste_the_value_herehttps://…"
    // has an underscore in its scheme, which is not a legal URL scheme, so
    // it throws rather than parsing. It is still a perfectly truthy string,
    // which is exactly why the old Boolean() guard waved it through.
    return { configured: true, valid: false, host: null, project_id: null, reason: "unparseable" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { configured: true, valid: false, host: null, project_id: null, reason: "bad_scheme" };
  }

  if (!parsed.username) {
    return { configured: true, valid: false, host: parsed.host, project_id: null, reason: "missing_key" };
  }

  /**
   * The SDK's own DSN grammar accepts only [A-Za-z0-9_] in the public key.
   * This matters concretely: GlitchTip mints project keys as dashed UUIDs,
   * and @sentry/node rejects those outright with "Invalid Sentry Dsn" — the
   * dashes must be stripped. GlitchTip accepts the undashed form.
   *
   * Checked here because a validator looser than the SDK reintroduces the
   * exact bug this function exists to prevent: /api/ready would report
   * error tracking healthy while every event was being dropped.
   */
  if (!/^[A-Za-z0-9_]+$/.test(parsed.username)) {
    return { configured: true, valid: false, host: parsed.host, project_id: null, reason: "key_not_sdk_parseable" };
  }

  const projectId = parsed.pathname.replace(/^\/+/, "");
  if (!projectId) {
    return { configured: true, valid: false, host: parsed.host, project_id: null, reason: "missing_project_id" };
  }

  return { configured: true, valid: true, host: parsed.host, project_id: projectId, reason: null };
}

function initSentry({ component }) {
  const dsn = describeSentryDsn();

  if (dsn.configured && !dsn.valid) {
    // Boot-time, before the logger exists. Loud on purpose: the entire cost
    // of this bug was that it made no noise.
    console.error(
      `[sentry] SENTRY_DSN is set but INVALID (${dsn.reason}) — error reporting is DISABLED. `
      + "No errors will be reported by this process until it is corrected. "
      + "Check GET /api/ready -> checks.error_tracking.",
    );
  }

  Sentry.init({
    dsn: dsn.valid ? process.env.SENTRY_DSN.trim() : "",
    // Validity, not truthiness. A malformed DSN must report as disabled
    // rather than as an enabled client that quietly drops everything.
    enabled: dsn.valid,
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
  describeSentryDsn,
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
