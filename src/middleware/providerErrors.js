"use strict";

/**
 * =================================================================
 * Provider error capture
 * -----------------------------------------------------------------
 * O8. O1b stood GlitchTip up and proved it accepts an error; nothing
 * in src/ actually sent one. This is the seam that does.
 *
 * It sits at each provider's single lowest-level HTTP chokepoint —
 * YahooClient.get(), Sleeper's getJson(), ESPN's doEspnRequest() —
 * so an adapter failure arrives with a stack trace and the provider
 * context needed to act on it, instead of surfacing as an anonymous
 * 500 three layers up.
 *
 * Two hard constraints, both tested:
 *
 *   1. No credential, cookie, or PII may reach the payload. Provider
 *      errors are the *most* dangerous class to report, because the
 *      failing request is the one carrying the token. Context is an
 *      explicit allowlist of non-identifying fields, and everything
 *      still passes through the shared scrubber. ESPN's espn_s2/SWID
 *      never enter this path at all (facts-of-record #6).
 *   2. Demo Mode never reaches the real project (facts-of-record #7).
 *      Enforced here by tag, and again in beforeSend by route.
 * =================================================================
 */

const Sentry = require("@sentry/node");
const {
  DEMO_MODE_TAG,
  DEMO_MODE_TAG_VALUE,
  scrubText,
  scrubValue,
} = require("./sentry");

const SUPPORTED_PROVIDERS = Object.freeze(["yahoo", "sleeper", "espn"]);

/**
 * Provider response bodies are the one field here that is attacker- and
 * vendor-controlled rather than ours. Yahoo returns multi-kilobyte HTML
 * error pages; ESPN returns whole login documents. Cap hard, then scrub.
 */
const MAX_BODY_CHARS = 500;

/**
 * Allowlist, not denylist. A denylist over provider context is how a
 * token ends up in an error report the first time somebody adds a field.
 * League and team identifiers are opaque provider-side ids, not user PII,
 * and they are the whole reason a report is actionable.
 */
const ALLOWED_CONTEXT_KEYS = Object.freeze([
  "league_id",
  "team_id",
  "week",
  "season",
  "path",
  "hostname",
  "http_status",
  "code",
]);

function pickAllowedContext(context) {
  if (!context || typeof context !== "object") return {};

  const picked = {};
  for (const key of ALLOWED_CONTEXT_KEYS) {
    const value = context[key];
    if (value === undefined || value === null) continue;
    picked[key] = typeof value === "string" ? value.slice(0, 200) : value;
  }
  return scrubValue(picked);
}

function providerBodySnippet(error) {
  const body = error?.body;
  if (typeof body !== "string" || body.length === 0) return undefined;
  return scrubText(body.slice(0, MAX_BODY_CHARS));
}

function normalizeProvider(provider) {
  const name = String(provider || "").toLowerCase();
  return SUPPORTED_PROVIDERS.includes(name) ? name : "unknown";
}

/**
 * Report a provider adapter failure.
 *
 * Never throws and never rejects: an error in the error reporter must not
 * become the error the user sees. Returns the Sentry event id, or null
 * when nothing was sent (demo mode, or capture failed).
 */
function captureProviderError({
  provider,
  operation,
  error,
  context = {},
  demo = false,
} = {}) {
  try {
    if (demo) return null;

    const normalizedProvider = normalizeProvider(provider);
    const reported = error instanceof Error
      ? error
      : new Error(scrubText(String(error ?? "unknown provider error")));

    const status = context.http_status ?? error?.status ?? null;

    return Sentry.captureException(reported, {
      tags: {
        provider: normalizedProvider,
        provider_operation: String(operation || "unknown").slice(0, 100),
        ...(status ? { provider_status: String(status) } : {}),
        [DEMO_MODE_TAG]: "live",
      },
      /**
       * Group by provider + operation + status rather than by stack. Every
       * Yahoo failure shares one throw site (the chokepoint), so the default
       * stack fingerprint would collapse a 403 entitlement refusal and a 500
       * outage into one issue — which is exactly the confusion that let the
       * Yahoo 403 run undiagnosed on a bare status code for eight days.
       */
      fingerprint: [
        "provider",
        normalizedProvider,
        String(operation || "unknown"),
        status ? String(status) : "no-status",
      ],
      extra: {
        provider: normalizedProvider,
        operation: String(operation || "unknown"),
        ...pickAllowedContext({ ...context, http_status: status }),
        ...(providerBodySnippet(error) !== undefined
          ? { provider_body_snippet: providerBodySnippet(error) }
          : {}),
        ...(error?.wwwAuthenticate
          ? { www_authenticate: scrubText(String(error.wwwAuthenticate).slice(0, 200)) }
          : {}),
      },
    });
  } catch (_captureFailure) {
    return null;
  }
}

module.exports = {
  ALLOWED_CONTEXT_KEYS,
  DEMO_MODE_TAG,
  DEMO_MODE_TAG_VALUE,
  MAX_BODY_CHARS,
  SUPPORTED_PROVIDERS,
  captureProviderError,
};
