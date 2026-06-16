# 2026-06-16 Phase 1.4 Lockfile Resync + Deploy Recovery Handoff

## Summary

Phase 1.4 (font system propagation) was logged as `[x]` on 2026-06-15 with local `npm test 291/291` and `npm audit 0` evidence. PR #38 (`Codex/phase1 4 font system`) was opened and merged to `main` on 2026-06-16 anyway with the **`ui-quality` check red**. The post-merge `Deploy to KVM1` workflow (run 27647092176) also failed at the `quality` job for the same reason. Production was **not** updated by PR #38. PR #39 fixed the root cause; PR #38's merge was effectively a no-op until 2026-06-16 ~21:30 UTC.

## What was actually wrong

Commit `3f8905c "fix(ci): clear production dependency audit"` shrank root `package-lock.json` from ~1955 lines to ~399 lines while pinning a new Sentry/OpenTelemetry chain in `package.json`. The shrink dropped transitive entries that `promptfoo` (devDependency) needs. `npm ci` on a clean checkout therefore errored:

```
EUSAGE
Missing: @azure/core-rest-pipeline@1.24.0 from lock file
Missing: @azure/core-client@1.10.2 from lock file
Missing: @redis/client@5.12.1 from lock file
Missing: devtools-protocol@0.0.1647336 from lock file
Missing: pg@8.21.0 from lock file
Missing: gcp-metadata@7.0.1 from lock file
```

The earlier doctrine commit `fd4ddce` on 2026-06-15 also failed `quality` on `main` for the same reason — `main` was already carrying a broken lockfile before PR #38 merged.

## Why local verification missed it

The Phase 1.4 verification run executed `npm ci` against a working tree where `node_modules/` was already populated from a prior `npm install`. `npm` does not fail `ci` outright when `node_modules` is on disk; the EUSAGE error only surfaces on a clean clone (CI's checkout, or `rm -rf node_modules && npm ci`). The committed `package-lock.json` was the broken artifact — local `node_modules` masked it.

**This is the second "said done but wasn't done" moment in two days.** First was frontend Sentry (`@sentry/react` missing from local `frontend/node_modules` even though `frontend/package.json` declared it, fixed during the 2026-06-15 Phase 1.4 prep). Both share the same shape: written verification evidence diverged from current-checkout reality because local `node_modules` made it look like everything worked.

## Fix shipped

**PR #39 — `fix(ci): resync root package-lock.json with package.json`** (https://github.com/justinduverge-design/corvus/pull/39):

- Regenerated root `package-lock.json` via `npm install --package-lock-only` on a `/tmp` clone of `main`.
- Diff: `package-lock.json` +122 / −17 lines (15383 → 15488 total). No `package.json`, source, deploy, secret, SQL, or workflow edits.
- Local clean-clone verification (in `/tmp/verify-corvus`, no `node_modules`):
  - `npm ci` → 1008 packages added, succeeds.
  - `npm audit --audit-level=moderate --omit=dev` → 0 vulnerabilities.
- All 6 previously-missing transitives now resolve from the lockfile.
- Merged to `main` 2026-06-16 ~21:07 UTC (commit `0c67c00`, run 27648200583): `quality` ✅, `build` ✅.

## Second blocker: stale KVM1_HOST secret

After PR #39 merged, the `Deploy to KVM1` workflow's `deploy` job failed at the SSH step:

```
ssh: connect to host *** port 22: Connection timed out
Error: Process completed with exit code 255.
```

On-box diagnosis (`sudo ufw status verbose`, `systemctl status ssh`, `fail2ban-client status sshd`, `auth.log`) confirmed:

- ufw open on 22/tcp from Anywhere.
- sshd running, healthy, accepting public-key auth from Justin's home IP.
- fail2ban currently banning 0 IPs.
- **`auth.log` had no entries from a GitHub Actions runner subnet** in the timeframe of the failed deploy — the packet never reached sshd.

Root cause: the `KVM1_HOST` GitHub Actions repo secret was stale (pointing at an IP that no longer routes to KVM1). Justin re-set the secret and dispatched `Deploy to Hostinger KVM1` manually via the Actions tab. The run went green end-to-end and the KVM1 containers were updated.

## What that means for Phase 1.4

- **2026-06-15:** Phase 1.4 source change is correct; brand/design/spec docs are correct; local font behavior is correct.
- **2026-06-15 through 2026-06-16 ~21:30 UTC:** the merged code never reached the box. Production was still running the pre-Phase-1.4 KVM1 image.
- **2026-06-16 21:30+ UTC:** Phase 1.4 is **actually** in production after the manual deploy. This is the timestamp that closes Phase 1.4.

## Files updated as part of this handoff

- `Blueprints/handoffs/2026-06-16-phase1-4-lockfile-resync-handoff.md` (this file).
- `Direction/decision_log.md` — 2026-06-16 entries: lockfile resync; second "said done but wasn't done" moment; stale KVM1_HOST secret learning; Phase 1.4 actually-in-prod timestamp.
- `Direction/current_sprint.md` — Phase 1.4 line annotated with PR #38 + PR #39 + 2026-06-16 deploy evidence; "Current State" updated.

## Operating rules added (carry forward)

1. **Clean-clone verification is required** before claiming any Phase done that touches `package.json` or `package-lock.json`. Run `npm ci` in a directory with no pre-existing `node_modules` (a fresh clone, a `/tmp` copy, or `rm -rf node_modules && npm ci` in the working tree). Local `npm install` history is allowed to hide broken committed lockfiles — do not let it.
2. **Do not merge a PR with the gating CI check red**, even if local says green. PR #38 was merged with `ui-quality` failing, and the merge produced no shipped behavior change because every subsequent deploy was red until PR #39.
3. **GitHub Actions repo secrets need a re-verify step** before declaring KVM1 healthy after infra changes. A stale `KVM1_HOST` value will silently look like a network failure; check secret freshness alongside ufw/sshd whenever deploys time out.

## Verified state at handoff close

- `https://slopssaloon.com` running the Phase 1.4 font system (Alegreya Sans for headings/UI, Alegreya for body, DM Mono for data; no Cormorant/Garamond anywhere).
- `main` HEAD includes `0c67c00 fix(ci): resync root package-lock.json with package.json`.
- `Deploy to Hostinger KVM1` workflow_dispatch green 2026-06-16 ~21:30 UTC.
- PR #34 closed 2026-06-16T21:07 UTC as superseded by `fd4ddce` + `872538f`.

## Open follow-ups

- Justin to rotate the GitHub PAT pasted in this session's chat history (`ghp_GzB179…`) when the session closes. Scopes were broad (`admin:org`, `admin:enterprise`, `repo`, `workflow`). Not saved to agent memory.
- Phase 1.5 (Team accent sweep) becomes the next agent-buildable pull when Justin is ready.

## Next Recommended Pull

- Phase 1.5 — Team accent sweep (whole-app, both modes).
