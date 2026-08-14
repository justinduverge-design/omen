import { apiFetch } from './api.js';

/**
 * Yahoo connections are paused while Yahoo reviews Omen's Fantasy Sports API
 * entitlement for app ZcZJXm8V. This is deliberately a build-time constant
 * rather than a fetched flag: it is the last line of defence, so it must hold
 * even on a screen that never loaded platform status.
 *
 * The server is the real gate (`config.yahoo.enabled` / `YAHOO_ENABLED`); this
 * stops the UI from sending a request it knows will 503, and stops a Connect
 * button from appearing in a state that looks functional.
 *
 * To re-enable: flip YAHOO_ENABLED=true on the API, then set this to true.
 * Every Yahoo code path below is intact and tested — nothing else changes.
 */
export const YAHOO_CONNECTIONS_ENABLED = false;

/** Short, user-facing reason. Keep it factual — no date we cannot hold. */
export const YAHOO_UNAVAILABLE_MESSAGE =
  'Yahoo is on hold while Yahoo reviews our Fantasy API access. Sleeper and ESPN work today.';

export class YahooUnavailableError extends Error {
  constructor() {
    super(YAHOO_UNAVAILABLE_MESSAGE);
    this.name = 'YahooUnavailableError';
    this.code = 'yahoo_unavailable';
  }
}

export async function startYahooOAuth({ leagueId = null } = {}) {
  if (!YAHOO_CONNECTIONS_ENABLED) {
    throw new YahooUnavailableError();
  }

  const body = leagueId ? { leagueId } : {};
  const data = await apiFetch('/api/yahoo/auth', {
    method: 'POST',
    body,
  });

  if (!data?.url) {
    throw new Error('Yahoo authorization URL missing.');
  }

  window.location.href = data.url;
}
