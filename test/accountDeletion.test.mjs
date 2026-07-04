import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_DELETE_CONFIRMATION,
  isAccountDeleteConfirmation,
} from '../frontend/src/lib/accountDeletion.js';

test('account deletion uses the Omen data confirmation phrase', () => {
  assert.equal(ACCOUNT_DELETE_CONFIRMATION, 'DELETE MY OMEN DATA');
});

test('account deletion confirmation requires an exact match', () => {
  assert.equal(isAccountDeleteConfirmation('DELETE MY OMEN DATA'), true);
  assert.equal(isAccountDeleteConfirmation(' delete my omen data '), false);
  assert.equal(isAccountDeleteConfirmation('DELETE MY ACCOUNT'), false);
});
