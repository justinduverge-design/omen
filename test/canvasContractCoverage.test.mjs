import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { findCoverage } from '../scripts/check-canvas-contract-coverage.mjs';

test('visual-lock canvas has a one-to-one contract inventory', () => {
  const coverage = findCoverage();
  assert.equal(coverage.artboards.length, 32);
  assert.equal(coverage.contracts.length, 32);
  assert.equal(coverage.requirementIds.length, 32);
  assert.deepEqual(coverage.missingContracts, []);
  assert.deepEqual(coverage.orphanContracts, []);
  assert.deepEqual(coverage.missingRequirements, []);
  assert.deepEqual(coverage.orphanRequirements, []);
  assert.deepEqual(coverage.duplicateRequirementIds, []);
  assert.deepEqual(coverage.duplicateJourneyMemberships, []);
  assert.deepEqual(coverage.journeyMismatches, []);
  assert.deepEqual(coverage.invalidScreens, []);
});

test('coverage checker reports an isolated complete fixture', () => {
  const coverage = findCoverage({
    canvasDir: path.resolve('test/fixtures/canvas-contract-coverage/canvas'),
    contractsDir: path.resolve('test/fixtures/canvas-contract-coverage/contracts'),
    requirementsPath: path.resolve('test/fixtures/canvas-contract-coverage/requirements.json'),
  });
  assert.deepEqual(coverage.missingContracts, []);
  assert.deepEqual(coverage.orphanContracts, []);
});
