import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTradeShareUrl,
  summarizeTradeSnapshot,
} from '../frontend/src/lib/tradeShare.js';

const SNAPSHOT = {
  hash: '36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30',
  expires_at: '2026-07-25T18:28:00.000Z',
  trade: {
    send: [{ name: 'Bench RB', position: 'RB', projected_points: 10 }],
    receive: [{ name: 'Starter WR', position: 'WR', projected_points: 14 }],
    scoring_format: 'ppr',
  },
  result: {
    verdict: 'accept',
    net_value: 2.5,
    confidence: 'medium',
  },
};

test('buildTradeShareUrl maps API hashes to the public share page', () => {
  assert.equal(
    buildTradeShareUrl('https://slopssaloon.com', SNAPSHOT.hash),
    'https://slopssaloon.com/trade/share/36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30',
  );
});

test('summarizeTradeSnapshot leads with the move and keeps public-share labeling', () => {
  const summary = summarizeTradeSnapshot(SNAPSHOT);

  assert.equal(summary.title, 'Accept the deal');
  assert.equal(summary.netValueLabel, '+2.5');
  assert.equal(summary.confidenceLabel, 'Medium confidence');
  assert.equal(summary.riskLabel, 'Medium risk');
  assert.equal(summary.dataLabel, 'Input-based analysis');
  assert.match(summary.description, /Receive Starter WR/);
  assert.match(summary.expiresLabel, /Expires Jul 25, 2026/);
});
