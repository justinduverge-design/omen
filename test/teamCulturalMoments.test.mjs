import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NFL_TEAMS } from '../frontend/src/data/nflTeams.js';
import { getTeamTemplate } from '../frontend/src/lib/teamTemplate.js';
import { assertCategoryShape } from '../frontend/src/lib/assertCategoryShape.js';
import { resolveActiveMoments, scopesForRoute } from '../frontend/src/lib/culturalMoments.js';

function findTeam(abbr) {
  return NFL_TEAMS.find((team) => team.abbr === abbr);
}

const DURING_THANKSGIVING = new Date('2026-11-26T12:00:00');
const DURING_MARDI_GRAS = new Date('2026-02-12T12:00:00');
const BEFORE_MARDI_GRAS = new Date('2026-02-07T12:00:00');

// localStorage shim for the manual-flag activation path (node has no DOM).
function withManualFlags(flags, fn) {
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (key === 'omen.theme.moments' ? JSON.stringify(flags) : null),
  };
  try {
    return fn();
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
}

test('DET, NO, GB declare valid culturalMoments', () => {
  for (const abbr of ['DET', 'NO', 'GB']) {
    const team = findTeam(abbr);
    assert.ok(team, `${abbr} exists`);
    assert.ok(Array.isArray(team.culturalMoments) && team.culturalMoments.length > 0, `${abbr} ships a moment`);
    assert.doesNotThrow(() => assertCategoryShape(team), `${abbr} category shape is valid`);
  }
});

test('no moment scope includes the recommendation surfaces omen/trade', () => {
  for (const team of NFL_TEAMS) {
    for (const moment of team.culturalMoments ?? []) {
      assert.ok(!moment.scope.includes('omen'), `${team.abbr} ${moment.id} excludes omen`);
      assert.ok(!moment.scope.includes('trade'), `${team.abbr} ${moment.id} excludes trade`);
    }
  }
  // /omen and /trade resolve to an empty scope set regardless of team.
  assert.deepEqual(scopesForRoute('/omen'), []);
  assert.deepEqual(scopesForRoute('/trade'), []);
});

test('resolver fails closed when data mode is not mock', () => {
  const det = findTeam('DET');
  const base = { now: DURING_THANKSGIVING, route: '/football', variant: 'official' };
  assert.deepEqual(resolveActiveMoments(det, { ...base, dataMode: 'live' }), []);
  assert.deepEqual(resolveActiveMoments(det, { ...base, dataMode: null }), []);
  assert.deepEqual(resolveActiveMoments(det, { ...base, dataMode: undefined }), []);
  // ...and renders in mock mode on its date.
  const active = resolveActiveMoments(det, { ...base, dataMode: 'mock' });
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'det-thanksgiving-classic');
});

test('DET date-list activates only on its hand-curated dates', () => {
  const det = findTeam('DET');
  const base = { dataMode: 'mock', route: '/football', variant: 'official' };
  assert.equal(resolveActiveMoments(det, { ...base, now: DURING_THANKSGIVING }).length, 1);
  assert.equal(resolveActiveMoments(det, { ...base, now: new Date('2026-11-25T12:00:00') }).length, 0);
});

test('DET eyebrow resolves a real hex and the moment is scoped off /trade', () => {
  const det = findTeam('DET');
  const active = resolveActiveMoments(det, {
    dataMode: 'mock', route: '/football', variant: 'official', now: DURING_THANKSGIVING,
  });
  assert.match(active[0].eyebrowColor, /^#[0-9a-fA-F]{6}$/);
  // Same team, recommendation route → suppressed.
  assert.equal(resolveActiveMoments(det, {
    dataMode: 'mock', route: '/trade', variant: 'official', now: DURING_THANKSGIVING,
  }).length, 0);
});

test('NO Mardi Gras activates in its date-range on the Special variant only', () => {
  const no = findTeam('NO');
  const base = { dataMode: 'mock', route: '/account' };
  // Special palette carries secondary + tertiary → eyebrow + tint resolve.
  const special = resolveActiveMoments(no, { ...base, variant: 'special', now: DURING_MARDI_GRAS });
  assert.equal(special.length, 1);
  assert.ok(special[0].surfaceTint, 'tint resolves on the Mardi Gras palette');
  assert.ok(special[0].surfaceTintAlpha <= 0.18);
  // Official palette has no secondary/tertiary → graceful suppression.
  assert.equal(resolveActiveMoments(no, { ...base, variant: 'official', now: DURING_MARDI_GRAS }).length, 0);
  // Outside the window → suppressed even on the special palette.
  assert.equal(resolveActiveMoments(no, { ...base, variant: 'special', now: BEFORE_MARDI_GRAS }).length, 0);
});

test('tint is suppressed on eyebrow-only routes (page-system posture) but the eyebrow stays', () => {
  const no = findTeam('NO');
  // /account allows the tint...
  const onAccount = resolveActiveMoments(no, {
    dataMode: 'mock', route: '/account', variant: 'special', now: DURING_MARDI_GRAS,
  });
  assert.ok(onAccount[0].surfaceTint, 'tint paints on /account');
  // ...but /account/appearance is eyebrow-only: moment still renders, tint dropped.
  const onAppearance = resolveActiveMoments(no, {
    dataMode: 'mock', route: '/account/appearance', variant: 'special', now: DURING_MARDI_GRAS,
  });
  assert.equal(onAppearance.length, 1, 'eyebrow still renders on appearance');
  assert.equal(onAppearance[0].surfaceTint, null, 'tint suppressed on appearance');
});

test('NO Mardi Gras is out of scope on /football (scope is app+account only -> app=football)', () => {
  // 'app' maps to the /football dashboard, so NO (['app','account']) DOES
  // surface on /football. /ledger is out of NO's scope, however.
  const no = findTeam('NO');
  assert.equal(resolveActiveMoments(no, {
    dataMode: 'mock', route: '/ledger', variant: 'special', now: DURING_MARDI_GRAS,
  }).length, 0);
});

test('GB Lambeau requires the manual localStorage flag', () => {
  const gb = findTeam('GB');
  const base = { dataMode: 'mock', route: '/football', variant: 'official', now: new Date('2026-06-25T12:00:00') };
  // No flag → suppressed.
  assert.equal(withManualFlags({}, () => resolveActiveMoments(gb, base)).length, 0);
  // Flag true → active.
  const active = withManualFlags({ 'gb-lambeau-tundra': true }, () => resolveActiveMoments(gb, base));
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'gb-lambeau-tundra');
  // Flag false → suppressed.
  assert.equal(withManualFlags({ 'gb-lambeau-tundra': false }, () => resolveActiveMoments(gb, base)).length, 0);
});

test('dev override forces activation off-calendar but still respects scope + data mode', () => {
  const det = findTeam('DET');
  const offDate = new Date('2026-06-25T12:00:00');
  // Forced active on an off-calendar day, in mock mode, on a scoped route.
  const active = resolveActiveMoments(det, {
    dataMode: 'mock', route: '/standings', variant: 'official', now: offDate,
    devOverrideId: 'det-thanksgiving-classic',
  });
  assert.equal(active.length, 1);
  // Override does NOT bypass fail-closed.
  assert.equal(resolveActiveMoments(det, {
    dataMode: 'live', route: '/standings', variant: 'official', now: offDate,
    devOverrideId: 'det-thanksgiving-classic',
  }).length, 0);
  // Override does NOT bypass scope (/trade is never scoped).
  assert.equal(resolveActiveMoments(det, {
    dataMode: 'mock', route: '/trade', variant: 'official', now: offDate,
    devOverrideId: 'det-thanksgiving-classic',
  }).length, 0);
});

test('moment layer preserves Phase 1.5h accent fallthrough pins', () => {
  assert.equal(getTeamTemplate('NYG', 'official').accent.hex, '#A71930');
  assert.equal(getTeamTemplate('HOU', 'official').accent.hex, '#A71930');
  assert.equal(getTeamTemplate('PHI', 'official').accent.hex, '#A5ACAF');
  assert.equal(getTeamTemplate('SF', 'official').accent.hex, '#B3995D');
  assert.equal(getTeamTemplate('TB', 'official').accent.hex, '#D50A0A');
  assert.equal(getTeamTemplate('ATL', 'official').accent.hex, '#A71930');
});
