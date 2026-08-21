import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSchema, validateAgainstSchema, validateValorBrainFile } from '../scripts/check-valor-brain.mjs';

const SCHEMA = new URL('../Blueprints/specs/valor-brain-page.schema.json', import.meta.url);
const PILOT = new URL('../Direction/reviews/2026-08-20-valor-brain-o2-rollback-pilot.md', import.meta.url);

test('the O2 pilot conforms to the local Valor Brain v1 schema', async () => {
  const schema = await loadSchema(SCHEMA);
  const result = await validateValorBrainFile(PILOT, schema);

  assert.equal(result.optedIn, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.metadata.state.task, 'IN_PROGRESS');
  assert.equal(result.metadata.state.change, 'APPLIED');
  assert.equal(result.metadata.state.exercise, 'NOT_RUN');
});

test('the local schema rejects a task lifecycle value from another state dimension', async () => {
  const schema = await loadSchema(SCHEMA);
  const metadata = {
    metadata_profile: 'valor-brain/v1',
    page_id: 'omen.ops.invalid',
    page_type: 'operational-state',
    layer: 'L2',
    authority: 'REVIEW_ONLY',
    owner: 'Justin Duverge',
    state: { task: 'APPLIED' },
    sources: ['Direction/current_sprint.md'],
    relationships: { requires: [], enables: [], checks_against: [] },
    freshness: { reviewed_on: '2026-08-20', triggers: ['task changes'] },
    snapshot: { repository: 'justinduverge-design/omen', commit: '1c60b72' },
  };

  const errors = validateAgainstSchema(metadata, schema);
  assert.ok(errors.some(error => error.path === '$.state.task' && error.code === 'enum'));
});
