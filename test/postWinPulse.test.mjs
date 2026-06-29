import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getPostWinSignal,
  getSeenPostWinGameIds,
  hasSeenPostWinGameId,
  markPostWinGameIdSeen,
  teamWinLabel,
} from '../frontend/src/lib/postWinPulse.js';

function memoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, String(value)); },
  };
}

test('getPostWinSignal returns the first connected platform with a latest win', () => {
  const signal = getPostWinSignal({
    sleeper: { connected: true, lastResult: 'L', lastGameId: 'sleeper-loss' },
    yahoo: { connected: true, lastResult: 'W', lastGameId: 42 },
    espn: { connected: true, lastResult: 'W', lastGameId: 'espn-win' },
  });

  assert.deepEqual(signal, {
    platform: 'yahoo',
    lastGameId: '42',
    lastGameKickoff: null,
  });
});

test('getPostWinSignal fails closed without a connected win and game id', () => {
  assert.equal(getPostWinSignal(null), null);
  assert.equal(getPostWinSignal({ sleeper: { connected: true, lastResult: 'W' } }), null);
  assert.equal(getPostWinSignal({ yahoo: { connected: false, lastResult: 'W', lastGameId: '1' } }), null);
  assert.equal(getPostWinSignal({ espn: { connected: true, lastResult: 'L', lastGameId: '1' } }), null);
});

test('seen game ids are stored without corrupting the visible win state', () => {
  const storage = memoryStorage();

  assert.deepEqual(getSeenPostWinGameIds(storage), []);
  assert.equal(hasSeenPostWinGameId('game-1', storage), false);

  markPostWinGameIdSeen('game-1', storage);
  markPostWinGameIdSeen('game-1', storage);

  assert.equal(hasSeenPostWinGameId('game-1', storage), true);
  assert.deepEqual(getSeenPostWinGameIds(storage), ['game-1']);
});

test('teamWinLabel uses the selected team name and a neutral fallback', () => {
  assert.equal(teamWinLabel({ abbr: 'DET', name: 'Lions' }), 'Lions W - bright today');
  assert.equal(teamWinLabel(null), 'Your squad W - bright today');
});
