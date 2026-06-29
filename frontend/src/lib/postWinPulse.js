export const POST_WIN_SEEN_KEY = 'omen.postWinPulse.seenGameIds';

const PLATFORM_PRIORITY = ['sleeper', 'yahoo', 'espn'];

export function getPostWinSignal(platforms) {
  if (!platforms || typeof platforms !== 'object') return null;

  for (const platform of PLATFORM_PRIORITY) {
    const entry = platforms[platform];
    if (entry?.connected && entry.lastResult === 'W' && entry.lastGameId) {
      return {
        platform,
        lastGameId: String(entry.lastGameId),
        lastGameKickoff: entry.lastGameKickoff ?? null,
      };
    }
  }

  return null;
}

export function getSeenPostWinGameIds(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(POST_WIN_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export function hasSeenPostWinGameId(gameId, storage = globalThis.localStorage) {
  if (!gameId) return false;
  return getSeenPostWinGameIds(storage).includes(String(gameId));
}

export function markPostWinGameIdSeen(gameId, storage = globalThis.localStorage) {
  if (!gameId) return;
  try {
    const seen = new Set(getSeenPostWinGameIds(storage));
    seen.add(String(gameId));
    storage?.setItem?.(POST_WIN_SEEN_KEY, JSON.stringify([...seen].slice(-12)));
  } catch {
    // localStorage is cosmetic here; failed persistence should not hide the win state.
  }
}

export function teamWinLabel(team) {
  if (!team) return 'Your squad W - bright today';
  const label = team.name || team.abbr || 'Your squad';
  return `${label} W - bright today`;
}
