# Command Center artifacts — reference copies

**These files do not run from this repo.** They live on the Command Center Pi at the paths
named below, and are copied here so the deployed content is reviewable in version control
rather than existing only on a device nobody can diff.

Editing a file here changes nothing. Deploying it is a founder-gated action on the Pi, the
same way `O1b`'s GlitchTip stack was.

| File | Deployed path | Owner/mode | Task |
|---|---|---|---|
| `slops-wifi-watchdog` (+ `.service`, `.timer`) | `/usr/local/sbin/slops-wifi-watchdog`, `/etc/systemd/system/` | `root:root` `0755` | `B13-HEAL-WIFI` (deployed 2026-10-29) |
| `slops-alert-dispatcher` | `/usr/local/sbin/slops-alert-dispatcher` | `root:root` `0700` | `O9`; redeployed 2026-10-29 with the Wi-Fi SELF-REPAIR block, sha256 `96cdf6c0…`, mode restored to `0700` (it had been `0755` since 2026-10-11). `B13-HEAL-PARTS-LIST` adds the parts link: not yet deployed |

## slops-alert-dispatcher

The Layer 5 notification-only alert dispatcher. Runs every 5 minutes via
`slops-alert-dispatcher.timer`. Reads Steward/Sentinel state over SSH, Kuma state from its
SQLite file, a Pi-hole DNS probe, and unresolved GlitchTip issues from Postgres; builds one
signature; and notifies Discord only when that signature changes.

**Notification-only is a boundary, not a default.** Per Constitution item 1 in
`Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`, this must never gain
remediation, restart, routing, firewall, DNS, or secret-rotation capability. Every data source
it reads is read-only by construction — Kuma via `sqlite3 -readonly`, GlitchTip via a forced
read-only Postgres transaction.

**Mode `0700` is deliberate.** The script reads the Discord webhook secret path; it is
root-only executable and must stay that way. A `0755` install was made and corrected during
the `O9` pass — check the mode after any deploy.

Backup of the pre-`O9` version is on the Pi at
`/usr/local/sbin/slops-alert-dispatcher.bak-20260821-o9-before-glitchtip`.

## slops-wifi-watchdog

Command Center is Wi-Fi only (founder decision 2026-10-29). Deployed path `/usr/local/sbin/slops-wifi-watchdog`
(`root:root` `0755`; it holds no secret), with `slops-wifi-watchdog.service` and `.timer` in `/etc/systemd/system/`.
Every minute it pings the router. When the router is unreachable it reconnects Wi-Fi at 3 min, restarts
NetworkManager at 10 min, and reboots at 20 min, at most once per 6h. It only touches this Pi's own network.
Events go to `/var/lib/slops-alerting/wifi-events`, and the dispatcher posts them once the network is back.
