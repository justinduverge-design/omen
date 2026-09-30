# WO-15 follow-on — monitoring hardening (2026-09-29)

**Status:** applied live and verified; restart policy and Sentinel-on-Omen are specified, not enabled/built.
**Context:** see `2026-09-29-wo-15-backup-repair.md` for the backup incident this grew out of.

## Done and verified
- Identity switched from hostname to machine-id on KVM1 (3 scripts), Steward (backup check), Sentinel
  (network-health, listener-drift). A second Supabase backup run after the change passed
  (`5fdb4160…`), and Steward reported HEALTHY on it.
- Dispatcher labels Steward records; verified offline on simulated `DOWN`/`WARNING`/`CRITICAL` input and on
  live output, and one scheduled dispatcher run completed cleanly afterwards.
- New `football-backup-freshness` check: HEALTHY against the 2026-09-29T23:42:55Z football snapshot; the
  dispatcher's view of all four Steward checks and all three Sentinel checks is HEALTHY.
- Old script backups archived off the live paths; journald retention raised on the three Pis.

## Not done, on purpose
- **No reboots.** KVM1 (kernel 139 running, 142 installed) and KVM2 (5.15.0-186 running, 191 installed) still
  need one. Enabling `Automatic-Reboot` before a supervised boot test would make the first reboot of a
  production host unsupervised. Sequence: supervised reboot per host, then enable the policy in the fleet spec.
- Sentinel-on-Omen checks and the KVM2 / Restic-integrity check are designed in the fleet spec, not built.
- `omen-football-restore` has the corrected identity guard but has not been run.

## Rollback
Every changed file has a copy under `/var/backups/*-script-history/` on its host. The dispatcher rollback is
`/usr/local/sbin/slops-alert-dispatcher.bak-20260929-label`; the `steward-status` `authorized_keys` original
is in `/var/backups/omen-script-history/` on KVM1.
