# Omen production readiness checklist

This checklist is the source-backed release gate for the provider-state and
fleet-recovery work. It is a readiness record, not permission to deploy or
apply SQL. Every item needs a dated evidence pointer; `designed` or `tested`
does not mean operating in production.

## Approval boundary

- [ ] Founder names the target project, commit/image, maintenance window, and
  observation window.
- [ ] A separate approval exists for SQL application, deployment, credential
  rotation, and fleet mutation. Approval for code changes does not imply any
  of these actions.
- [ ] The operator records who approved the action and where the approval is
  stored. Secrets, cookies, and provider credentials never enter the record.

## Backend and database

- [ ] `sql/2026-09-28_provider_connection_state_execution_review.md` preflight
  is complete: target table, existing shape, row count, grants, backup ID, and
  restore-test evidence are recorded.
- [ ] All mandatory stop conditions in that review are false.
- [ ] The additive migration is applied as one reviewed change, with no
  backfill, default, policy, trigger, RLS, or Vault operation.
- [ ] Postflight proves seven nullable columns, reviewed constraints/index,
  unchanged row count, unchanged browser grants, and healthy API checks.
- [ ] Rollback is separately approved and uses the current backup plus
  `sql/2026-09-28_provider_connection_state_rollback_review.md`; rollback is
  never an automatic operator response.
- [ ] Route contract tests pass for canonical provider, league, season, and
  persisted provider state. Missing context remains an honest degraded state.

## Fleet and command center

- [ ] The target fleet inventory is resolved from configured, verified hosts;
  no guessed Tailscale name, address, or SSH identity is used.
- [ ] SSH reads use strict host-key checking and the command-center bundle
  passes `node scripts/validate-command-center-artifacts.js`.
- [ ] Kuma and GlitchTip evidence is read-only, timestamped, and tied to the
  same observation window. No restart, removal, firewall, or secret rotation
  command is part of the alert dispatcher.
- [ ] Stable alert fingerprint evidence confirms repeated stale alerts collapse
  to one incident identity while current display text remains visible.

## Native recovery and customer verification

- [ ] The native provider-recovery contract is verified on the supported
  iPhone and Android builds for `reconnect_required`,
  `temporarily_unavailable`, and successful recovery.
- [ ] The UI never presents stale provider data as current advice and never
  exposes credentials, cookies, OAuth artifacts, or Vault identifiers.
- [ ] Physical-device or approved simulator evidence is attached for nominal,
  retryable outage, and reconnect-required states. A contract test alone is
  not visual or device proof.
- [ ] Web/native cutover order is recorded; native remains active authority and
  web may remain on the prior contract until its evidence is complete.

## Close-out decision

The release is **not ready** while any checkbox above is unchecked. The final
record must state `READY`, `HOLD`, or `ROLLBACK`, list every evidence path, and
identify unresolved risks. A local passing test suite cannot substitute for
production SQL, fleet, backup, or physical-device evidence.

### Evidence index

- Migration: `sql/2026-09-28_provider_connection_state_execution_review.md`
- Rollback: `sql/2026-09-28_provider_connection_state_rollback_review.md`
- Command center: `scripts/validate-command-center-artifacts.js`
- Native recovery: `Blueprints/handoffs/2026-09-28-native-provider-recovery-verification.md`
- Probo register: `probo.yaml`
