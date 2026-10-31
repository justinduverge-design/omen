# Command Center alert runbook

One fix step per check the dispatcher can emit. Every Discord alert line ends with
`owner=<who> fix=ops/command-center/RUNBOOK.md#<anchor>`; the anchor is a heading below.
The map is `alert-owners.tsv`; `test/alertOwners.test.js` fails when a check has no row or no heading here.
Owners: **founder** runs anything on a Pi, KVM, router, boot line or secret. **agent** fixes it in the repo
through the build loop. The dispatcher stays notification-only (fleet Constitution item 1): nothing here runs itself.

## omen-ready
The API ready endpoint failed from Steward. Check `curl -fsS https://<api>/health/ready` from the Mac, then the API
container logs on KVM1. Deploy fixes go through the deploy runbook only.

## tls-expiry
A certificate is near expiry. On KVM1, check the reverse proxy's renewal log and renew; never paste key material anywhere.

## supabase-backup-freshness
The nightly Supabase backup is late. Read the backup timer's journal on Steward and re-run the backup job once.

## football-backup-freshness
The football-data backup is late. On KVM1, `systemctl status omen-football-backup.timer`, then run
`omen-football-backup.service` once and confirm a new archive.

## restic-integrity
`restic check` failed or is missing. Run `restic-status` through the Steward allow-list; a FAILED check means repair
the repository before the next prune.

## command-center-alive
Steward cannot reach Command Center's SSH port. Check power and Wi-Fi (see `B13-HEAL-WIFI`); power-cycle only by hand.

## network-health
Network probe degraded. Check the eero app and Pi-hole; a single blip that recovers needs no action.

## auth-security
Auth failures or a security setting drifted. Read Sentinel's auth report before changing anything; secrets stay human-only.

## listener-drift
A new listening port appeared. Compare against the posture baseline; either close it or record it in the baseline (`B13-ALERT-POSTURE-DRIFT`).

## omen-host-patch
KVM1/KVM2 has pending security updates. Founder applies them in a maintenance window; package upgrades never run unattended.

## omen-host-posture
Enabled units, containers or listeners drifted from the baseline. Fix the drift or accept it into the baseline (`B13-ALERT-POSTURE-DRIFT`).

## public-exposure
Sentinel saw a service reachable from the internet that should not be. Confirm from outside (phone on cellular), then close it at the firewall by hand; firewall changes are human-only.

## host-unreachable
Steward or Sentinel has not answered SSH for 10 minutes. Check power, then the network; look at the host's last boot journal after it returns.

## glitchtip-issue
An unresolved GlitchTip issue. Open it in GlitchTip, file or fix it through the build loop, then resolve it there.

## kuma-glitchtip
GlitchTip itself is down. `docker ps -a` on Command Center. If the containers show `Exited (127)` with
`memory.swap.max: no such file`, the boot line lost `cgroup_enable=memory` (2026-10-29): back up
`/boot/firmware/cmdline.txt`, append `cgroup_enable=memory` to its single line, reboot, confirm all five containers up.
Otherwise `docker compose up -d` in the GlitchTip project. See `B13-ALERT-GLITCHTIP-DOWN`.

## kuma-recall
A recall monitor (the Mac) is down. Expected while the Mac sleeps (`B13-ALERT-RECALL-SLEEP`); act only if the Mac is awake.

## kuma-monitor
An Uptime Kuma monitor is down. Open Kuma on Command Center, read the monitor's last error, and follow the matching service's section.

## pihole-probe
The Pi-hole DNS probe failed. `docker ps` for the Pi-hole container, then `dig @<pihole> example.com`. DNS changes are human-only.

## football-signals
An Omen football-data condition (job_failure, source_loss, schema_drift, stale_data, disk_low, witness_mismatch,
witness_outage). Read `/var/lib/omen-football-witness/signals.json` and follow `ops/football-data` docs for that code.

## football-stale-payload
The KVM1 status payload stopped advancing. Check `omen-football-capture.service` on KVM1 and the witness pull on Command Center.

## a4-gates
A4 scoring-gate state changed. Green is news, not a fault: read `/var/lib/omen-a4-gates/state.json` and decide on enabling.
`state_stale`/`checker_unavailable` means the gates pull or run timer stopped.

## wifi-self-repair
Command Center repaired its own Wi-Fi (`slops-wifi-watchdog`). Informational; repeated reboots in a day mean check the link and see `B13-HEAL-WIFI`.

## unmapped
This line has no row in `alert-owners.tsv`. Add a row and a section here in a PR, then follow the closest section above.
