import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatOmenSignalKey,
  omenSignalBadgeStyle,
  omenSignalStatusMeta,
} from '../frontend/src/lib/omenSignalLabels.js';

test('omen signal labels expose live, stub, mock, and unavailable honestly', () => {
  assert.deepEqual(omenSignalStatusMeta('live'), {
    label: 'Live',
    description: 'Active input',
    usedLabel: 'Used',
  });
  assert.deepEqual(omenSignalStatusMeta('stub'), {
    label: 'Stub',
    description: 'Placeholder input',
    usedLabel: 'Limited',
  });
  assert.deepEqual(omenSignalStatusMeta('mock'), {
    label: 'Mock',
    description: 'Preview input',
    usedLabel: 'Preview',
  });
  assert.deepEqual(omenSignalStatusMeta('demo'), {
    label: 'Mock',
    description: 'Preview input',
    usedLabel: 'Preview',
  });
  assert.deepEqual(omenSignalStatusMeta('unavailable'), {
    label: 'Unavailable',
    description: 'Input missing',
    usedLabel: 'Not used',
  });
  assert.deepEqual(omenSignalStatusMeta('surprise'), {
    label: 'Unavailable',
    description: 'Input missing',
    usedLabel: 'Not used',
  });
});

test('omen signal label helpers keep data-source tokens and readable names', () => {
  assert.equal(formatOmenSignalKey('matchup_dvp'), 'Matchup DvP');
  assert.equal(formatOmenSignalKey('llm_reasoning'), 'Plain-English reasoning');
  assert.equal(formatOmenSignalKey('travel_home_away'), 'Home/away context');
  assert.equal(formatOmenSignalKey('game_time_tv'), 'Kickoff window');
  assert.equal(formatOmenSignalKey('roster'), 'Roster');

  const liveStyle = omenSignalBadgeStyle('live');
  assert.match(liveStyle.color, /--color-data-live/);
  assert.match(liveStyle.borderColor, /--color-data-live/);
  assert.match(liveStyle.backgroundColor, /--color-data-live/);

  const unavailableStyle = omenSignalBadgeStyle('missing');
  assert.match(unavailableStyle.color, /--color-data-unavailable/);
});
