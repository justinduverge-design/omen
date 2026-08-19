# Omen Definition of Done

**valid-as-of:** 2026-07-27
**Status:** v1 — pointer + per-type gate files + ledger
**Posture:** Omen is **free indefinitely.** No billing gates anywhere in this doc.

## How to use

Pick the Done type matching what you shipped, read that file, satisfy every gate, record in the ledger.

| If you shipped... | Read |
|---|---|
| A new feature | `done/feature-done.md` |
| A page edit affecting user-visible structure | `done/page-done.md` |
| A deploy or production cut | `done/release-done.md` |
| Anything touching auth, data, secrets, platform credentials | `done/security-done.md` (cross-cutting) |
| A recommendation (Omen, Trade Analyzer, Draft Assistant) | `done/recommendation-done.md` (cross-cutting) |
| Any user-visible UI | `done/design-done.md` (cross-cutting) |
| A public-facing post / video / social / marketing artifact | `done/content-marketing-done.md` (cross-cutting, L1 work) |

Run cross-cutting gates **in addition** to the primary type. A page change that adds a recommendation triggers Page Done + Recommendation Done + Design Done.

## Procedure receipt (all work)

Every task also follows `playbooks/omen-company-baseline.md` and selects applicable skills from `playbooks/skill-activation-runbook.md`. The handoff must state skills invoked, conditional skills considered but not applicable, evidence, and any procedure gap. Append invoked/skipped-required skills to `playbooks/skill-usage-ledger.md` before closing.

## Foundation: the AAA Framework

From `Brand/brand-system.md` §11: every change must satisfy **Accuracy + Accessibility + Aesthetic Integrity. Two of three is a fail.** Each done-file marks which gates map to which A.

## Evidence discipline

Every gate marked done must **point to evidence** — commit hash, file path, screenshot link, test-run timestamp, skill-verdict location. Do not paste full command output. Justin will investigate from the pointer if needed.

Skipping a gate without writing why = lying about done. Marking a gate done with stale, fabricated, or missing evidence is a hard prohibition.

## Degraded verification — GitHub Actions billing hold

**Active since ~2026-07-24. Expected restore ~2026-08-01. Re-verify before assuming it has cleared.**

The monthly Actions allotment is exhausted. Every workflow run fails at the billing check, not at the code — confirmed still failing `2026-07-27T16:34Z` across `Dependency Health`, `ios-ci`, `SLOPS Prompt Guard`, and `Dependency Review`.

### The rule

A gate that cites CI **may not be silently skipped.** It must be closed one of exactly two ways, and the handoff plus the ledger row must say which:

- **SUBSTITUTED** — satisfied by the named local equivalent below. Record the command, the count, and the date.
- **DEFERRED-CI** — no local equivalent exists. Record what will be re-run after restore. The work may still merge; the *claim* may not be made.

Writing "CI green" when no workflow has run is fabricated evidence and falls under the hard prohibition above. Writing nothing at all is the failure mode that let `done/LEDGER.md` go five days stale between 2026-07-23 and 2026-07-27.

### Local substitutes

| CI-citing gate | Local substitute | Status |
|---|---|---|
| Backend `npm test` green | `npm test` (`node --test`, ~6s, no build step) | **SUBSTITUTED** — full equivalence |
| Frontend build clean | `npm --prefix frontend run build` | **SUBSTITUTED** — full equivalence |
| `npm audit` clean | `npm audit --audit-level=moderate` | **SUBSTITUTED** — full equivalence |
| Android connected tests / `:app:assembleDebug` | local Gradle against the Codex-sandbox SDK path | **SUBSTITUTED** — note the AVD lacks Play services |
| iOS unsigned simulator CI | on the Mac: `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16'` | **SUBSTITUTED** — same target, scheme, and destination as CI. Record `xcodebuild -version` output alongside the result. On Windows this remains **DEFERRED-CI**. **Do not add `CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`** — corrected 2026-08-19. Those flags were in this row until then, and they make four `KeychainSessionStoreTests` fail with `errSecMissingEntitlement` (-34018): Keychain access needs a keychain-access-group entitlement that only exists on a signed bundle, so disabling signing removes it. The same command without them passes all five. Those tests landed with `S5` on 2026-08-18, after this row was written. **Four red Keychain tests means you used the old command, not that anything is broken.** |
| `Dependency Review` on PR | `npm audit` + manual diff read | **SUBSTITUTED**, weaker — say so |
| `SLOPS Prompt Guard` | `npm run evals:validate` | **SUBSTITUTED** |

### Merging during the hold

Red checks are **not** a merge gate on this repo. Branch protection is unavailable on the current GitHub plan (`/branches/main/protection` returns 403 "Upgrade to GitHub Pro"), so failing runs are cosmetic and merges proceed. PR #214 merged this way at `2026-07-27T01:37Z`.

This means a red PR merged during the hold carries **no implied verification**. The ledger row must carry the local evidence instead, or the DEFERRED-CI note.

### Release Done is hard-blocked

`done/release-done.md` cannot be satisfied during the hold — gate 4 requires the deploy workflow to return success, and no workflow can run. **No Release Done closure may be recorded until Actions is restored.** Work merged to `main` during the hold is merged, not released, and must never be described as live or deployed.

### On restore

Run a sweep before the first new closure: re-trigger the workflows for every open PR and every DEFERRED-CI ledger row, and convert each deferral to a real result or a defect. Track it as one task, not per-PR cleanup.

## The ledger

Every closure is recorded in `done/LEDGER.md`. Review monthly — gates skipped often signal a prompt or skill to revisit.

## Open updates

- Year-2 billing gates: **N/A** — Omen is free indefinitely (decision 2026-06-15).
- Content & Marketing Done lives at L2 for now; promote to L1 when L1's `marketing-strategy.md` + `content-strategy.md` land.
