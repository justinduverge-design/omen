import * as Sentry from '@sentry/react';

const SCRUBBED = '[scrubbed]';
const SENSITIVE_KEY_PATTERN = /password|cookie|token|secret|swid|espn_s2|vault/i;
const SENSITIVE_HEADER_PATTERN = /^(cookie|set-cookie|authorization|x-api-key)$|token|secret/i;
const SENSITIVE_TEXT_PATTERN = /\b(password|cookie|token|secret|swid|espn_s2|vault)(\s*[:=]\s*)([^&\s,;]+)/gi;
const ESPN_CREDENTIAL_URL_PATTERNS = [
  /\/api\/platforms\/espn\/connect(?:[/?#]|$)/i,
  /\/api\/auth\/espn\/connect(?:[/?#]|$)/i,
  /\/api\/espn\/roster(?:[/?#]|$)/i,
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scrubText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(SENSITIVE_TEXT_PATTERN, (_match, key, separator) => `${key}${separator}${SCRUBBED}`);
}

function scrubValue(value) {
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  if (typeof value === 'string') return scrubText(value);
  if (!isPlainObject(value)) return value;
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
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://omen.local';
    return new URL(rawUrl, base);
  } catch (_error) {
    return null;
  }
}

function isEspnCredentialUrl(rawUrl) {
  const parsed = parseRequestUrl(rawUrl);
  const path = parsed?.pathname || rawUrl || '';
  return ESPN_CREDENTIAL_URL_PATTERNS.some((pattern) => pattern.test(path));
}

function scrubUrl(rawUrl) {
  const parsed = parseRequestUrl(rawUrl);
  if (!parsed) return rawUrl;
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
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
      && typeof originalException === 'object'
      && originalException.__skipBodyLog === true,
  );
}

export function scrubSentryEvent(event, hint) {
  if (!event) return event;

  const requestUrl = event?.request?.url;
  if (requestUrl && isEspnCredentialUrl(requestUrl)) return null;
  if (event?.transaction && isEspnCredentialUrl(event.transaction)) return null;

  if (event?.request) {
    event.request.url = scrubUrl(event.request.url);
    event.request.headers = scrubHeaders(event.request.headers);

    if (shouldDropRequestData(hint)) {
      delete event.request.data;
    } else if (event.request.data !== undefined) {
      event.request.data = scrubValue(event.request.data);
    }
  }

  if (event?.extra) event.extra = scrubValue(event.extra);
  event.message = scrubText(event.message);
  if (event?.contexts) event.contexts = scrubValue(event.contexts);

  return truncateStackFrames(event);
}

export function scrubSentryBreadcrumb(crumb) {
  if (!crumb) return crumb;
  if (crumb?.category === 'console') return null;

  if (crumb?.category === 'fetch' || crumb?.category === 'xhr') {
    const breadcrumbUrl = crumb?.data?.url;
    if (breadcrumbUrl && isEspnCredentialUrl(breadcrumbUrl)) return null;
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

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || '';
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_COMMIT_SHA || undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubSentryBreadcrumb,
  });
  return Sentry.getClient();
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
