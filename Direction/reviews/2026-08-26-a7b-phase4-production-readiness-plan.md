# A7B Phase 4 — production-readiness implementation plan

**Date:** 2026-08-26
**Base:** `origin/main` at `2cd999961008dcc9c1c7a3f3133c5421be665d8d`
**Branch:** `codex/a7b-phase4-production-readiness`
**Effect so far:** local files and read-only host inspection only

## Evidence-backed current state

KVM1 (`srv1737978`) is reachable, Ubuntu 24.04, system state `running`, with
about 35 GiB free and 2.7 GiB memory available. Docker 29.6.2, Nginx,
`omen_api`, `omen_cron`, and the six-hour encrypted Supabase backup timer are
present. `/var/lib/omen-football-data` is absent. Host Node is absent. The live
cron image digest is recorded in sanitized evidence, but the container is
configured with no user and currently runs root processes; Phase 4 will require
an explicit non-root one-shot runner rather than inherit that posture.

Command Center (`command-center`) is reachable, Debian 13/aarch64, system state
`running`, with about 105 GiB free and 3.0 GiB memory available. Python 3.13,
curl, and SHA-256 are present; Node is absent. The five-minute
`slops-alert-dispatcher.timer` is active and its last run passed. The Pi can ping
KVM1 over Tailscale. `/var/lib/omen-football-witness` is absent.

No environment file, credential, provider row, private payload, or secret value
was read. Evidence:
`Direction/reviews/evidence/2026-08-25-a7b-phase4/host-inspection.json`.

## 1. Safe preparation and read-only checks

- Complete: isolated worktree, exact base, required authority files, Phase 1–3
  schemas/handoffs, A4 dry-run code, current host identities/capacity/services.
- Local implementation: readiness schema, evaluator, sanitized evidence input,
  and fail-closed tests.
- Exit: evaluator accurately reports every missing operational proof while all
  activation booleans remain false.

## 2. KVM1 provisioning

- Build a dedicated digest-pinned one-shot collector image from reviewed code;
  do not use a mutable `:main` reference for evidence generation.
- Create `/var/lib/omen-football-data` with a dedicated owner/group and the
  immutable Phase 1–3 layout.
- Install collection/normalization/validation wrappers and disabled systemd
  units. Run the container with explicit non-root UID/GID, dropped capabilities,
  `no-new-privileges`, read-only rootfs, and only the data root writable.
- Add manifests, publications, and immutable evidence to the existing encrypted
  backup scope after reviewing storage growth. Never put provider credentials
  in this collector; nflverse release collection is unauthenticated.
- Gate: remote host writes, image publication, service installation, backup
  config change, and any execution require exact approval.

## 3. Command Center Pi witness and backup

- Implement a Python-standard-library witness using the already installed
  runtime; no package installation.
- Create `/var/lib/omen-football-witness`; retain manifests indefinitely and the
  latest two compressed raw snapshots per dataset.
- Give the witness a forced-command, read-only KVM1 status path over Tailscale.
  It may read hashes/freshness/status only and cannot execute arbitrary commands.
- Monitor the existing encrypted backup's freshness without receiving its
  credentials.
- Gate: key/account/access-control creation, root creation, script install, and
  service installation require exact approval.

## 4. Live monitoring and alerts

- Extend the existing notification-only dispatcher with structured, payload-free
  state for job failure, source loss, schema drift, staleness, disk, witness
  mismatch, and witness outage.
- Preserve delivery-before-state, deduplication, one recovery notice, JSON
  encoding, and no-remediation authority.
- Prove each alert with a controlled fixture/failure and recovery; do not create
  a real source, disk, or host incident merely to test an alert.
- Gate: dispatcher/service changes and live Discord delivery require approval.

## 5. Scheduling and service supervision

- Install disabled one-shot services and timers for the explicit ET schedule in
  the production-readiness contract.
- Validate units, manual runs, failure state, recovery state, timer firing, and
  reboot survival before calling supervision proven.
- Keep publication and scoring units absent/disabled through A4.
- Gate: install, enable, start, restart, daemon-reload, and reboot are separate
  remote actions requiring approval.

## 6. Correction and recovery rehearsal

- Run correction against isolated candidate paths; verify `supersedes`, changed
  subjects, new source bundle, and no publication.
- Exercise real KVM1 backup to the approved target and restore into a new empty
  KVM1 root only after a matching Command Center hash observation.
- Recompute exact hashes and independently validate the recovered acceptance.
- Gate: backup writes, restore writes, and controlled service interruption (if
  any) require approval. No destructive deletion is planned.

## 7. A4 no-write acceptance

- Prepare a process-scoped dry-run invocation using the existing scoring code.
- With approval, read real pending rows, prove zero write calls, and compare all
  three formats against the approved data artifact and independent reference.
- Record `/api/ready`, cron/service health, correction/recovery receipts, and
  persistent scoring-disabled state before and after.
- Gate: production credential use and the real-row read require exact approval.

## 8. Final production-activation gate

- Require a clean readiness assessment with no blockers and all non-activation
  booleans still false.
- Ask separately for collection activation; observe a shadow week.
- Ask separately for publication activation.
- Ask separately for `OMEN_CRON_SCORING_ENABLED=true`.
- Rollback is disable-first and evidence-preserving. No merge, deploy,
  publication, or scoring change is implied by this plan.

## Current verdict

**BLOCKED BY DESIGN:** both hosts are suitable and reachable, but neither data
root nor service exists; live alerts, timers, backup/correction/recovery, and A4
have not run. Publication and production scoring remain disabled.

