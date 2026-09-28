# Fleet read-only audit — 2026-09-28

## Scope

This audit inspected only version-controlled operational configuration. It did not
invoke `tailscale`, SSH, Docker, Supabase, GitHub Actions, or any remote command.
No host, credential, migration, service, or deployment state was changed.

## Verified inventory

The canonical fleet specification identifies five managed nodes:

| Node | Verified repository identity | Management path |
| --- | --- | --- |
| Command Center | Tailscale `100.98.81.0` | Local Command Center artifacts |
| Steward | Tailscale `100.118.42.54` | Dispatcher SSH read |
| Sentinel | Tailscale `100.109.57.11` | Dispatcher SSH read |
| KVM1 | `srv1737978`, Tailscale `100.115.155.19` | Forced-command status channel; deploy fallback uses MagicDNS variable |
| KVM2 | `srv1647690`, Tailscale `100.67.187.57` | Backup/Ollama host; no repo-side mutation path found |

These identities are documentation-backed, not a live connectivity claim. The
repository does not contain a checked-in Tailscale device export or a private SSH
known-hosts file.

## Control checks

- `ops/command-center/slops-alert-dispatcher` is explicitly notification-only.
- Kuma is read through `sqlite3 -readonly`.
- GlitchTip is read through `default_transaction_read_only=on`.
- SSH reads require `BatchMode`, `StrictHostKeyChecking=yes`, and an explicit
  `UserKnownHostsFile` in the KVM1 and A4 pull helpers.
- KVM1 status and A4 pulls use the forced command `omen-football-status@srv1737978`.
- Temporary status files are atomically moved into dedicated evidence paths.
- The checked-in Command Center validator passes and rejects remediation verbs,
  relaxed host-key checking, and mutable observability reads.

## Evidence paths

The checked-in artifacts expect runtime evidence at:

- `/var/lib/slops-alerting/last-signature`
- `/var/lib/slops-alerting/football-last-signature`
- `/var/lib/omen-football-witness/remote/kvm1-status.json`
- `/var/lib/omen-a4-gates/state.json`
- `/var/lib/omen-football-witness/ssh/known_hosts`

These are runtime paths on the Command Center host, not files present in this
checkout. Their existence, freshness, ownership, and content were not asserted
without a verified remote/local host session.

## Findings and next gate

1. Repository-side host identity and control intent are sufficiently explicit for
   a later read-only live check.
2. A live audit still needs a verified local Tailscale binary or an approved
   Command Center shell, plus the runtime SSH key and known-hosts file. No target
   should be inferred from environment variables or guessed aliases.
3. The operational dispatcher helper path
   `/usr/local/lib/slops-alerting/alert-fingerprint.py` must be packaged alongside
   the dispatcher during any future founder-approved copy; the repo validator
   checks the dependency but does not install it.
4. Fleet monitoring remains detection/notification only. Autonomous restart,
   firewall, DNS, secret rotation, migration, and deployment actions remain out
   of scope for this audit.

## Local validation

```text
node scripts/validate-command-center-artifacts.js
Command Center artifacts valid: read-only dispatcher and stable fingerprint helper
```
