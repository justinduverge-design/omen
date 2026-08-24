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
| A **screen/design contract** with no implementation yet (Figma + spec, no running UI) | `done/design-contract-done.md` (cross-cutting) |
| A public-facing post / video / social / marketing artifact | `done/content-marketing-done.md` (cross-cutting, L1 work) |

Run cross-cutting gates **in addition** to the primary type. A page change that adds a recommendation triggers Page Done + Recommendation Done + Design Done.

## Procedure receipt (all work)

Every task also follows `playbooks/omen-company-baseline.md` and selects applicable skills from `playbooks/skill-activation-runbook.md`. The handoff must state skills invoked, conditional skills considered but not applicable, evidence, and any procedure gap. Append invoked/skipped-required skills to `playbooks/skill-usage-ledger.md` before closing.

If a touched Markdown page declares `metadata_profile: valor-brain/v1`, run `node scripts/check-valor-brain.mjs`. An invalid opted-in page is not done; ordinary Markdown is outside this gate.

## Foundation: the AAA Framework

From `Brand/brand-system.md` §11: every change must satisfy **Accuracy + Accessibility + Aesthetic Integrity. Two of three is a fail.** Each done-file marks which gates map to which A.

## Evidence discipline

Every gate marked done must **point to evidence** — commit hash, file path, screenshot link, test-run timestamp, skill-verdict location. Do not paste full command output. Justin will investigate from the pointer if needed.

Skipping a gate without writing why = lying about done. Marking a gate done with stale, fabricated, or missing evidence is a hard prohibition.

## Verification substitutes — corrected 2026-08-24

> ✅ **CORRECTED 2026-08-24.** This section previously opened *"Degraded verification — GitHub Actions billing hold — Active since ~2026-07-24"*, declared the Actions allotment exhausted, called failing runs **"cosmetic"**, and stated that **Release Done is hard-blocked**. **All of that rested on a premise that was retracted on 2026-08-01 and never existed** (`Direction/agent_inbox.md` § "RETRACTED — the 'GitHub Actions billing hold' never existed"). Actions was executing the whole time; the red was two real config bugs, fixed in #250.
>
> `done/release-done.md` was corrected on 2026-08-19 when someone tried to pass it. **This file — the pointer every kickoff reads first — kept the false version for a further 23 days.** That is the fourth recorded instance of the same failure: *a correction written where it was discovered, not everywhere it was asserted.*
>
> Verified false at correction time: the three PR checks on [#364](https://github.com/justinduverge-design/omen/pull/364) ran and passed.

### What was wrong, and is now deleted

- **"Release Done is hard-blocked."** It is not, and was not. Nothing in this file blocks a Release Done closure.
- **"Red checks are cosmetic and merges proceed."** Branch protection genuinely is unavailable on this plan (`/branches/main/protection` → 403), so red does not *mechanically* block a merge — but **treat red as a stop.** With no branch protection the checks are the only gate there is, and "cosmetic" is precisely the word that let two production-breaking dependency PRs reach `main`.
- **Any expectation that CI is unavailable.** Run it. `pr-quality.yml` gates every PR: backend tests + audit, frontend and client builds, and a server boot-with-SPA smoke.

### What is still true, and stays

The **SUBSTITUTED / DEFERRED-CI grammar remains in force** — not because CI is down, but because some gates still have no per-PR CI by choice. A gate citing CI is closed one of exactly two ways, and the handoff plus the ledger row must say which:

- **SUBSTITUTED** — satisfied by the named local equivalent below. Record the command, the count, and the date.
- **DEFERRED-CI** — no local equivalent available in this session. Record what will be re-run and where. The work may still merge; the *claim* may not be made.

Writing "CI green" when no workflow ran is fabricated evidence and falls under the hard prohibition above. **And a deferral is not a pass:** `DEFERRED-CI` records that a run has not happened, never that the code would survive one. On 2026-08-20 that distinction turned out to be a hard build error in an iOS test target that had never compiled.

### Local substitutes

| CI-citing gate | Local substitute | Status |
|---|---|---|
| Backend `npm test` green | `npm test` (`node --test`, ~6s, no build step) | **SUBSTITUTED** — full equivalence |
| Frontend build clean | `npm --prefix frontend run build` | **SUBSTITUTED** — full equivalence |
| `npm audit` clean | `npm audit --audit-level=moderate` | **SUBSTITUTED** — full equivalence |
| Android connected tests / `:app:assembleDebug` | local Gradle against the Codex-sandbox SDK path | **SUBSTITUTED** — note the AVD lacks Play services |
| iOS unsigned simulator CI | on the Mac: `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16'` | **SUBSTITUTED** — same target, scheme, and destination as CI. Record `xcodebuild -version` alongside the result. On Windows this remains **DEFERRED-CI**. **Do not add `CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`** — corrected 2026-08-19. Those flags make four `KeychainSessionStoreTests` fail with `errSecMissingEntitlement` (-34018): Keychain access needs an entitlement that only exists on a signed bundle. **Four red Keychain tests means you used the old command, not that anything is broken.** |
| `Dependency Review` on PR | `npm audit` + manual diff read | **SUBSTITUTED**, weaker — say so |
| `SLOPS Prompt Guard` | `npm run evals:validate` | **SUBSTITUTED** |

**Per-PR iOS CI is retired by choice** (2026-08-11): `ios-ci.yml` triggers on `release/**` and manual dispatch only, with routine verification on the founder's Mac. "iOS CI green" is not a citable evidence line outside a release branch.

### Merged is not released

Work merged to `main` is **merged, not released**, and must never be described as live or deployed without `done/release-done.md` gate 4 evidence. This was always true and is not part of the retraction.

## Record integrity — before any closure

Run `node scripts/check-sprint-staleness.js`. It compares the direction files against `main`, merged PRs, and GitHub issues, and never edits anything.

**Read the coverage block, not just the verdict.** It prints what it did *not* inspect on every run, and reports "DID NOT RUN" rather than passing when GitHub is unreachable — a clean result is only meaningful against a stated scope. Index of the checkers and how to add one: `scripts/checks/README.md`; all scripts: `scripts/README.md`.

## The ledger

Every closure is recorded in `done/LEDGER.md`. Review monthly — gates skipped often signal a prompt or skill to revisit.

## Open updates

- Year-2 billing gates: **N/A** — Omen is free indefinitely (decision 2026-06-15).
- Content & Marketing Done lives at L2 for now; promote to L1 when L1's `marketing-strategy.md` + `content-strategy.md` land.
