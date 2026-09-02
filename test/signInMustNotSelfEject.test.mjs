import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const login = fs.readFileSync(path.join(root, 'frontend', 'src', 'pages', 'Login.jsx'), 'utf8');

// Assert against code, not prose. The comment explaining this defect necessarily
// names `signOut(`, and a naive substring check would match its own documentation.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * The founder hit this live on 2026-09-02. Supabase logged `/verify 200` (login,
 * method otp); our API answered `POST /api/user/legal-acceptance` with a 500 three
 * tenths of a second later; Supabase logged `/logout 204` in the same second. He was
 * signed in and then signed straight back out by Omen's own code, and the "token has
 * expired" he saw next was just a second attempt at an already-consumed code.
 *
 * Any 500, CORS refusal, cold start, or dropped connection did that to every user who
 * signed in — which is what "none of my beta users can get in" actually was.
 */
test('a failed legal-acceptance write must never sign the user out', () => {
  // The precise shape of the bug: signOut inside the acceptance failure path.
  const acceptanceBlock = stripComments(login.slice(
    login.indexOf('hasCurrentLegalAcceptancePending()'),
    login.indexOf('const dest = consumeNextUrl()'),
  ));
  assert.ok(acceptanceBlock.length > 0, 'could not locate the acceptance block');
  assert.doesNotMatch(
    acceptanceBlock,
    /signOut\(/,
    'recording the acceptance is an audit write; failing it must not revoke a session Supabase just granted',
  );
});

test('the acceptance write is retried rather than attempted once', () => {
  assert.match(login, /export async function recordLegalAcceptance/);
  assert.match(login, /attempts = 2/,
    'a single transient 5xx should not defer the record for a whole session');
});

test('a deferred acceptance stays pending so the next sign-in retries it', () => {
  // Clearing the marker is what "recorded" means; it must only be cleared on success.
  assert.match(
    login,
    /if \(await recordLegalAcceptance\(legalVersion\)\) \{\s*\n\s*window\.localStorage\.removeItem\('omen\.legal\.pending'\);/,
    'the pending marker must survive a failed write',
  );
});

/**
 * The other half of the same incident: the web client offered only a magic *link* and
 * had no input, while native verifies a 6-digit token at `auth/v1/verify`. Both
 * clients share one Supabase email template, so the template renders a code and the
 * website gave the user nowhere to type it.
 */
test('the web sign-in accepts the same 6-digit code native does', () => {
  assert.match(login, /verifyOtp\(\{ email, token, type: 'email' \}\)/,
    'web must verify the code, matching native auth/v1/verify with type email');
  assert.match(login, /autoComplete="one-time-code"/,
    'the OS should be able to offer the code from the notification');
  assert.match(login, /replace\(\/\\D\/g, ''\)/,
    'a pasted "123 456" from an email client must still verify');
});
