import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  OMEN_DECISION_BRIEF_VERSION,
  confidenceBandPresentation,
  footballIntelligenceExplanation,
  normalizeCapabilities,
  omenDecisionBriefRequest,
} from '../frontend/src/lib/omenDecisionBrief.js';

test('web Omen negotiates decision brief v3', () => {
  assert.equal(OMEN_DECISION_BRIEF_VERSION, 'omen-decision-brief.v3');
  assert.deepEqual(omenDecisionBriefRequest(), {
    contract_version: 'omen-decision-brief.v3',
  });
});

test('confidence presentation uses the server band and never consumes a numeric score', () => {
  assert.deepEqual(confidenceBandPresentation({
    band: 'confident',
    score: 91,
    drivers: ['Live inputs agree.'],
  }), {
    band: 'confident',
    label: 'Confident',
    drivers: ['Live inputs agree.'],
    unavailableReasons: [],
  });
  assert.deepEqual(confidenceBandPresentation({
    band: null,
    unavailable_reason: ['Roster projections were unavailable.'],
  }), {
    band: null,
    label: 'No confidence read',
    drivers: [],
    unavailableReasons: ['Roster projections were unavailable.'],
  });
  assert.equal(confidenceBandPresentation({ score: 91 }), null);
});

test('capability normalization keeps canonical records and drops malformed entries', () => {
  const capabilities = normalizeCapabilities([
    { name: 'roster', state: 'live', statement: 'Roster is live.', used: true },
    { name: 'waivers', state: 'unavailable' },
    null,
  ]);
  assert.deepEqual(capabilities, [
    { name: 'roster', state: 'live', statement: 'Roster is live.', used: true },
  ]);
});

test('football intelligence explanation preserves available and degraded honesty', () => {
  assert.deepEqual(footballIntelligenceExplanation({
    football_intelligence: {
      status: 'partial',
      summary: 'The offense is moving toward the prior system baseline.',
      interpretation: { what_could_change_this: ['A corrected charting release.'] },
      evidence: { coverage_ratio: 0.72, games: 4, plays: 180, charted_plays: 130 },
      quality: { coverage: 'partial', limitations: ['Charting covers only some eligible plays.'] },
      freshness: { state: 'current', latest_observation_at_utc: '2026-09-25T12:00:00Z' },
    },
  }), {
    status: 'partial',
    reasonCode: null,
    summary: 'The offense is moving toward the prior system baseline.',
    whatCouldChangeThis: ['A corrected charting release.'],
    limitations: ['Charting covers only some eligible plays.'],
    coverageState: 'partial',
    freshnessState: 'current',
    coverageRatio: 0.72,
    games: 4,
    plays: 180,
    chartedPlays: 130,
    latestObservationAt: '2026-09-25T12:00:00Z',
  });
  assert.deepEqual(footballIntelligenceExplanation({
    football_intelligence: {
      status: 'disputed',
      reason_code: 'identity_disputed',
      summary: 'This must not render as advice.',
      interpretation: { what_could_change_this: ['Resolve the coach identity.'] },
      quality: { coverage: 'not_evaluated', limitations: [] },
      freshness: { state: 'unknown' },
    },
  }), {
    status: 'disputed',
    reasonCode: 'identity_disputed',
    summary: null,
    whatCouldChangeThis: ['Resolve the coach identity.'],
    limitations: [],
    coverageState: 'not_evaluated',
    freshnessState: 'unknown',
    coverageRatio: null,
    games: null,
    plays: null,
    chartedPlays: null,
    latestObservationAt: null,
  });
});

test('Omen page keeps honest state gates and has no numeric confidence meter', () => {
  const source = readFileSync('frontend/src/pages/OmenOfTheWeek.jsx', 'utf8');
  for (const state of ['pending_live_engine', 'platform_disconnected', 'empty', 'error']) {
    assert.match(source, new RegExp(state));
  }
  assert.match(source, /CapabilitiesPanel/);
  assert.match(source, /FootballIntelligencePanel/);
  assert.doesNotMatch(source, /confidenceBarStyle|function ConfidenceBar|confidenceScore|\{score\}%/);
});
