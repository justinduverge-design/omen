// Onboarding completion state.
//
// This used to live as a bare `localStorage` read in every consumer, which made
// the local flag the *only* record that a user had finished setup. Clearing
// storage, a new browser, an incognito window, or a second device therefore sent
// an established account back through onboarding — even though `/api/platforms`
// already knew the account had a connected league. The server is the durable
// record; the local flag is a cache in front of it.

const DONE_KEY = 'omen.onboarding.done';
const LEGACY_DONE_KEY = 'corvus.onboarding.done';
const PLATFORM_KEYS = ['sleeper', 'yahoo', 'espn'];

export function isOnboardingDone() {
  return Boolean(
    localStorage.getItem(DONE_KEY) || localStorage.getItem(LEGACY_DONE_KEY),
  );
}

export function markOnboardingDone() {
  localStorage.setItem(DONE_KEY, 'true');
}

export function hasConnectedPlatform(data) {
  return PLATFORM_KEYS.some((platform) => data?.platforms?.[platform]?.connected === true);
}

// Hydrate the local flag from the server. `fetchPlatforms` is injected so this
// stays testable without a network or a DOM.
//
// Fails closed: a network error, an unauthenticated response, or a malformed
// payload leaves the flag untouched and returns false, so a failed check sends
// the user through onboarding rather than silently past it.
export async function syncOnboardingFromServer(fetchPlatforms) {
  try {
    const data = await fetchPlatforms('/api/platforms');
    if (!hasConnectedPlatform(data)) return false;
    markOnboardingDone();
    return true;
  } catch {
    return false;
  }
}
