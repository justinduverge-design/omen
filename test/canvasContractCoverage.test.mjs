import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { findCoverage } from '../scripts/check-canvas-contract-coverage.mjs';

test('visual-lock canvas has a one-to-one contract inventory', () => {
  const coverage = findCoverage();
  assert.equal(coverage.artboards.length, 32);
  assert.equal(coverage.contracts.length, 30);
  assert.deepEqual(coverage.missingContracts, ['LedgerDegraded', 'LedgerDetailDegraded']);
  assert.deepEqual(coverage.orphanContracts, []);
});

test('coverage checker reports an isolated complete fixture', () => {
  const coverage = findCoverage({
    canvasDir: path.resolve('test/fixtures/canvas-contract-coverage/canvas'),
    contractsDir: path.resolve('test/fixtures/canvas-contract-coverage/contracts'),
  });
  assert.deepEqual(coverage.missingContracts, []);
  assert.deepEqual(coverage.orphanContracts, []);
});
