import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_DELETE_CONFIRMATION,
  isAccountDeleteConfirmation,
} from '../frontend/src/lib/accountDeletion.js';

// Shortened from 'DELETE MY OMEN DATA' on 2026-09-03 (founder). This file must agree with
// `src/routes/userPrivacy.js`, which is the enforcer — a client that disagrees with the server
// simply cannot delete an account.

test('account deletion uses the short confirmation word', () => {
  assert.equal(ACCOUNT_DELETE_CONFIRMATION, 'delete');
});

test('account deletion accepts the word however it is capitalized or padded', () => {
  // Matching is case-insensitive and trimmed, which the long phrase deliberately was not. With
  // one short word, strictness stops being a safety property and becomes a way to fail someone
  // who typed 'Delete'. The guardrail is that a word is typed at all rather than one tap.
  for (const accepted of ['delete', 'Delete', 'DELETE', '  delete  ']) {
    assert.equal(isAccountDeleteConfirmation(accepted), true, `should accept ${JSON.stringify(accepted)}`);
  }
});

test('account deletion still rejects anything that is not the word', () => {
  for (const rejected of ['', '   ', 'del', 'delete my account', 'DELETE MY OMEN DATA', null, undefined]) {
    assert.equal(isAccountDeleteConfirmation(rejected), false, `should reject ${JSON.stringify(rejected)}`);
  }
});
