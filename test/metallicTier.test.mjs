import assert from 'node:assert/strict';
import { test } from 'node:test';

import { metallicTierStyle } from '../frontend/src/lib/metallicTier.js';

test('metallicTierStyle returns distinct gold, silver, and bronze token treatments for top 3 ranks', () => {
  assert.match(metallicTierStyle(1).background, /--color-tier-gold/);
  assert.match(metallicTierStyle(2).background, /--color-tier-silver/);
  assert.match(metallicTierStyle(3).background, /--color-tier-bronze/);
  assert.equal(metallicTierStyle(1).color, 'var(--color-on-tier-gold)');
  assert.equal(metallicTierStyle(2).color, 'var(--color-on-tier-silver)');
  assert.equal(metallicTierStyle(3).color, 'var(--color-on-tier-bronze)');
});

test('metallicTierStyle fails closed for non-top-three ranks', () => {
  assert.equal(metallicTierStyle(4), null);
});
