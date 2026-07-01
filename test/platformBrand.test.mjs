import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getPlatformBadgeStyle,
  getPlatformBrand,
  getPlatformButtonStyle,
  platformLabel,
} from '../frontend/src/lib/platformBrand.js';

test('platform brand map returns the expected Phase 1.7 accents', () => {
  assert.equal(getPlatformBrand('sleeper').accent, '#1FA3E8');
  assert.equal(getPlatformBrand('yahoo').accent, '#6E2E89');
  assert.equal(getPlatformBrand('espn').accent, '#CC0000');
});

test('platform labels normalize case and preserve canonical names', () => {
  assert.equal(platformLabel('Sleeper'), 'Sleeper');
  assert.equal(platformLabel('YAHOO'), 'Yahoo');
  assert.equal(platformLabel('espn'), 'ESPN');
});

test('brand style helpers fail closed for unknown platforms', () => {
  assert.equal(getPlatformBrand('mfl').accent, 'var(--color-accent)');
  assert.equal(getPlatformButtonStyle('mfl').background, 'var(--color-accent)');
  assert.equal(getPlatformBadgeStyle('mfl').borderColor, 'var(--color-border)');
});
