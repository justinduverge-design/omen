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

/**
 * The three answers `/api/platforms` can actually support.
 *
 * `UNKNOWN` is the one that was missing, and its absence was a real defect: the
 * old `syncOnboardingFromServer` returned a bare `false` for "no connection" AND
 * for "the request failed". `ProtectedRoute` read that `false` as "new user" and
 * redirected to `/onboarding`, so a single flaky `/api/platforms` response threw
 * an established user back to the first setup screen — the loop beta users kept
 * reporting after signing in with Google.
 *
 * A failed check is not evidence about the user. It is evidence about the
 * network.
 */
export const OnboardingStatus = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'not-connected',
  UNKNOWN: 'unknown',
};

export function isOnboardingDone() {
  try {
    return Boolean(
      localStorage.getItem(DONE_KEY) || localStorage.getItem(LEGACY_DONE_KEY),
    );
  } catch {
    // Private mode, or storage blocked. The server record still decides.
    return false;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(DONE_KEY, 'true');
  } catch {
    // Losing the cache costs one extra `/api/platforms` read, not correctness.
  }
}

export function hasConnectedPlatform(data) {
  return PLATFORM_KEYS.some((platform) => data?.platforms?.[platform]?.connected === true);
}

/**
 * Ask the server whether this account has a connected league.
 *
 * `fetchPlatforms` is injected so this stays testable without a network or a DOM.
 * A `CONNECTED` answer also refreshes the local cache, so the next page load can
 * skip the round trip.
 */
export async function resolveOnboardingStatus(fetchPlatforms) {
  let data;
  try {
    data = await fetchPlatforms('/api/platforms');
  } catch {
    // Every failure is UNKNOWN, including a 401. A 401 IS an answer, but it is an
    // answer about the *session*, and the auth gate already owns that — treating
    // it here would let the onboarding gate redirect on a problem it cannot fix.
    // Offline, 500, timeout, and a malformed body tell us nothing about the user
    // at all, and guessing is how a returning account gets re-onboarded.
    return OnboardingStatus.UNKNOWN;
  }

  if (hasConnectedPlatform(data)) {
    markOnboardingDone();
    return OnboardingStatus.CONNECTED;
  }
  return OnboardingStatus.NOT_CONNECTED;
}

/**
 * @deprecated Collapses `NOT_CONNECTED` and `UNKNOWN` into one `false`, which is
 * the defect `resolveOnboardingStatus` exists to fix. Kept only so a caller that
 * genuinely wants "did this definitely succeed" reads clearly at the call site.
 */
export async function syncOnboardingFromServer(fetchPlatforms) {
  return (await resolveOnboardingStatus(fetchPlatforms)) === OnboardingStatus.CONNECTED;
}
