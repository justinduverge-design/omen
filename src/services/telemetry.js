"use strict";

/**
 * Self-hosted OpenTelemetry tracing. Off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
 *
 * Why it looks like this:
 *
 *   - Off by default. With no endpoint (or OTEL_ENABLED=false) no SDK is loaded, no
 *     provider exists and withSpan() is a single boolean check before calling fn.
 *   - Self-hosted only (facts-of-record #17). There is no default endpoint, and an
 *     endpoint whose host is not private (our tailnet's MagicDNS suffix from
 *     OTEL_TAILNET_SUFFIX, 100.64/10, RFC 1918,
 *     loopback or a single-label Docker service name) is refused and tracing stays off.
 *   - Nothing global. The provider is ours and is never registered with
 *     @opentelemetry/api, and context lives in a private AsyncLocalStorage. Sentry 11
 *     leaves `enableOpenTelemetrySetup` false by default (no tracer provider, no
 *     context manager), so there is nothing to conflict with, and libraries that
 *     self-instrument through the global API (supabase-js) keep getting the no-op
 *     tracer: their spans, with URLs in them, never reach us.
 *   - Privacy. Attributes pass an allowlist of keys and short primitive values. No
 *     user ids, emails, league ids, cookies, tokens, bodies, query strings or headers.
 *     Requests are named by route template, never the raw URL. Errors record only
 *     `error.type` (the class name), never the message.
 */

const { AsyncLocalStorage } = require("node:async_hooks");

const SAFE_ATTRIBUTE_KEYS = new Set([
  "http.request.method",
  "http.route",
  "http.response.status_code",
  "omen.platform",
  "omen.stage",
  "omen.outcome",
  "omen.state",
  "omen.candidates",
  "omen.selected_type",
  "cron.job",
  "error.type",
]);
const MAX_ATTRIBUTE_STRING = 64;
const DEFAULT_SAMPLE_RATIO = 0.1;

const NOOP_SPAN = Object.freeze({ setAttributes() {}, setAttribute() {} });

let state = null; // { provider, tracer, api, storage } when enabled

function safeAttributes(attributes) {
  const out = {};
  if (!attributes || typeof attributes !== "object") return out;
  for (const [key, value] of Object.entries(attributes)) {
    if (!SAFE_ATTRIBUTE_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "string" && value.length <= MAX_ATTRIBUTE_STRING) out[key] = value;
  }
  return out;
}

function isPrivateHost(hostname, env = process.env) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host === "::1") return true;
  // Only our own tailnet: any *.ts.net would also admit another tailnet's public Funnel host.
  const tailnet = String(env.OTEL_TAILNET_SUFFIX || "").trim().toLowerCase().replace(/^\./, "");
  if (tailnet.endsWith(".ts.net") && host.endsWith(`.${tailnet}`)) return true;
  if (!host.includes(".") && !host.includes(":")) return true; // Docker service name
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets;
  return a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127); // Tailscale CGNAT range
}

function tracesUrl(endpoint) {
  const trimmed = endpoint.replace(/\/+$/, "");
  return trimmed.endsWith("/v1/traces") ? trimmed : `${trimmed}/v1/traces`;
}

function sampleRatio(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return DEFAULT_SAMPLE_RATIO;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_SAMPLE_RATIO;
}

/**
 * Describe whether tracing would be on, without loading anything.
 * Returns { enabled, reason, url? }.
 */
function describeTelemetryConfig(env = process.env) {
  if (String(env.OTEL_ENABLED || "").trim().toLowerCase() === "false") return { enabled: false, reason: "disabled" };
  const endpoint = String(env.OTEL_EXPORTER_OTLP_ENDPOINT || "").trim();
  if (!endpoint) return { enabled: false, reason: "not_configured" };
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch (_error) {
    return { enabled: false, reason: "unparseable" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { enabled: false, reason: "bad_scheme" };
  if (parsed.username || parsed.password) return { enabled: false, reason: "credentials_in_url" };
  if (!isPrivateHost(parsed.hostname, env)) return { enabled: false, reason: "not_private_host" };
  return { enabled: true, reason: null, url: tracesUrl(endpoint) };
}

/**
 * Start tracing for this process. Safe to call more than once; the first call wins.
 * `exporter` is for tests (in-memory, exported synchronously).
 */
function initTelemetry({ component, env = process.env, exporter = null } = {}) {
  if (state) return true;
  const config = exporter ? { enabled: true } : describeTelemetryConfig(env);
  if (!config.enabled) {
    if (config.reason !== "not_configured" && config.reason !== "disabled") {
      // Boot-time, loud on purpose, and never echoes the endpoint value.
      console.error(`[telemetry] OTEL_EXPORTER_OTLP_ENDPOINT is set but refused (${config.reason}); tracing is OFF.`);
    }
    return false;
  }

  const api = require("@opentelemetry/api");
  const { resourceFromAttributes } = require("@opentelemetry/resources");
  const {
    BatchSpanProcessor,
    ParentBasedSampler,
    SimpleSpanProcessor,
    TraceIdRatioBasedSampler,
    TracerProvider,
  } = require("@opentelemetry/sdk-trace");

  const serviceName = String(component || "").startsWith("cron") ? "omen-cron" : "omen-api";
  const resourceAttributes = {
    "service.name": serviceName,
    "service.version": env.GITHUB_SHA || env.BUILD_ID || env.COMMIT_SHA || "unknown",
    "deployment.environment.name": env.NODE_ENV || "development",
  };
  if (component) resourceAttributes["service.component"] = String(component).slice(0, MAX_ATTRIBUTE_STRING);

  let processor;
  if (exporter) {
    processor = new SimpleSpanProcessor({ exporter });
  } else {
    const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
    processor = new BatchSpanProcessor({ exporter: new OTLPTraceExporter({ url: config.url }) });
  }

  const provider = new TracerProvider({
    resource: resourceFromAttributes(resourceAttributes),
    // A cron run is one rare trace, so cron (and tests) sample everything unless
    // OTEL_TRACES_SAMPLER_ARG says otherwise. The API defaults to 0.1.
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(
        sampleRatio(env.OTEL_TRACES_SAMPLER_ARG ?? (exporter || serviceName === "omen-cron" ? "1" : undefined)),
      ),
    }),
    spanProcessors: [processor],
  });

  state = {
    api,
    provider,
    tracer: provider.getTracer("omen"),
    storage: new AsyncLocalStorage(),
  };
  return true;
}

function isTelemetryEnabled() {
  return state !== null;
}

function endWithError(span, error) {
  const { api } = state;
  span.setAttributes(safeAttributes({ "error.type": (error && error.name) || "Error" }));
  span.setStatus({ code: api.SpanStatusCode.ERROR });
  span.end();
}

/**
 * Run fn inside a span. fn receives a span handle whose setAttributes() is filtered by
 * the allowlist. Works for sync and async fn; the return value (or throw) passes through.
 */
function withSpan(name, fn, attributes) {
  if (!state) return fn(NOOP_SPAN);
  const { api, tracer, storage } = state;
  const parent = storage.getStore() || api.ROOT_CONTEXT;
  const span = tracer.startSpan(name, { attributes: safeAttributes(attributes) }, parent);
  const handle = {
    setAttributes(attrs) { span.setAttributes(safeAttributes(attrs)); },
    setAttribute(key, value) { span.setAttributes(safeAttributes({ [key]: value })); },
  };
  let result;
  try {
    result = storage.run(api.trace.setSpan(parent, span), () => fn(handle));
  } catch (error) {
    endWithError(span, error);
    throw error;
  }
  if (result && typeof result.then === "function") {
    return result.then(
      (value) => { span.end(); return value; },
      (error) => { endWithError(span, error); throw error; },
    );
  }
  span.end();
  return result;
}

function routeTemplate(req) {
  if (req.route && typeof req.route.path === "string") return `${req.baseUrl || ""}${req.route.path}`;
  return "unmatched";
}

/**
 * Express middleware: one `http.request` span per request, named by route template.
 * Reads only the method, the matched route and the status code.
 */
function requestSpanMiddleware(req, res, next) {
  if (!state) return next();
  const { api, tracer, storage } = state;
  const method = typeof req.method === "string" && req.method.length <= 10 ? req.method : "OTHER";
  const span = tracer.startSpan("http.request", { attributes: { "http.request.method": method } }, api.ROOT_CONTEXT);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    const route = routeTemplate(req);
    span.updateName(`${method} ${route}`);
    span.setAttributes(safeAttributes({ "http.route": route, "http.response.status_code": res.statusCode }));
    if (res.statusCode >= 500) span.setStatus({ code: api.SpanStatusCode.ERROR });
    span.end();
  };
  res.once("finish", finish);
  res.once("close", finish);
  return storage.run(api.trace.setSpan(api.ROOT_CONTEXT, span), () => next());
}

/**
 * Express middleware for a child span that covers one mounted router, ended when the
 * response finishes. Used for /api/trade so the trade search is timed at the route level.
 */
function routeSpanMiddleware(name) {
  return function routeSpan(req, res, next) {
    if (!state) return next();
    const { api, tracer, storage } = state;
    const parent = storage.getStore() || api.ROOT_CONTEXT;
    const span = tracer.startSpan(name, {}, parent);
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      span.setAttributes(safeAttributes({ "http.route": routeTemplate(req), "http.response.status_code": res.statusCode }));
      if (res.statusCode >= 500) span.setStatus({ code: api.SpanStatusCode.ERROR });
      span.end();
    };
    res.once("finish", finish);
    res.once("close", finish);
    return storage.run(api.trace.setSpan(parent, span), () => next());
  };
}

/** Run a cron job inside `cron.<job>` and flush before returning. */
async function traceCronJob(job, fn) {
  initTelemetry({ component: `cron-${job}` });
  try {
    return await withSpan(`cron.${job}`, () => fn(), { "cron.job": job });
  } finally {
    await shutdownTelemetry();
  }
}

/** Flush and stop. Never throws, bounded by timeoutMs. */
async function shutdownTelemetry(timeoutMs = 2000) {
  if (!state) return;
  const { provider } = state;
  state = null;
  let timer;
  await Promise.race([
    provider.shutdown().catch(() => {}),
    new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs); timer.unref?.(); }),
  ]);
  clearTimeout(timer);
}

module.exports = {
  SAFE_ATTRIBUTE_KEYS,
  describeTelemetryConfig,
  initTelemetry,
  isPrivateHost,
  isTelemetryEnabled,
  requestSpanMiddleware,
  routeSpanMiddleware,
  safeAttributes,
  sampleRatio,
  shutdownTelemetry,
  traceCronJob,
  withSpan,
};
