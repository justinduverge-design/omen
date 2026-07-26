import assert from 'node:assert/strict';
import test from 'node:test';

import { runPromptGuard } from '../evals/slops-prompt-guard.mjs';

test('SLOPS Prompt Guard executes every deterministic prompt fixture', async () => {
  const result = await runPromptGuard();

  assert.deepEqual(result, {
    prompts: 3,
    cases: 2,
    assertions: 18,
    passed: 18,
  });
});
