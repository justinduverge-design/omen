// Shortened from 'DELETE MY OMEN DATA' on 2026-09-03 (founder). Must agree with
// `src/routes/userPrivacy.js`, which is the enforcer.
export const ACCOUNT_DELETE_CONFIRMATION = 'delete';

/** Case-insensitive and trimmed, matching the server. See `AccountDeletion.swift` for why. */
export function isAccountDeleteConfirmation(value) {
  return String(value ?? '').trim().toLowerCase() === ACCOUNT_DELETE_CONFIRMATION;
}
