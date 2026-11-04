# Sentinel checks

`omen-host-posture.sh kvm1|kvm2` is a copy of the live script at `/opt/sentinel/checks/omen-host-posture.sh` on Sentinel
(Pi). The repo is now the source; Sentinel runs a deployed copy. Run every 10 min; the Command Center dispatcher posts non-HEALTHY lines.

## Two-step confirm
CRITICAL categories (authorized_keys, sudoers, admin_members, sshd_config, cron) alert at once. WARNING categories
(listeners, enabled_units, containers) are held in `drift_pending` on the first differing run (HEALTHY), and flagged on the
next. A confirmed category **stays in `drift_pending`**, so it is flagged every run until the drift clears or the baseline
is refreshed. Before the fix an alerting run wrote `drift_pending=none`, so persistent drift flapped WARNING/HEALTHY and
rotated `reason=` (see `Direction/reviews/2026-10-29-pi-alert-repeats.md`).

## Test
```bash
bash ops/pi-fleet/sentinel-checks/test-omen-host-posture.sh   # stubs ssh; no network
shellcheck ops/pi-fleet/sentinel-checks/*.sh
```
`MACHINE_ID_FILE` is a test-only override of `/etc/machine-id`.

## Deploy (founder runs; not done by the PR)
```bash
scp ops/pi-fleet/sentinel-checks/omen-host-posture.sh sentinel:/tmp/omen-host-posture.sh.new
ssh sentinel 'sudo cp -p /opt/sentinel/checks/omen-host-posture.sh /var/backups/sentinel-script-history/omen-host-posture.sh.pre-confirm-fix-$(date +%Y%m%d) && sudo install -m 0755 -o root -g root /tmp/omen-host-posture.sh.new /opt/sentinel/checks/omen-host-posture.sh && rm /tmp/omen-host-posture.sh.new'
```
Check owner/mode against the old file first (`ls -l`). Rollback: copy the backup back. Baselines stay as they are.

## Follow-up: tailscaled ports in the listeners hash
KVM2 `LISTENERS_SHA` changes after every reboot because `tailscaled` binds high ephemeral ports (e.g. 38384, 50733).
The hash is computed on the KVM by the root collector behind the `sentinel-status` forced command, not in this script;
find that collector on the hosts (`omen-host-posture-collect`, see `infra/schedule/TIMERS.md`; it may not be in the repo yet).
Proposal: exclude listeners whose process is `tailscaled` and port is above 32768 when hashing, ship that as its own PR,
then refresh both baselines once.
