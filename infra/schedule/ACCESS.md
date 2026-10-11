# Omen host access: who logs in where, and by what route (inventory 2026-10-11)

Every human and automation login goes over **Tailscale** (MagicDNS names or the 100.x addresses below). No host accepts
password or root login (`passwordauthentication no`, `permitrootlogin no`, port 22). Use these aliases (`~/.ssh/config`):

| Alias | Host | Tailnet address | Login user | Notes |
|---|---|---|---|---|
| `kvm1`, `omen-prod` | KVM1 (API, football warehouse, football-data pipeline) | 100.115.155.19 | `justin` | sudo for root work. `/etc/omen-host-posture/expected-ssh-users`: `justin`, `steward-status`, `sentinel-status`, `omen-football-status` |
| `kvm2`, `omen-ai`, `model-host` | KVM2 (encrypted backup repository, restore proofs, model host, Joplin WebDAV) | 100.67.187.57 | `ubuntu` (not your Mac username) | expected users: `ubuntu`, `omen-backup`, `sentinel-status` |
| `cc`, `command-center` | Pi (Beszel, Uptime Kuma 3001, GlitchTip 8000, alert dispatcher) | 100.98.81.0 | `darthslops` | Tailscale SSH may ask for a browser check on first use |
| `steward`, `sentinel` | Pi fleet monitors | 100.118.42.54 / 100.109.57.11 | `darthslops` | alerting reads them through a forced read-only command; no interactive shell |

## Automation identities (restricted keys, never interactive)

| Where | User | Purpose |
|---|---|---|
| KVM1 | `omen-backup-client` | warehouse backup client to KVM2's `omen-backup` repository (key file `/var/lib/omen-backup-client/.ssh/authorized_keys`, rotated 2026-10-09) |
| KVM1 | `omen-football-status`, `steward-status`, `sentinel-status` | read-only status export to the Pi |
| KVM2 | `omen-backup`, `sentinel-status` | restic repository, status export |

## Rules

1. The route is Tailscale. A key that works from outside the tailnet is a finding (the posture collector counts non-tailnet
   accepted logins and `omen-host-posture` flags unexpected users).
2. A deliberate change to a key file, enabled unit or container raises posture drift until the baseline is refreshed:
   `sudo sentinel-omen-posture-baseline-refresh kvm1|kvm2` on Sentinel. Never refresh to silence something not understood.
3. Known tidy-ups (not done): remove the stray `PASTE-THE-PUBLIC-KEY-LINE-HERE` line from `/home/justin/.ssh/authorized_keys` on
   KVM1; consider `from="100.64.0.0/10"` on human keys (risk: a tailnet outage then needs the provider console to get in).
