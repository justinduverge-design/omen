import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  DRAFT_ASSISTANT_FIXTURE,
  LEDGER_PREVIOUS_RESULTS_FIXTURE,
  OMEN_VISUAL_FIXTURE,
} from '../frontend/src/data/privateDemoFixtures.js';
import {
  PRIVATE_FIXTURE_KEYS,
  getPrivateFixtureKey,
  isPrivateFixtureEnabled,
} from '../frontend/src/lib/privateFixtureMode.js';

function assertPrivateMockFixture(fixture, key) {
  assert.equal(fixture.fixture_key, key);
  assert.equal(fixture.mode, 'mock');
  assert.equal(fixture.is_mock, true);
  assert.equal(fixture.is_demo, false);
  assert.equal(fixture.is_live, false);
  assert.match(fixture.fixture_label, /private dev fixture/i);
  assert.notEqual(fixture.contract_version, 'omen-demo.v1');
}

test('Phase 1.11A private fixtures stay mock-labeled and distinct from public Demo Mode', () => {
  assertPrivateMockFixture(OMEN_VISUAL_FIXTURE, PRIVATE_FIXTURE_KEYS.OMEN_ROSTER);
  assert.equal(OMEN_VISUAL_FIXTURE.state, 'success');
  assert.equal(OMEN_VISUAL_FIXTURE.recommendation.type, 'start_sit');
  assert.equal(OMEN_VISUAL_FIXTURE.signals.roster.status, 'mock');
  assert.ok(OMEN_VISUAL_FIXTURE.roster.players.length >= 5);

  assertPrivateMockFixture(LEDGER_PREVIOUS_RESULTS_FIXTURE, PRIVATE_FIXTURE_KEYS.PREVIOUS_RESULTS);
  assert.equal(LEDGER_PREVIOUS_RESULTS_FIXTURE.contract_version, 'moves-history.v1');
  assert.equal(LEDGER_PREVIOUS_RESULTS_FIXTURE.moves.length, 4);
  assert.deepEqual(LEDGER_PREVIOUS_RESULTS_FIXTURE.summary, {
    wins: 2,
    losses: 1,
    pending: 1,
    avg_effectiveness_pct: 70,
    followed_count: 3,
    total_count: 4,
  });

  assertPrivateMockFixture(DRAFT_ASSISTANT_FIXTURE, PRIVATE_FIXTURE_KEYS.MOCK_DRAFT);
  assert.equal(DRAFT_ASSISTANT_FIXTURE.result.contract_version, 'draft-assistant-recommendations.v1');
  assert.equal(DRAFT_ASSISTANT_FIXTURE.result.is_mock, true);
  assert.equal(DRAFT_ASSISTANT_FIXTURE.adp.is_mock, true);
  assert.ok(DRAFT_ASSISTANT_FIXTURE.result.recommendations.length >= 3);
});

test('private fixture key only resolves in dev runtime', () => {
  assert.equal(
    getPrivateFixtureKey({ search: '?fixture=omen-roster', env: { DEV: true } }),
    PRIVATE_FIXTURE_KEYS.OMEN_ROSTER,
  );
  assert.equal(
    getPrivateFixtureKey({ search: '?fixture=previous-results', env: { DEV: true } }),
    PRIVATE_FIXTURE_KEYS.PREVIOUS_RESULTS,
  );
  assert.equal(
    getPrivateFixtureKey({ search: '?fixture=mock-draft', env: { DEV: true } }),
    PRIVATE_FIXTURE_KEYS.MOCK_DRAFT,
  );
  assert.equal(
    getPrivateFixtureKey({ search: '?fixture=mock-draft', env: { DEV: false } }),
    null,
  );
  assert.equal(
    getPrivateFixtureKey({ search: '?fixture=../../demo', env: { DEV: true } }),
    null,
  );
  assert.equal(
    isPrivateFixtureEnabled(PRIVATE_FIXTURE_KEYS.MOCK_DRAFT, {
      search: '?fixture=mock-draft',
      env: { DEV: true },
    }),
    true,
  );
});

test('1.11a private fixture wiring stays dynamic-imported (no top-level imports)', () => {
  // Phase 1.11a invariant: each private fixture is only reachable via the
  // DEV-only query-param gate + dynamic import, so the fixture bodies never
  // ship in the production bundle. A top-level `import { FOO_FIXTURE }` from
  // those pages would defeat that.
  //
  // The public `/demo` route added in Phase 2.7 is a SEPARATE system backed by
  // GET /api/demo; that route is not part of this invariant and is allowed.
  const omenSource = readFileSync('frontend/src/pages/OmenOfTheWeek.jsx', 'utf8');
  const ledgerSource = readFileSync('frontend/src/pages/Ledger.jsx', 'utf8');
  const moveHistorySource = readFileSync('frontend/src/components/moves/MoveHistory.jsx', 'utf8');
  const draftSource = readFileSync('frontend/src/pages/DraftAssistant.jsx', 'utf8');

  assert.match(omenSource, /OMEN_VISUAL_FIXTURE/);
  assert.match(ledgerSource, /LEDGER_PREVIOUS_RESULTS_FIXTURE/);
  assert.match(moveHistorySource, /fixture/);
  assert.match(draftSource, /DRAFT_ASSISTANT_FIXTURE/);
  assert.doesNotMatch(omenSource, /import\s+\{[^}]*OMEN_VISUAL_FIXTURE/);
  assert.doesNotMatch(ledgerSource, /import\s+\{[^}]*LEDGER_PREVIOUS_RESULTS_FIXTURE/);
  assert.doesNotMatch(draftSource, /import\s+\{[^}]*DRAFT_ASSISTANT_FIXTURE/);
});
