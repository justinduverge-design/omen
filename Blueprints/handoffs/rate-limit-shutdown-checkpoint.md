# Rate-Limit Shutdown Checkpoint

Session: 2026-09-13 — Omen football-data capture outage, diagnosis through merge.

## Current Project State

Football-data capture on KVM1 (`srv1737978`) was **dead for 17 days** and nothing reported it. It
is running again, and the fault class, the silence, and the alert noise all have fixes merged to
`main`: [#428](https://github.com/justinduverge-design/omen/pull/428),
[#429](https://github.com/justinduverge-design/omen/pull/429),
[#430](https://github.com/justinduverge-design/omen/pull/430).

Auto-heal is **deployed and proven under systemd** (19:39Z): a deliberately bogus pin was detected,
rebuilt, verified and rewritten by `ExecStartPre`, after which capture returned `state: pass` with
`alerts: []`. GlitchTip auto-resolve is live on a daily timer and the alert signature is empty.

One condition remains active — `witness_mismatch` — expected on a Sunday, and the Tuesday cycle is
the verification.

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

**Outage closed.** Rebuilt the capture image from `d2d327f`, re-pinned, ran capture: `state: pass`,
all three datasets populated, `alerts: []`.

**Auto-heal shipped and proven.** `omen-football-image-guard` runs as `ExecStartPre`: prefers
pulling a `repo@sha256` pin back, else rebuilds from the newest source tree carrying both the
Dockerfile and `src/services/footballData`, probes with `status`, and re-pins only after that passes.
If it cannot produce a verified image it leaves the pin alone and fails loudly.

The first sandboxed run failed, which is the most valuable thing that happened today.
`ProtectSystem=strict` keeping `/etc` read-only was a real defect found by reading the units — but
it was the *second* barrier. The actual blocker was `docker build` going through buildx, whose state
lives in `$HOME/.docker/buildx`, unreachable under `ProtectHome=true`. `docker run` needs no such
state, which is why capture worked throughout and why only execution surfaced it.

**Silence closed.** Dispatcher gained an explicit staleness probe on `generated_at_utc` (>30h) and a
once-daily re-send of still-active conditions, spanning the football signature as well as `$sig`.

**Alert noise closed.** Kuma monitors moved from `maxretries=0` to `2` — "Omen — API Ready" had 38
down-beats in a day while Public HTTPS and API Health had zero; it flaps, it is not down.
`slops-glitchtip-autoresolve` now resolves issues with no events in 7 days, daily, via the
Sentry-compatible REST API.

**Both reported bugs were not bugs.** #6 (`platform_connections update failed: duplicate key`) was
real and had already been fixed by the founder on 2026-09-05 in `src/routes/leagues.js` (commit
`23334ec`) — 25 minutes after its last-ever event. #9 (CORS to Mozilla's observatory) does not exist
in the codebase at all; `git grep` and a full filesystem scan both return zero hits. The nine-issue
backlog was history, not a to-do list.

**Credential question answered.** ESPN cookie expiry and Yahoo 403 first appeared 2026-08-27 02:12,
seven hours before capture froze. The capture pipeline reads **only** nflverse GitHub releases and
touches neither provider. Coincidence, not causation. All three providers were re-authenticated
anyway, with zero new errors in the following hours.

## Files Changed

Merged in #428 / #429:

- `ops/football-data/kvm1/omen-football-image-guard` — created, then fixed for buildx
- `ops/football-data/kvm1/omen-football-{capture,validate,retry}.service` — guard as `ExecStartPre`,
  `/etc/omen-football` added to `ReadWritePaths`
- `ops/command-center/slops-alert-dispatcher` — staleness probe, daily re-send

Merged in #430:

- `ops/command-center/slops-glitchtip-autoresolve` — created
- `ops/command-center/slops-glitchtip-autoresolve.{service,timer}` — created

This checkpoint pass:

- `Blueprints/handoffs/rate-limit-shutdown-checkpoint.md`
- `Direction/decision_log.md`
- `Direction/known_issues.md` — one entry opened and resolved same session

## Files Not Found

- No `ops/` tree existed in the local checkout at session start — HEAD was 2026-08-20, predating the
  football-data work. `git fetch` was required before anything could be written. L0/L1 was separately
  22 commits behind `master`.
- `/var/lib/slops-alerting/last-reminder-day` did not exist until the patched dispatcher first ran.

## What Was Not Done

- **The auto-resolve `PUT` path is untested.** The query path is proven (the sweep authenticated and
  returned cleanly), but with every issue already resolved there was nothing stale to act on, so the
  resolve call never fired. It will exercise itself the first time an issue goes quiet for 7 days,
  and it fails safe: logs `FAILED to resolve`, changes nothing, retries tomorrow.
- **Tuesday verification** — not yet possible.
- **The L2 close-out in `CLAUDE.md`** — `skill-usage-ledger.md`, `done/LEDGER.md`, and the four gate
  commands were not run. This session used the `clean-up-checkpoint` format instead.
- No app code, secrets, deploy config, SQL, tests, or package files were touched.

## Current Risks / Open Questions

1. **`witness_mismatch` is still active.** Believed expected: the witness holds only 2025 snapshots
   for `stats_player`/`stats_team` (captured 2026-08-26, before any 2026 games), so it has nothing to
   compare against. Should clear once the Tuesday witness capture crosses the season boundary. If it
   persists past Tuesday afternoon it is a genuine data-integrity signal.
2. **Three identical pending batches** exist from repeated manual captures on 2026-09-13. Validate
   has not met that input shape before. If Tuesday's validate fails, look here first — it is an
   artifact of the fix session, not a pre-existing condition.
3. **Why the Pi rebooted** at 10:29 local on 2026-09-13 is unexplained; `last -x reboot` returned
   nothing.
4. **What re-pinned the digest on 2026-08-26** is unknown. The guard now recovers from it, but the
   origin is worth understanding — nothing prevents the same bare-ID mistake being made again.

## Recommended Next Step

Tuesday 2026-09-15 after 10:00 UTC, confirm the football chain completed cleanly. Everything else
from this session is closed.

## Exact Next Prompt For Justin

> On command-center, run `sudo cat /var/lib/omen-football-witness/signals.json`. Empty `conditions`
> means the witness crossed the season boundary and picked up 2026 `stats_player`/`stats_team` —
> confirm with `sudo ls /var/lib/omen-football-witness/snapshots/stats_player/`, which should now
> show a `2026` directory. If `witness_mismatch` is still present, treat it as a real data-integrity
> signal rather than the expected Sunday state. Then on KVM1 check
> `sudo /usr/local/sbin/omen-football-run status | grep -E 'state|authorized'` — `publication_authorized`
> and `production_scoring_authorized` turning true means the first clean Tuesday scoring since the
> outage. Also check whether validate coped with the three identical pending batches from 2026-09-13.
