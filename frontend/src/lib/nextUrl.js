const STORAGE_KEY = 'omen.auth.next';
const LEGACY_STORAGE_KEY = 'corvus.auth.next';

const ALLOWED_DESTINATIONS = new Set([
  '/',
  '/trade',
  // '/draft' removed 2026-08-16 (P1-DraftAssistantSideline). The route no
  // longer exists, so leaving it allowlisted meant a stored or crafted
  // `?next=/draft` would pass validation and land the user on a 404 after
  // sign-in. An allowlist entry for a route that does not exist is a dead end,
  // not a permission.
  '/omen',
  '/account',
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

export function consumeNextUrl(fallback = '/account') {
  const stored = localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem(LEGACY_STORAGE_KEY)
    || fallback;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return sanitize(stored);
}

// Destinations that are not a valid place to land *after finishing connect*.
// '/account/connect' is the trap: ConnectLeague stores it when a signed-out
// visitor hits the page, so honoring the stored value verbatim returns the user
// to the screen they just completed. '/' is what sanitize() returns for anything
// it rejects.
const CONNECT_DEAD_ENDS = new Set(['/', '/account/connect', '/onboarding']);

// Where "Continue" goes after a league is connected. Defaults to the dashboard,
// not '/account' — finishing onboarding should land on the product, not on
// settings.
export function consumeConnectDestination() {
  const dest = consumeNextUrl('/football');
  const [pathname] = dest.split('?');
  return CONNECT_DEAD_ENDS.has(pathname) ? '/football' : dest;
}
