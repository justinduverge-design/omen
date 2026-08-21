import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recommendationDataMode,
  waiverDataMode,
} from '../frontend/src/lib/recommendationDataMode.js';

test('recommendation data mode requires an explicit supported mode', () => {
  assert.equal(recommendationDataMode({ mode: 'live' }), 'live');
  assert.equal(recommendationDataMode({ mode: 'mock' }), 'mock');
  assert.equal(recommendationDataMode({ mode: 'demo' }), 'demo');
  assert.equal(recommendationDataMode({}), 'unverified');
  assert.equal(recommendationDataMode({ mode: 'future_mode' }), 'unverified');
});

test('waiver mode requires the backend explicit mock boolean', () => {
  assert.equal(waiverDataMode({ is_mock: false }), 'live');
  assert.equal(waiverDataMode({ is_mock: true }), 'mock');
  assert.equal(waiverDataMode({}), 'unverified');
});

test('mock evidence cannot be presented as live even when the envelope claims live', () => {
  assert.equal(recommendationDataMode({
    mode: 'live',
    signals: { roster: { status: 'mock' } },
  }), 'unverified');
  assert.equal(recommendationDataMode({
    mode: 'live',
    warnings: ['Using mock roster input.'],
  }), 'unverified');
});
