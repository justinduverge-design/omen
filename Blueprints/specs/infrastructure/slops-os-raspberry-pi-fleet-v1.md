# Slops OS — Raspberry Pi Fleet (Infrastructure) — v1

**valid-as-of:** 2026-08-17
**Status:** migrated from a temporary Google Drive field tracker into permanent repo documentation. This is a condensed synthesis, not a verbatim copy — the source documents ran to ~4,500 lines of dated, checkpoint-by-checkpoint build evidence. Granular per-checkpoint history (exact commands, individual troubleshooting steps, byte-hash comparisons) lives only in the original Drive documents; this file preserves architecture, proven decisions, current status, and guardrails.
**Source:** "TEMP — Slops OS Raspberry Pi Deployment Plan & Build Tracker — ACTIVE" and "TEMP — Raspberry Pi Commissioning Tracker — COMPLETE (Historical)," both owned by the founder, migrated 2026-08-17. The Drive documents remain the granular historical record; this file is the durable summary and should be kept current going forward instead of the Drive doc.
**Scope note:** this infrastructure (Tailscale tailnet, the three Pis, KVM1/KVM2 monitoring) is broader than Omen alone — it also covers general home-network security learning and Valor Ventures operations. It is recorded here because Omen production (KVM1) and the private AI bridge (KVM2) are its primary monitored assets today, and because `O1`/`O1b` in `Direction/current_sprint.md` already anchor the observability half of this work in this repo.

## Fleet topology

| Device | Hardware | Tailscale IP | Role |
|---|---|---|---|
| Command Center | Raspberry Pi 4 Model B, 4 GB RAM, 128 GB microSD | `100.98.81.0` | Coordination/observability hub. The only device that runs Docker workloads. |
| Steward | Raspberry Pi Zero 2 W, 512 MB RAM (~415 MiB usable), 64 GB microSD | `100.118.42.54` | Lightweight recurring operational automation. Native binaries only, no Docker. |
| Sentinel | Raspberry Pi Zero 2 W, 512 MB RAM (~415 MiB usable), 64 GB microSD | `100.109.57.11` | Passive network/security observation. Native binaries only, no Docker. |
| KVM1 | Hostinger VPS, Ubuntu 24.04, **2 vCPU / ~7.9 GB RAM** (upgraded from 1 vCPU / 3.8 GB on 2026-09-05) | `100.115.155.19` (hostname `srv1737978`) | Omen production: `omen_api`, `omen_cron`, Nginx, self-hosted GitHub Actions deploy runner, `omen-watchdog.timer`. |
| KVM2 | Hostinger VPS, Ubuntu 22.04, ~7.8 GB RAM | `100.67.187.57` (hostname `srv1647690`) | Private Ollama/Gemma AI bridge (`ollama` as a systemd service, bound to the Tailscale IP only, not `0.0.0.0`). Also the **encrypted Restic backup target** for Omen's database over chroot-confined SFTP (Layer 3 below) — KVM2 is not a spare machine. **openclaw was fully removed on 2026-09-05**; Nginx remains installed with **no enabled sites**. |

All device-to-device management traffic runs over Tailscale exclusively. No cross-device service is bound to `0.0.0.0`; every dashboard/API is bound to its device's specific Tailscale IPv4 address.

### openclaw retirement — completed 2026-09-05

`S6` tracked openclaw as retired-in-principle; it was still running. Removed on founder
instruction: `openclaw-gateway.service` stopped, disabled and its unit deleted; the
`ai-subdomains` Nginx vhost unlinked and deleted; the `openclaw` npm package, `/opt/openclaw`,
`/etc/openclaw`, `/home/openclaw`, the `/usr/bin/openclaw` symlink and the `openclaw` service
user all removed; the Let's Encrypt certificate deleted via `certbot delete`. Config and state
are archived at `/root/openclaw-removal-20260905/` on KVM2.

**Two things this surfaced, worth keeping.** The certificate had been **expired since
2026-08-06** — `openclaw.slopssaloon.com` served a browser-blocking TLS error for a month and
nothing reported it, because Uptime Kuma monitors Omen's endpoints and not this one. A retired
service still holding a public DNS name, a public port and an expiring certificate is
unattended attack surface, not a harmless leftover.

Verified after removal: `nginx -t` passes, `nginx` and `ollama` are active, `sshd -t` passes,
and the Restic repository at `/srv/restic/omen` still holds a snapshot written the same
morning — the backup path shares this host and was deliberately checked rather than assumed.

**DNS needs nothing — verified, after first being claimed wrongly.** This entry originally said
the `openclaw.slopssaloon.com` record still resolved and that deleting it at the registrar was
the remaining step. That was asserted from a failed `curl` (exit 000) without querying DNS, and
it was wrong: `dig openclaw.slopssaloon.com` returns **NXDOMAIN**, with no A record, no CNAME and
no wildcard covering the name. Nothing is outstanding at the registrar.

Worth keeping as a method note, since it is the same mistake pattern as `O8` and the Yahoo
parsers: **a connection failure is not evidence of which layer failed.** `000` is equally
consistent with "DNS did not resolve" and "the host refused the connection", and picking one
without a second measurement is a guess wearing a result's clothing. One `dig` separates them.

## Constitution — guardrails that apply across every layer

These held throughout construction and should keep holding for any future change to this fleet:

1. **Monitoring and alerting never authorize autonomous remediation.** No automatic restart, patch, firewall change, DNS change, secret rotation, or deployment. Detection and notification only; every remediating action is human-approved.
2. **KVM2's local model (Gemma/Ollama) is advisory, never an actor.** It may summarize, prioritize, and explain deterministic evidence (scan results, structured findings). It may never decide whether a vulnerability exists, autonomously patch/firewall/rotate/restart, or have security/model confidence treated as evidence. Flow is strictly `deterministic sensor → structured finding → tracker → optional KVM2 explanation → human-approved action`.
3. **Tailscale-IP-only binds, never public.** Every dashboard (Kuma, Beszel) and every internal service is published to its host's specific `100.x` address, never `0.0.0.0`. No router/eero port forwarding was introduced anywhere in this build.
4. **Docker hardening on Command Center:** installed from Docker's official Debian repo, not the convenience script. `darthslops` is deliberately **not** in the `docker` group (root-equivalent daemon access) — commissioning uses `sudo docker`. UFW does not protect Docker-published ports by itself (Docker can bypass ordinary UFW filtering), so the Tailscale-IP-bind rule above is the actual control. Container visibility into other hosts prefers outbound-WebSocket-only agents over any inbound agent port, and least-privilege Docker socket proxies (read-only, specific API paths) over mounting `docker.sock` directly.
5. **Small devices stay small.** Steward and Sentinel run native (non-Docker) binaries only, chosen specifically because their proven per-agent footprint is ~10 MB RSS versus Docker's overhead on a 512 MB device. Heavy workloads only ever go on Command Center.
6. **DNS/eero/IPv6/Pi-hole changes are sequenced last and always gated.** No household-network-affecting change ships without eero-state capture, a DHCP reservation, an explicit rollback plan, and a live IPv4 *and* IPv6 validation path (IPv4-only testing was explicitly called out as insufficient partway through Layer 6).
7. **Never print secrets.** Every credential-matching check in this build used byte/hash comparison (SHA-256 of files, `/proc/<pid>/root` byte comparison) rather than printing values — including during a real multi-day Beszel authentication debugging session on both KVM1 and KVM2.
8. **A layer is not "done" on say-so.** Every layer below closed only after a proven failure-detection test, a proven recovery-to-healthy test, a proven survive-a-reboot test, and (where relevant) a proven recurring-scheduler-fired execution — not just "the service is running."

## Layer 1 — Management plane

**Status: CORE OPERATIONAL.** Debian 13 (trixie) arm64 on all three Pis; hostnames normalized to `command-center`/`steward`/`sentinel`; SSH key auth; Tailscale installed and authenticated on all three, SSH-over-Tailscale proven from the Windows desktop; UFW active with default-deny-incoming and only OpenSSH explicitly allowed; `unattended-upgrades` active; no meaningful MMC/I/O or undervoltage faults found on any device.

**Deliberately deferred, not blocking:** whether to eventually restrict SSH to Tailscale/trusted-LAN sources only (needs a tested rollback path first), DHCP reservations, final acceptance evidence capture.

## Layer 2 — Observability (Command Center v0.1)

**Status: COMPLETE.** This is the layer `O1` in `Direction/current_sprint.md` / `Direction/sprints_completed.md` already documents from the Omen-repo side; this section is the fuller picture.

**Stack:** Uptime Kuma `2-slim` (SQLite, `100.98.81.0:3001`) for synthetic availability, Beszel Hub `0.18.7` (`100.98.81.0:8090`) for host/container telemetry. Selected over Prometheus/Grafana/Loki (too heavy for v0.1) and Netdata (deferred, useful later for deep troubleshooting).

**Proven Omen synthetic monitors (content-aware, not status-code-only):** public HTTPS on `slopssaloon.com`, `/api/health` (keyword match `"status":"ok"`), `/api/ready` (keyword match `"status":"ready"`, classified P0/CRITICAL since it intentionally returns 503 on a real readiness failure). Content-aware failure detection was proven capable of catching an application-contract failure even when the web server still returns HTTP 200.

**KVM1 telemetry:** host resources plus `omen_api`/`omen_cron` container state, via a Docker socket proxy restricted to loopback (`127.0.0.1:2375`) with `INFO=1, CONTAINERS=1, POST=0` — read-only by construction. Agent-loss detection and reconnection were both proven with controlled stop/restart tests without disturbing production.

**KVM2 telemetry:** a real obstacle worth keeping as a lesson — the Docker-based Beszel agent could reach Command Center but could not read KVM2's systemd service state, because Docker's default AppArmor profile blocks the container's D-Bus method call needed for systemd telemetry. The fix was **not** to weaken AppArmor (`security_opt: apparmor:unconfined` was considered and rejected) but to replace the Docker agent with the **native** Beszel agent binary running directly under systemd — resolving the limitation without relaxing any container confinement. KVM2 now reports host resources plus `ollama.service`, `nginx.service`, `tailscaled.service`, and `docker.service` state.

**Reboot recovery:** proven on Command Center — Tailscale, Docker, Kuma, and Beszel Hub all recovered automatically with no Tailscale-IP-bind startup race and no operator repair needed.

**Resource cost:** the full v0.1 stack (Kuma + Beszel Hub + local agent) stayed under the self-imposed <1 GiB design budget — final baseline ~472 MiB used / 3.2 GiB available on a 3.7 GiB device.

### Security/Trust framework (designed during Layer 2, not yet fully built)

Five pillars for what "healthy" should eventually mean for Omen, beyond uptime: **Availability** (built — see above), **Authentication** (future: safe synthetic login/reject tests using a dedicated non-production test identity, not a real personal account), **Authorization** (future: purpose-built fixtures proving User A cannot reach User B's data), **Vulnerability posture** (future: deterministic scanning — Trivy or equivalent — of images/dependencies, tracked with severity/first-seen/status/owner), **Threat signals** (implemented for the Pi fleet itself in Layer 4; not yet extended to KVM1/KVM2 host-level threat detection). KVM2/Ollama's only role anywhere in this framework is summarizing and prioritizing already-collected deterministic evidence — see Constitution item 2.

## Layer 3 — Steward Automation

**Status: COMPLETE.** Three commissioned recurring jobs, each proven through manual execution → controlled failure simulation → controlled recovery → systemd timer → reboot survival, before being called done:

1. **TLS certificate expiry** (daily). Policy: 30+ days healthy, 7–29 warning, 0–6 or expired critical, connection failure = down.
2. **Independent Omen readiness validation** (every 15 min) — deliberately separate from Kuma's own `/api/ready` check, as a second independent witness.
3. **Backup freshness monitoring** (hourly) — see below. This is the one with real product-risk significance.

### The backup pipeline (closes `O5` in `Direction/current_sprint.md`)

`O5` in this repo currently reads "never verified... an untested backup is not a backup," gated on `FOUNDER_APPROVAL — database access`. That is now stale. The actual pipeline, proven 2026-08-11:

- **KVM1** performs a logical Supabase export: not just the default `supabase db dump` (which excludes managed schemas), but an explicit additional export of `auth.users`, `auth.identities`, and `auth.mfa_factors` — because the durable Auth accounts are exactly what a public-schema-only dump would silently drop. This was a deliberate correction after auditing what the default CLI dump actually covers.
- The export is encrypted with **Restic** and transported over **SFTP-only** to a dedicated, chroot-confined `omen-backup` account on **KVM2**, source-IP-restricted to KVM1's Tailscale address only, with normal shell access proven denied (`This service allows sftp connections only.`) and SFTP write/delete proven working inside the chroot.
- Scheduled via `omen-supabase-backup.timer` on KVM1, every 6 hours.
- **Full disaster-recovery drill proven, not assumed:** a snapshot was restored from the KVM2 repository into an isolated, network-disconnected (`network=none`) disposable PostgreSQL 17 container on KVM1, and every recovered row count matched the source exactly — including `moves=1`, `platform_connections=8`, `profiles=3`, `users=3`, `waitlist_signups=10` — with zero orphaned Auth identities.
- **Steward's freshness check never touches Supabase or Restic credentials.** It connects to a dedicated, forced-command-restricted `steward-status` identity on KVM1 that can only run one read-only status-export script — proven by testing that an arbitrary requested command is ignored. Freshness state (HEALTHY / WARNING at >8h old / DOWN) was proven with controlled tests, and reboot-survival was proven on Steward.
- **Known limitation, carried forward honestly:** KVM1 and KVM2 are both Hostinger — this is off-host but not off-provider disaster separation. A second copy on a different provider or local storage remains a real, undone improvement if stronger separation is wanted. This is now the accurate scope of what's *not* proven, replacing the old "never verified" framing entirely.

## Layer 4 — Sentinel Network/Security Observation

**Status: COMPLETE.** Three commissioned sensors, each proven through the same manual → controlled-failure → controlled-recovery → systemd → reboot-survival discipline as Layer 3:

1. **Network/DNS health** (every 5 min) — eero gateway + raw internet reachability, DNS resolution against both a real and a reserved-invalid hostname, HTTPS reachability. Read-only; does not touch IPv6 configuration, only observes it.
2. **Listener/service drift** (every 5 min) — a SHA-256 hash of the normalized TCP/UDP listener baseline (excluding expected Tailscale/Avahi ephemeral ports) plus expected-service enabled/active state. Proven to detect both a new listener and a service-state change, with a fail-safe `ERROR` state (rather than stale `HEALTHY`) if the checker itself breaks.
3. **Authentication/security events** (every 5 min) — cursor-based incremental `journald` parsing, so each event is evaluated exactly once. Worth keeping as a lesson: real OpenSSH rejection grammar on this host turned out to be **three different log patterns** depending on the rejection type (invalid-user anchor, known-user wrong-key preauth-close, and OpenSSH's own connection-penalty drop after repeated failures) — a naive single-pattern detector under-counted a real 5-attempt burst until all three were combined. HEALTHY → SUSPICIOUS → CRITICAL was proven with real controlled SSH rejection tests, including the 5-signal burst escalating correctly to CRITICAL once the combined pattern was in place.

**Design boundary, explicitly verified, not assumed:** Sentinel does not act as the household's router or DNS server — `net.ipv4.ip_forward=0`, no process listening on port 53, default route still through the household eero gateway. It is a passive observer, and this was checked, not just intended.

## Network firewall — public SSH closed 2026-09-05

Both VPS instances share Hostinger network-firewall profile `287557`, which is enforced
**upstream of the OS** and is therefore independent of `ufw`/`iptables` inside Ubuntu. It now
reads, in order:

| Action | Protocol | Port | Source |
|---|---|---|---|
| Accept | TCP | 80 | Any |
| Accept | TCP | 443 | Any |
| **Drop** | Any | Any | Any |

**Public TCP 22 was removed from both boxes.** The decision was made on measured evidence, not
policy preference: across the retained journal window every successful SSH login on both hosts
came from a `100.x` Tailscale address — Command Center, Steward, KVM1 (the backup client) and
the founder's MacBook. **Zero legitimate logins arrived over the public internet.** The port was
serving nobody and exposing everything.

**Checked before the change, because one of these would have been silent and expensive:** the
Restic backup job on KVM1 reads `RESTIC_REPOSITORY="sftp:100.67.187.57:repository"` — KVM2's
**Tailscale** address, not its public one. Closing public 22 therefore cannot break the only
off-host database copy. `tailscaled` is `enabled` at boot on both hosts.

**Verified after:** SSH over Tailscale works on both; public `2.25.182.1:22` **times out**;
public `:443` still connects; `slopssaloon.com/api/health` returns 200. The drop-all rule does
not affect Tailscale, which is outbound-initiated and falls back to a DERP relay if a direct
path is unavailable.

Honest scope note: this is defense in depth, not a rescue. SSH was already key-only
(`passwordauthentication no`, `permitrootlogin no`) with `fail2ban` active. It removes the
surface rather than fixing an active compromise. Also worth recording — **the journal only
retained ~6 days**, not the 30 first assumed when counting logins; the conclusion held, but the
window was a quarter of what was claimed before it was checked.

**Recovery path if Tailscale is ever lost:** Hostinger's browser console (hPanel → VPS → the
instance), which does not depend on SSH.

## Layer 5 — Alerting

**Status: COMPLETE.** Primary channel: private Discord `#slops-alerts`, phone delivery confirmed by the owner. A Command Center dispatcher reads Steward/Sentinel state, local Kuma state, a Pi-hole DNS probe, and **unresolved GlitchTip issues** every 5 minutes and is **notification-only** — no remediation, restart, routing, firewall, DNS, or secret-rotation capability, per Constitution item 1. Noise control: a healthy state stays quiet, a changed unhealthy signature sends exactly one CRITICAL alert, an unchanged unhealthy state is deduplicated, and return-to-healthy sends exactly one recovery notice. A safe simulated-failure test passed without creating a real infrastructure failure, and the Discord webhook secret is root-owned mode `0600`.

**GlitchTip integrated 2026-08-21 (`O9`).** The dispatcher now reads unresolved issues straight from GlitchTip's Postgres — the same pattern by which it already reads Kuma's SQLite directly — under a forced read-only transaction, so the alerting path cannot mutate error records and no API token had to be provisioned. **The signature carries issue identity only, never the event count:** a new issue alerts once, an issue accumulating further events stays quiet, and resolving everything produces exactly one recovery notice. Issue titles are error text and therefore vendor-controlled, so quotes, backslashes and control characters are stripped before they can reach the Discord payload. GlitchTip being unreachable yields an empty result rather than a false all-clear, because Kuma's own `GlitchTip` monitor covers that case through the Kuma signal. Proven live end to end: a CRITICAL alert listing three issues, silence on the unchanged repeat, one RECOVERY on resolution, silence again after.

**Two latent defects in the dispatcher were found and fixed during that pass, both pre-dating GlitchTip:**

1. **A multi-signal alert could never have been delivered.** The payload was built by string-interpolating the signature into JSON, and a multi-line signature embeds raw newlines in a JSON string, which Discord rejects with `400`. Every alert proven until now had exactly one failing signal, so this had never been exercised. **If two things had broken at once, the alert would have failed and nothing would have been sent** — the alerting layer failing precisely in the situation it exists for. The payload is now built with a real JSON encoder.
2. **State was persisted before delivery was confirmed.** The new signature was written to disk first, so a failed send was never retried — the state file said "already reported" for an alert that never left the machine. Delivery now happens first; under `set -e` a failed send leaves the state untouched and the next run retries.

**Deferred:** `ntfy` as a secondary channel — explicitly not to be installed, exposed, or evaluated until after Layer 6 is accepted.

## Layer 6 — DNS Lab / Pi-hole / eero / IPv6

**Status: BASELINE COMPLETE, cutover intentionally not started.** A Pi-hole Docker lab runs on Command Center (`192.168.5.30`, TCP/UDP 53 published on that LAN address only — not the Tailscale interface, not a DHCP server, no router port-forward, not configured anywhere as a device's default DNS). Validated for real A/AAAA answers, negative-lookup rejection, and ad-domain blocking. Sentinel now probes Pi-hole directly every 5 minutes as part of its network-health check, with a proven CRITICAL alert on a controlled lab-only stop and a recovery notice on restart — **the household's actual DNS was never interrupted** during that test.

**Explicitly not yet done — this is a real gate, not a formality:** the eero cutover (making Pi-hole the household's actual DNS resolver) requires reserving Command Center's DHCP address (done), then a deliberate, approved eero settings change with a captured rollback click-path and a scheduled reboot window. **A draft custom-DNS entry was reviewed and correctly discarded** during this build because its IPv4 target didn't actually host Pi-hole and its shown IPv6 values belonged to a different device (Steward) with no DNS listener — saving from that draft would have broken household DNS. Command Center currently has no household IPv6 address at all, so entering an IPv6 DNS server today would be false on its face; IPv6 handling is a separate decision still to make before cutover.

## What this fleet is not

Per the deferred/backlog list carried through to the end of the source tracker: full centralized log aggregation, packet inspection, a SIEM-style dashboard, AI analysis of raw telemetry, large historical metric retention, a general-purpose Docker management UI, or a publicly exposed monitoring dashboard. None of these were rejected for being hard — they were rejected as not justified for the current scale, consistent with Constitution item 5.

## Open items carried forward

- Layer 1 final hardening (SSH restriction scope, DHCP reservations) — deferred, non-blocking.
- Layer 6 eero cutover — gated on an explicit approved change window; IPv6 handling undecided.
- Second, provider-diverse backup copy for the Restic repository — real gap, not urgent.
- KVM1/KVM2 host-level vulnerability scanning and the Authentication/Authorization synthetic-test pillars — designed, not built.
