# Football-intelligence disaster-recovery reuse review

**Date:** 2026-09-26

**Verdict:** Omen already has a proven database backup and recovery capability. Football
intelligence should extend that capability rather than design a second operating system.
The remaining production gate is workload inclusion and a fresh artifact-specific restore,
not foundational backup architecture.

## What is already proven

The durable fleet record in
`Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md` migrated the original
Google Drive commissioning trackers into the repository and records:

- KVM1 logical Supabase exports including the otherwise-excluded durable Auth tables;
- Restic encryption and transfer over SFTP/Tailscale to a chroot-confined KVM2 account;
- a six-hour KVM1 systemd timer;
- an isolated, network-disabled PostgreSQL 17 restore with exact source row counts and no
  orphaned Auth identities;
- Steward hourly freshness checks through a forced-command, read-only status identity;
- Kuma/Beszel visibility, reboot recovery, and private Discord alert delivery.

The repository additionally retains the backup/restore executables and contract tests under
`ops/football-data/kvm1/` and `test/footballDataProductionOps.test.js`.

## Correction to the remembered topology

Command Center is the monitoring and alerting hub; it is not the backup repository. The
encrypted Restic repository is `/srv/restic/omen` on KVM2. KVM1 and KVM2 are separate hosts
but are both Hostinger, so this is proven off-host recovery, not provider-diverse recovery.
The fleet contract already records a provider-diverse second copy as a desirable, unfinished
strengthening.

## Reuse decision

Production football-intelligence artifacts should use the same control pattern:

```text
injected primary artifact root
  -> Restic encrypted backup over the existing restricted transport pattern
  -> freshness/witness status
  -> isolated fresh-root restore
  -> exact object and receipt hash verification
  -> rebuild indexes and compact serving projections
```

The domain remains vendor-neutral. Paths, Restic repositories, timers, credentials, and
monitor endpoints belong to deployment configuration and operations, not
`src/services/footballIntelligence/`.

## What remains before production activation

1. Select the production primary artifact root and measure capacity headroom.
2. Add that exact root to an approved encrypted backup set without exposing credentials.
3. Define artifact-specific retention for raw objects and immutable receipts.
4. Restore the artifact set into a fresh isolated root.
5. Verify every restored SHA-256, rebuild the generated registry index, and rebuild one compact
   serving projection from restored evidence.
6. Route artifact freshness/backup failure into the existing witness and alert pattern.
7. Record the production paths, RPO/RTO, owner, and rollback without putting them in domain code.

These are production operational proofs requiring separate exact-host authorization. They do
not block the local/non-production artifact registry.

## Evidence boundary

No host was contacted in this review. No current snapshot, timer, disk capacity, or alert was
re-probed. The review establishes what the repository's commissioned evidence already proves
and narrows the remaining gate; it does not claim the September 2026 live state is freshly
verified.
