import { apiFetch } from './api.js';

export async function startYahooOAuth({ leagueId = null } = {}) {
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
