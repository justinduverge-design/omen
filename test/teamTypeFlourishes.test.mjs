import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { NFL_TEAMS } from '../frontend/src/data/nflTeams.js';
import { getTeamTemplate } from '../frontend/src/lib/teamTemplate.js';
import { assertCategoryShape } from '../frontend/src/lib/assertCategoryShape.js';

function findTeam(abbr) {
  return NFL_TEAMS.find((team) => team.abbr === abbr);
}

test('NE declares a valid eyebrow typeFlourish and resolves it for both variants', () => {
  const team = findTeam('NE');
  assert.ok(team, 'NE exists');
  assert.ok(Array.isArray(team.typeFlourishes), 'NE declares typeFlourishes array');
  assert.ok(team.typeFlourishes.length > 0, 'NE ships at least one flourish');

  assert.doesNotThrow(() => assertCategoryShape(team), 'NE category shape is valid');

  const official = getTeamTemplate('NE', 'official');
  assert.ok(official.typeFlourishes.active.length > 0, 'official variant resolves the flourish');
  assert.equal(official.typeFlourishes.active[0].scope, 'eyebrow');

  const special = getTeamTemplate('NE', 'special');
  assert.ok(special.typeFlourishes.active.length > 0, 'special variant resolves the flourish');
});

test('typography lock rejects italic-700 (not loaded by the Google Fonts @import)', () => {
  const fakeTeam = {
    abbr: 'ZZ',
    typeFlourishes: [
      {
        id: 'zz-bad-flourish',
        scope: 'eyebrow',
        family: 'Alegreya Sans',
        weight: 700,
        style: 'italic',
        variantCaps: 'small-caps',
        tracking: '0.12em',
        fontFeatures: '"smcp" 1',
        enabledInVariant: ['official'],
        reducedMotion: 'no-change',
      },
    ],
  };
  assert.throws(() => assertCategoryShape(fakeTeam), /italic-700 not loaded/);
});

test('index.css font-loading line 1 has not drifted from the pinned Google Fonts import', () => {
  const css = readFileSync('frontend/src/index.css', 'utf8');
  const firstLine = css.split('\n')[0];
  assert.match(firstLine, /^@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Alegreya/);
});

test('TypeFlourish token writer and CSS utility are present', () => {
  const themeMode = readFileSync('frontend/src/lib/themeMode.js', 'utf8');
  assert.match(themeMode, /TYPE_FLOURISH_VARS/);
  assert.match(themeMode, /applyTypeFlourishTokens/);

  const css = readFileSync('frontend/src/index.css', 'utf8');
  assert.match(css, /\.type-flourish-eyebrow/);
});
