# Omen infrastructure

How Omen's hosts are scheduled, reached, backed up and watched.

| Host | Role |
|---|---|
| **KVM1** `omen-prod` (Hostinger VPS) | Production: the API, cron, Nginx, the football warehouse and the football-data pipeline |
| **KVM2** `model-host` (Hostinger VPS) | Encrypted Restic backups, weekly isolated restore proofs, and a private Ollama/Gemma model |
| **Command Center** (Raspberry Pi 4) | Monitoring: Uptime Kuma, Beszel, GlitchTip, and the Discord alert dispatcher |
| **Steward**, **Sentinel** (Raspberry Pi Zero 2 W) | Routine automation, passive security watching, and host-posture checks |

All admin and machine-to-machine traffic goes over Tailscale. No host accepts password or root SSH.

| Path | What it holds |
|---|---|
| `schedule/TIMERS.md` | Every scheduled job on every host, and the rules for scheduling. Change a timer, change this file |
| `schedule/ACCESS.md` | Who logs in where, and by which route |
| `schedule/maintenance/` | The Friday maintenance window units |
| `warehouse/` | Warehouse release, deploy, backfill, backup/restore, monitoring and runbooks |

Related: `deploy/hostinger/` (API compose file, Nginx, watchdog), `ops/command-center/` (copies of what runs
on the Pi), and `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md` (fleet design).
Running anything here on a real host needs founder approval.
