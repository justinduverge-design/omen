export const PRIVATE_FIXTURE_KEYS = Object.freeze({
  OMEN_ROSTER: 'omen-roster',
  PREVIOUS_RESULTS: 'previous-results',
  MOCK_DRAFT: 'mock-draft',
});

const VALID_PRIVATE_FIXTURE_KEYS = new Set(Object.values(PRIVATE_FIXTURE_KEYS));
const QUERY_PARAM_NAMES = ['fixture', 'omen_fixture'];

export function normalizePrivateFixtureKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_PRIVATE_FIXTURE_KEYS.has(normalized) ? normalized : null;
}

export function isPrivateFixtureRuntime(env = import.meta.env) {
  return Boolean(env?.DEV);
}

function resolveSearch(search) {
  if (typeof search === 'string') return search;
  if (typeof window === 'undefined') return '';
  return window.location?.search || '';
}

export function getPrivateFixtureKey({ search, env = import.meta.env } = {}) {
  if (!isPrivateFixtureRuntime(env)) return null;

  const params = new URLSearchParams(resolveSearch(search));
  for (const paramName of QUERY_PARAM_NAMES) {
    const key = normalizePrivateFixtureKey(params.get(paramName));
    if (key) return key;
  }
  return null;
}

export function isPrivateFixtureEnabled(key, options = {}) {
  return getPrivateFixtureKey(options) === normalizePrivateFixtureKey(key);
}
