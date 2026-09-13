# Rate-Limit Shutdown Checkpoint

Session: 2026-09-13 — Omen football-data capture outage, diagnosis through merge.

## Current Project State

Football-data capture on KVM1 (`srv1737978`) was **dead for 17 days** and nothing reported it. It
is now running, and both the fault class and the silence have fixes merged to `main` as
[#428](https://github.com/justinduverge-design/omen/pull/428).

Auto-heal is **deployed and proven under systemd** as of 19:39Z: a deliberately bogus pin was
detected, rebuilt, verified and rewritten by `ExecStartPre`, after which capture returned
`state: pass` with `alerts: []`.

One condition remains active — `witness_mismatch` — which is expected on a Sunday and should clear
on the Tuesday cycle. A follow-up PR is still owed for the buildx fix proven after #428 merged.

## Work Completed This Session

**Root cause.** `/etc/omen-football/image-digest` was re-pinned 2026-08-26 23:33Z to a **bare image
ID** (`sha256:<hex>`) rather than `repo@sha256:<hex>`, 18 minutes after source `d2d327f` deployed.
A bare ID names a local image only and can never be pulled. A later prune removed it, so every
capture from the next run (2026-08-27 09:15Z) exited 125 and the status payload froze with
`datasets: {}`.

**Why it was silent.** `slops-alert-dispatcher` is edge-triggered; the condition latched once and
never re-sent. Compounding it, the witness's fetch of `kvm1-status.json` kept succeeding, so the
file's mtime refreshed every 5 minutes while `generated_at_utc` inside it stayed frozen — invisible
to any mtime-based check.

**Outage closed.** Rebuilt the capture image from `d2d327f`, re-pinned, ran capture. Result:
`state: pass`, `batch_id` issued, all three datasets populated with hashes, `alerts: []`. The Pi
went from four active conditions to one.

**Auto-heal shipped.** `omen-football-image-guard` runs as `ExecStartPre`: prefers pulling a
`repo@sha256` pin back, otherwise rebuilds from the newest source tree carrying both the Dockerfile
and `src/services/footballData`, probes with `status`, and re-pins only after that passes, backing
up the prior pin. If it cannot produce a verified image it leaves the pin alone and fails, so
capture fails loudly rather than running something unverified. Heal path was exercised on KVM1
against a deliberately bogus pin and recovered correctly.

**Silence closed.** Dispatcher gained an explicit staleness probe on `generated_at_utc` (>30h) and a
once-daily re-send of still-active conditions, deliberately spanning the football signature as well
as `$sig`. Both verified live on the Pi.

**Credential question answered.** ESPN cookie expiry and Yahoo 403 first appeared 2026-08-27 02:12,
seven hours before capture froze. The capture pipeline reads **only** nflverse GitHub releases
(`schedules/games.csv`, `stats_player`, `stats_team`) and touches neither provider. The timing is
coincidence, not causation.

## Files Changed

Merged in #428:

- `ops/football-data/kvm1/omen-football-image-guard` — created
- `ops/football-data/kvm1/omen-football-capture.service` — updated
- `ops/football-data/kvm1/omen-football-validate.service` — updated
- `ops/football-data/kvm1/omen-football-retry.service` — updated
- `ops/command-center/slops-alert-dispatcher` — updated

Written this checkpoint pass:

- `Blueprints/handoffs/rate-limit-shutdown-checkpoint.md` — this file
- `Direction/decision_log.md` — appended 2026-09-13 entry
- `Direction/known_issues.md` — entry for the live drop-in defect, opened and resolved same session

## Files Not Found

- No `ops/` tree existed in the local checkout at session start — HEAD was 2026-08-20, predating the
  football-data work. Required `git fetch` before the close-out could be written.
- `/var/lib/slops-alerting/last-reminder-day` did not exist until the patched dispatcher first ran.

## What Was Not Done

- **Kuma `maxretries=2`** — not applied. Blocked by the permission classifier, and a direct SQLite
  edit is the wrong mechanism anyway (Kuma caches monitors in memory and can overwrite it). Must be
  done in the Kuma UI on all four monitors.
- **ESPN / Yahoo re-auth** — not done, cannot be automated. Requires Justin to re-authenticate.
- **Tuesday verification** — not yet possible.
- **A follow-up PR for the buildx fix** — the guard change proven at 19:39Z is committed locally but
  #428 still contains the version that cannot build under systemd.
- No app code, secrets, deploy config, SQL, tests, or package files were touched.

## Current Risks / Open Questions

1. ~~**The live KVM1 drop-in cannot heal.**~~ **Resolved 19:39Z.** Deploying the merged units was
   necessary but not sufficient: `/etc` being read-only was the second barrier, and the guard never
   reached it. The actual blocker was `docker build` going through buildx, whose state lives in
   `$HOME/.docker/buildx` — unreachable under `ProtectHome=true`. Fixed by pointing `DOCKER_CONFIG`
   at a private temp dir, plus the guard no longer discards build output. Proven end to end against
   a bogus pin: guard rewrote the pin, capture returned `state: pass`, `alerts: []`. The
   `ReadWritePaths` defect was found by reading the units and was real; the buildx defect was found
   only by executing them, and it was the one actually blocking.
2. **`witness_mismatch` is still active.** Believed expected: the witness holds only 2025 snapshots
   for `stats_player`/`stats_team` (captured 2026-08-26, before any 2026 games), so it has nothing
   to compare against. Should clear once the Tuesday witness capture crosses the season boundary.
   If it persists past Tuesday afternoon, it becomes a genuine data-integrity signal.
3. **Three identical pending batches** exist from today's repeated manual captures. Validate has not
   met that input shape before.
4. **Why the Pi rebooted** at 10:29 local on 2026-09-13 is unexplained; `last -x reboot` returned
   nothing. Unrelated to the outage, but unaccounted for.
5. **What re-pinned the digest on 2026-08-26** is unknown. Without knowing, the same bare-ID mistake
   can recur — the guard now recovers from it, but the origin is worth understanding.

## Recommended Next Step

Set Kuma `maxretries=2` on all four monitors in the UI (http://100.98.81.0:3001) - the last unfinished
item from this session that needs no further diagnosis.

## Exact Next Prompt For Justin

> Set Retries=2 on all four Kuma monitors at http://100.98.81.0:3001 (Public HTTPS, API Health, API
> Ready, GlitchTip) — they all ship `maxretries=0`, so a single failed beat pages. Then on Tuesday
> Sep 15 after 10:00 UTC, confirm `witness_mismatch` cleared once the witness crossed the season
> boundary and picked up 2026 `stats_player`/`stats_team`; if it is still active, treat it as a real
> data-integrity signal rather than the expected Sunday state. Also complete the L2 close-out this
> session skipped: `Blueprints/playbooks/skill-usage-ledger.md`, `Blueprints/done/LEDGER.md`, and the
> four gate commands in `CLAUDE.md`.
