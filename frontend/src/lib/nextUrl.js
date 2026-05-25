const STORAGE_KEY = 'corvus.auth.next';

const ALLOWED_DESTINATIONS = new Set([
  '/',
  '/trade',
  '/draft',
  '/omen',
  '/account/connect',
  '/football',
]);

function sanitize(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  if (raw.length > 256) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    if (raw.startsWith('/api')) return '/';
    if (!ALLOWED_DESTINATIONS.has(url.pathname)) return '/';
    return url.pathname + url.search;
  } catch {
    return '/';
  }
}

export function storeNextUrl(raw) {
  const clean = sanitize(raw);
  if (clean === '/') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, clean);
  }
}

export function consumeNextUrl() {
  const stored = localStorage.getItem(STORAGE_KEY) || '/';
  localStorage.removeItem(STORAGE_KEY);
  return sanitize(stored);
}
