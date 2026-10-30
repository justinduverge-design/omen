# Self-healing for the Pi fleet: design proposal (2026-10-29)

**Status: APPROVED by the founder 2026-10-30 (Valor-Core `company/decisions/0003-antigravity-self-healing-and-truth.md`). Build in shadow mode first: one week of "would have run X" reports before any action.**

## Problem

Alerts tell the founder what is wrong, and then nothing happens until he acts. Tonight's GlitchTip outage sat for
9 days. The fix was known in one look, but there was nobody whose job was to apply it.

## The constitution today

Item 1 of `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`: *"Monitoring and alerting never
authorize autonomous remediation … every remediating action is human-approved."* Self-healing cannot exist
under that wording, so this design starts with an amendment, not with code.

## Proposed amendment to item 1

> Monitoring and alerting never remediate. A **separate remediator** may run an action only if that exact action
> was human-approved in advance through a reviewed, signed playbook, within that playbook's limits. Everything
> else stays detection and notification only. The dispatcher itself keeps no remediation capability.

The human approval moves from *per incident* (2 a.m., on a phone) to *per action class* (in a PR, in daylight).
That is the trust chain.

## The trust chain

```
founder-approved PR  →  signed playbook  →  remediator verifies the signature  →  bounded action  →  re-check  →  Discord report
```

1. **Playbooks live in the repo** (`ops/remediation/playbooks/*.yml`). Each one names: the alert check it
   answers, the single action, preconditions, the max attempts per 24h, the cooldown, the verify check, and the
   owner it escalates to.
2. **Signing:** merging to `main` is the approval (it already goes through `scripts/merge-pr.sh`). A small CI job
   signs the playbook bundle with a key that only CI holds (minisign or `ssh-keygen -Y sign`). The Pi holds only
   the **public** key, so a compromised Pi cannot mint new playbooks.
3. **The remediator** (`slops-remediator`, a new service on Command Center, separate from the dispatcher):
   - It reads the dispatcher's signature file, and does not reach the sensors itself.
   - It refuses any bundle whose signature fails, and alerts "remediation disabled: bad signature".
   - Its only actions are ones written into the playbook vocabulary (see below). There is no shell field.
     Arguments come from the playbook, never from alert text (alert text is vendor-controlled).
   - It runs as its own user, with a `sudoers` entry naming the exact commands, nothing broader.
   - It writes every attempt to `/var/lib/slops-remediator/ledger.jsonl` and posts it to Discord:
     *"Tried: restart glitchtip stack (1/2 today). Result: GlitchTip status=1. Fixed."*
4. **Escalation:** if an action fails, hits its daily cap, or the check flips back within the cooldown, the remediator stops
   for that check and sends a human alert with the owner and runbook step (from `B13-ALERT-OWNERS`).
5. **Kill switch:** `/etc/slops-remediator/disabled` stops all actions. The founder can also set the same file from a single
   Discord-free SSH command. It is checked every run.

## Action vocabulary (v1, deliberately small)

| Action | Example check | Why it is safe enough |
|---|---|---|
| `compose_up <project>` | GlitchTip/OTel/Vector containers down | idempotent; same command a human would run |
| `restart_unit <unit>` (allowlist) | a Steward check unit wedged | units are listed by name in the playbook |
| `rerun_unit <unit>` | backup freshness stale after a missed timer | one-shot job, already safe to re-run |
| `docker_prune_images` | disk_low on Command Center | removes only unused images |

**Never in v1** (stay human-only, alert with a runbook step): boot/kernel/cmdline edits, reboots, firewall,
DNS/Pi-hole/eero, secrets, deploys, database writes, anything on KVM1/KVM2 production, and package upgrades.
Tonight's fix, a boot-line edit plus a reboot, is exactly the kind that stays human, and the alert would carry the fix text.

## What it would have done tonight

The GlitchTip containers went down → `compose_up glitchtip` → it fails with the same cgroup error →
the cap is hit after 2 tries → escalation: *"GlitchTip stack will not start: runc memory.swap.max missing. Owner: founder.
Fix: runbook#cgroup-memory."* Nine days of silence becomes one specific page on day one.
Self-healing does not fix everything. It fixes the easy things, and makes the hard ones arrive already diagnosed.

## Proof required before it goes live (constitution item 8)

- A forced failure test: stop a non-critical container, then watch the remediator restore it and report.
- Refusal tests: a tampered bundle, a playbook with an unknown action, and the kill switch file each stop all action.
- A cap test: a permanently broken target escalates after N attempts and does not loop.
- A survive-a-reboot test.
- Shadow mode first: one week of "would have run X" reports with no actions, the same way the Steward Rust port ran in shadow.

## Build order (sprint items)

`B13-HEAL-CONSTITUTION` → `B13-HEAL-PLAYBOOKS` + `B13-HEAL-SIGNING` → `B13-HEAL-REMEDIATOR-SHADOW` → `B13-HEAL-LIVE`.
`B13-ALERT-OWNERS` comes first, because escalations need owners and runbook anchors.

## When the founder is not there (added 2026-10-29, founder-approved direction)

Found: Command Center (Pi 4) has no `BOOT_ORDER` set, so the Pi 4 default `0xf41` applies: **SD card first**, then USB.
With the old SD card back in the slot, any reboot boots the stale SD system (its own root, old boot line without
`cgroup_enable=memory`, so GlitchTip dies again). It must be `0xf14` (USB first, SD as the fallback) before the card
can be a safety net. No reboot timer exists on Command Center today.

| Layer | What it covers | Cost |
|---|---|---|
| Hardware watchdog (`RuntimeWatchdogSec=15s`) on all three Pis | OS hang | free |
| `BOOT_ORDER=0xf14` + weekly SSD→SD system sync + "booted from SD" alert | SSD death | free |
| Pi tryboot for any boot/kernel change | a bad boot change reverts itself | free |
| Local-only smart plug per Pi; each Pi can power-cycle the others (30–60s off, max 2/day, then page) | full freeze, wedged SSD | ~$15–25 per Pi |
| `uhubctl` USB power reset | SSD wedged, Pi alive | free |
| Under-voltage watch (`vcgencmd get_throttled`) | power supply about to fail | free |
| Outside heartbeat (Kuma push from an external free monitor) | whole house down | free |
| Hardware-replacement alert with a pre-researched parts list (Amazon overnight, Best Buy, Staples, Walmart, Target) | anything that needs a part | free; the founder buys |

Alerts stay on Discord.
