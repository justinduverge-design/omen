# M4-Auth — Omen-primitive-native auth surfaces (retirement) — 2026-07-23

## Scope

Refactor the two auth files that were allowlisted in `PrimitiveEnforcementTest.ALLOWLISTED_FILES` so they compose only approved Omen primitives, then remove both allowlist entries in the same PR. Single-event exit condition per the M4-Auth sprint item.

## Files changed

- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenAuthFlow.kt` — full rewrite. Old: raw `Column` + `Button` / `OutlinedButton` / `OutlinedTextField` + material3 `Text`. New: `OmenCard` (Solid) shell → `Column` with `OmenTheme.spacing.step16` gaps → typography-tokened title + subtitle → OTP branch uses `OmenFormField` + `OmenTextField(Number)` + `OmenButton(Primary, loading=VerifyingOtp)` → email branch uses `OmenFormField` + `OmenTextField(Email)` + `OmenButton(Primary, loading=RequestingOtp)` + `OmenButton(Secondary)` for Google (disabled when not configured) → `Failed` branch renders `OmenStateSurface(kind=Error)` + `OmenButton(Primary)` retry → `OmenButton(Tertiary)` for Back. Public composable signature preserved — no caller changes needed in `OmenAndroidApp.kt`.
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenDeleteAccountScreen.kt` — full rewrite. Old: raw `Column` + `Button` / `OutlinedButton` / `OutlinedTextField`. New: `OmenCard(Outlined, tone=Risk)` shell → typography-tokened title + warning → `OmenFormField(label, hint="Type $REQUIRED_PHRASE to confirm", errorMessage=message)` wrapping `OmenTextField` → `OmenButton(Danger, loading=deleting, enabled = !deleting && AccountDeletion.isConfirmed(phrase))` confirm → `OmenButton(Secondary)` cancel. Public signature preserved.
- `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/enforcement/PrimitiveEnforcementTest.kt` — `ALLOWLISTED_FILES` reduced to `emptyList()`. Companion doc block updated with a 2026-07-23 retirement note and reiterates the M4-Auth non-expansion covenant (no new auth file may join without a separately-tracked retirement item).

## Verification

- `:core:designsystem:testDebugUnitTest --tests PrimitiveEnforcementTest` → **BUILD SUCCESSFUL**. Scanner now walks `mobile/android/app/src/main/kotlin` with an empty allowlist and finds no banned imports or raw hex color literals across the app module.
- `:app:assembleDebug` → **BUILD SUCCESSFUL**. `compileDebugKotlin` clean for the refactored files; downstream dex/package tasks green.
- Compose renders not exercised on device this session; the semantics are load-bearing, so real-device visual QA before merge is worth a quick pass.

## Behavior deltas (intentional, backwards-compatible signatures)

- Failed-sign-in copy is now surfaced through `OmenStateSurface(kind=Error)` (titled "Sign-in didn't complete") instead of an unstyled `Text`. Reads as an honest error state per registry §3.1.
- Delete-screen validation `message` is now routed into `OmenFormField.errorMessage` (liveRegion polite) instead of a raw `Text` line, so TalkBack announces validation feedback and the styling matches the design-system field-error contract.
- All CTAs are `fillMaxWidth` — matches the P3 DecisionBrief pattern and gives thumb-reachable primary/secondary actions on phone widths.
- Google button is now disabled (`enabled = googleConfigured`) rather than clickable-with-a-caveat-label. Caveat label is retained; disabled state is now honest.

## Non-behavior deltas

- `OmenAuthFlow` and `OmenDeleteAccountScreen` public composable signatures are unchanged. No callers in `OmenAndroidApp.kt` needed to change.
- No auth wiring touched (`core/auth`, `AuthFlowState`, `AccountDeletion.REQUIRED_PHRASE`, `SessionManager`, Supabase). No credentials, secrets, deploy, SQL, provider integration.
- iOS side unchanged — iOS auth uses its own SwiftUI files and its own `PrimitiveEnforcementTests`; nothing to retire there.

## Skills used

`slops-repo-inspector` (primitive inventory + call-site trace), `planning-pass` (single-item pull, single-event exit condition), `slops-git-flow` (dedicated branch, explicit-path commits, no `-A`), `slops-tdd` (scanner is the objective GREEN gate — allowlist removed → scanner green → done), `slops-quality-baseline` (both gates green: scanner + `:app:assembleDebug`), `slops-code-review` (self-review against registry §3.1 primitive contract, signatures preserved).

## Skills considered but N/A

- `slops-mobile-smoke` — web-driver-based; Android-native Kotlin refactor is out of its scope. Substituted by scanner + Gradle assemble, same pattern as prior M1-P PRs.
- `slops-ui-ux-audit` — no visual redesign; this is a primitive-swap that inherits already-audited primitive behavior. If Justin wants a visual pass on the reworked auth cards, it's a follow-up.
- `slops-ux-copy` — copy strings preserved verbatim (only new copy is the OmenStateSurface title "Sign-in didn't complete"). If the wording is off-voice, easy follow-up.
- `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check` — no data-classification, permission, provider, or legal-surface change.

## Skill improvement

No correction needed. The "shrink-the-allowlist" workflow used here is a natural fit for the existing `slops-code-review` primitive-enforcement pattern documented after M1-P P4 — treating scanner-empty-allowlist as the objective RED→GREEN for retirement items works well and shouldn't need a new skill.

## Branch / commit / PR status

- Branch: `claude/m4-auth-primitive-retirement` (off `main` at `3edd946`).
- Files staged: the two auth files + `PrimitiveEnforcementTest.kt` + this handoff + sprint/inbox/ledger updates.
- Not pushed; not merged; not deployed. Justin approves push and merge.

## Do-not-touch honored

- `.env`, secrets, credentials, Supabase config, DNS, deploy, package files: untouched.
- Auth wiring (session/store/reducer/repos), account-deletion phrase, iOS auth: untouched.
- `OmenAndroidApp.kt` M2 shell logic: untouched (already primitive-native since M4 CC v1 landed).
