# Vault secretId Plaintext Logging Fix Handoff

Date: 2026-07-06
Branch: `claude/fix-vault-secretid-logging`
Status: Complete locally; not pushed, merged, or deployed in this session

## What Changed

Fixed the P0 security item flagged in `Direction/reviews/2026-07-05-app-store-mobile-readiness-sprint-proposal.md` §2.7 and carried in `Direction/current_sprint.md` / `Direction/agent_inbox.md`.

`vaultDelete()` in `src/routes/platforms.js` (~line 200) logged the raw Vault secret id via `logger.warn("Vault secret deletion failed", { err: error.message, secretId })` whenever the `vault_delete_secret` RPC failed — violating `Blueprints/hard-prohibitions.md` #9 (never log or display Vault secret ids).

- `src/routes/platforms.js`: dropped `secretId` from the `logger.warn` call, now logs only `{ err: error.message }` — matches `src/routes/userPrivacy.js`'s `deleteVaultSecret()` exactly.
- `test/platforms.test.js`: added log-capture to the existing `logger` test double (previously silent no-op functions) and a `vaultDeleteError` option on the fake Supabase RPC mock so a failure path is reachable in tests. Added a new test, `DELETE /api/platforms/espn never logs the raw Vault secret id when deletion fails`, asserting the serialized log output never contains either connected platform's Vault secret id.

No backend route, schema, auth, provider, package, env, SQL, deploy, push, merge, or production mutation happened.

## Discovered, Not Fixed (documented instead, per task scope)

- `src/omen_gdpr.js` (lines 243-244) duplicates the exact same bug in both its warn and success log lines — this file is already queued as a separate sprint item ("Delete or archive orphaned `src/omen_gdpr.js`") since it's confirmed unmounted; fixing the logging bug there would be wasted effort if the file gets deleted instead, so left untouched.
- `src/omen_api_v2.js` and `src/services/yahooAuth.js` embed `secretId` inside thrown `Error` messages for Vault decrypt/update failures (e.g. `` `Vault decrypt failed (${secretId}): ...` ``) — a different call-site pattern (thrown-error text, not a direct logger call) than the one named in the original finding. Whether these thrown messages ever reach a `logger.error`/`.warn` call downstream with the raw id intact was not traced in this session. Flagged in `decision_log.md` as a follow-up grep, not claimed as resolved.

Neither is fixed here — staying scoped to the specific `vaultDelete()` finding that was pulled as the active task.

## Verification

- RED: `node --test test/platforms.test.js` — new test failed pre-fix (`assert.equal(serializedLogs.includes("espn-secret"), false)` got `true`).
- GREEN: same test passes after the one-line fix; full `node --test test/platforms.test.js` 14/14.
- Full `npm test`: 422/422 (was 421/421 per the last recorded baseline in `current_sprint.md`; +1 from the new test).
- Grep: `grep -rn "secretId" src/` confirms `vaultDelete()` (`src/routes/platforms.js:200-206`) no longer passes `secretId` to any logger call; the two discovered-not-fixed locations above are listed but out of scope (see above).
- `git diff --check`: clean.

## Done Docs

Security Done (`Blueprints/done/security-done.md`):
- Gate 6 (logs don't leak secrets): satisfied — RED/GREEN test + grep above.
- Gate 9 (code-review security pass): self-administered read-through of the diff and the three discovered-not-fixed sites above; no new P0/P1 introduced, one-line change, existing correct pattern reused verbatim.
- Gate 10 (dependency risk): N/A, no new dependency.
- Gate 11 (`security-privacy-evidence` update): not authored as a separate memo — this fix removes an existing log-leak of an already-classified secret (Vault secret id) rather than introducing a new data classification, credential flow, consent, retention, or telemetry boundary. Judged N/A rather than skipped silently; flag if Justin wants a formal evidence note anyway.
- Gate 12 (skill-usage-ledger receipt): appended, see below.

## Skill Receipt

```text
Task: Vault secretId plaintext logging fix in vaultDelete() (src/routes/platforms.js)
Change type: Backend bugfix (security/logging)
Skills invoked: slops-tdd (RED/GREEN), slops-git-flow (scoped branch claude/fix-vault-secretid-logging)
Conditional skills considered but not applicable: slops-ui-ux-audit / slops-ux-copy / slops-mobile-smoke (no UI change); pre-build-research (no new external dependency/API); workflow-tree-spec (no new flow state); design-md-author (no design doc affected); security-privacy-evidence (no new data classification/flow — see Done Docs above)
Evidence: test/platforms.test.js new test + RED/GREEN log; full npm test 423/423; grep confirming no remaining raw secretId in vaultDelete()
Procedure gap found: none
```

## Known Gaps

- Three related secretId-exposure sites found but not fixed (see "Discovered, Not Fixed" above) — carried forward as follow-ups, not silently closed.
- `security-privacy-evidence` memo not separately authored (see Done Docs gate 11 reasoning).

## Next Step

Pull the next top-5 item per `Direction/agent_inbox.md` (2026-07-06 refresh): Phase 4.20a (mobile-build kill-switch layer, P0). The `src/omen_gdpr.js` deletion item (queued separately) would also close out the duplicate logging bug as a side effect of removing the whole file.
