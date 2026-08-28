import { apiFetch } from './api.js';

/**
 * Yahoo connections are ENABLED as of 2026-08-28. Yahoo granted the Fantasy
 * Sports API entitlement for app ZcZJXm8V; a live probe from inside the
 * production container returned 200 on both `/game/nfl` (public game metadata)
 * and `/users;use_login=1/games` (user-scoped), where every call had returned
 * 403 "This application is not authorized to perform this action." since
 * 2026-08-13. `YAHOO_ENABLED=true` was set on omen_api and omen_cron the same
 * day, so the server gate is open too.
 *
 * This stays a build-time constant rather than a fetched flag: it is the last
 * line of defence, so it must hold even on a screen that never loaded platform
 * status. The server is the real gate (`config.yahoo.enabled` / `YAHOO_ENABLED`).
 *
 * To pause Yahoo again: set this to false AND set YAHOO_ENABLED=false on the
 * API, in that order. Both halves are required — either one alone leaves a
 * path that looks functional and is not.
 */
export const YAHOO_CONNECTIONS_ENABLED = true;

/** Short, user-facing reason. Keep it factual — no date we cannot hold. */
export const YAHOO_UNAVAILABLE_MESSAGE =
  'Yahoo is on hold while Yahoo reviews our Fantasy API access. Sleeper connects in a minute; ESPN needs one step on a computer.';

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
