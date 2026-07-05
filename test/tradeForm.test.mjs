import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_TRADE_DEAL_SHAPE,
  DEFAULT_TRADE_SCORING_FORMAT,
  buildTradePayload,
  tradeDealShapeMeta,
} from '../frontend/src/lib/tradeForm.js';

test('buildTradePayload preserves scoring format and bounded player fields', () => {
  const payload = buildTradePayload({
    scoringFormat: 'half_ppr',
    send: [
      {
        name: '  Bench RB  ',
        position: 'RB',
        team: 'SEA',
        projected_points: '10.5',
        status: '',
      },
    ],
    receive: [
      {
        name: 'Starter WR',
        position: 'WR',
        team: 'DET',
        projected_points: '',
        status: 'Q',
      },
    ],
  });

  assert.deepEqual(payload, {
    scoring_format: 'half_ppr',
    send: [{ name: 'Bench RB', position: 'RB', team: 'SEA', projected_points: 10.5 }],
    receive: [{ name: 'Starter WR', position: 'WR', team: 'DET', status: 'Q' }],
  });
});

test('buildTradePayload falls back to safe defaults for unknown form values', () => {
  const payload = buildTradePayload({
    scoringFormat: 'points-per-first-down',
    send: [{ name: '', position: 'LB', projected_points: 'bad' }],
    receive: [{ name: 'Known TE', position: 'TE' }],
  });

  assert.equal(DEFAULT_TRADE_SCORING_FORMAT, 'ppr');
  assert.equal(payload.scoring_format, 'ppr');
  assert.deepEqual(payload.send, [{ name: 'Unknown', position: 'RB' }]);
  assert.deepEqual(payload.receive, [{ name: 'Known TE', position: 'TE' }]);
});

test('tradeDealShapeMeta keeps multi-team mode honest about the backend comparison', () => {
  const meta = tradeDealShapeMeta('multi_team');

  assert.equal(DEFAULT_TRADE_DEAL_SHAPE, 'two_team');
  assert.equal(meta.label, 'Multi-team');
  assert.match(meta.description, /net side/i);
  assert.equal(tradeDealShapeMeta('unknown').value, 'two_team');
});
