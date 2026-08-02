# Handoff — M4-Auth-Providers-v1 Discord shipped, Passkey deferred — 2026-07-24

## Session arc

Kickoff pulled M4-Auth-Providers-v1 → verified blockers (PR #195 merged, `androidx.browser` approved, Supabase dashboard confirmed) → built Step 4 contract layer both platforms → discovered Supabase passkey feature is `@_spi(Experimental)` with no public REST → founder pivoted to **Discord-only** (passkey on deck) → built Step 5 Discord platform impls both platforms → discovered pre-existing `ios-ci.yml` YAML bug that had been silently failing every run since check-in → fixed CI → discovered GitHub Actions billing gate blocking macOS runners. PR #198 is code-complete for Discord and frozen at the CI billing gate.

## PRs

| # | Branch | State | What |
|---|---|---|---|
| [#198](https://github.com/justinduverge-design/omen/pull/198) | `claude/m4-auth-providers-v1` | 🟡 DRAFT — code-complete, iOS CI blocked on billing | M4-Auth-Providers-v1 Step 4 (contract layer, both platforms) + Step 5 (Discord OAuth wired both platforms) + `ios-ci.yml` YAML fix. |

## What actually shipped (in the PR)

### Step 4 — contract layer (both platforms, symmetric)

- **New states:** `LaunchingOAuth(providerId)`, `ExchangingOAuthCode(providerId)`, `LaunchingPasskey`, `ExchangingPasskeyAssertion`.
- **New failures:** `OAUTH_PROVIDER_NOT_CONFIGURED`, `OAUTH_CALLBACK_MISMATCH`, `PASSKEY_UNAVAILABLE`, `PASSKEY_NO_CREDENTIAL` (placeholder copy per brief §10).
- **New events:** `OAuthRequested`, `OAuthCallbackReceived`, `OAuthExchangeResult`, `PasskeyRequested`, `PasskeyAssertionResult`, `PasskeyExchangeResult`.
- **New outcomes:** `AuthOutcome.OAuthCallbackMismatch`, `AuthOutcome.OAuthProviderNotConfigured`; `TransportResult.Challenge` variant for WebAuthn.
- **New seams:** `SupabaseOAuthProvider` (provider-agnostic `isConfigured`/`launch`/`parseCallback` with PKCE + CSRF state) + `Unconfigured*` default; `PasskeyProvider` (`isSupported`/`getAssertion`/`register`) + `Unsupported*` default; `PasskeyResult` sealed type.
- **AuthRepository:** `exchangeOAuthCode`, `startPasskeyChallenge`, `signInWithPasskey`, `registerPasskey`.
- **GoTrueTransport:** 4 matching methods.
- **Reducer:** OAuth callback with mismatched providerId → `Failed(OAUTH_CALLBACK_MISMATCH)` (first CSRF/routing guard in the state machine).
- **Tests:** +12 reducer + +8 repository tests per platform (24 Android JVM + 24 iOS XCTest).

### Step 5 — Discord platform impls

**Android:**
- `androidx.browser:browser:1.8.0` dep added (founder-approved 2026-07-24).
- `PkceCodes.kt` in `:core:auth` — RFC 7636 code_verifier + SHA-256 challenge + CSRF state. 5 JVM tests.
- `AndroidChromeTabsOAuthProvider.kt` — Chrome Custom Tabs launcher; generates PKCE + state, opens Supabase `/auth/v1/authorize?provider=discord&flow_type=pkce&…`, `parseCallback` validates CSRF and consumes stash (single-use).
- `OAuthCallbackBus.kt` — replay-1 SharedFlow bridging `MainActivity.onNewIntent` to Compose.
- `MainActivity.kt` — `onNewIntent` + `forwardOAuthCallback` post the deep-link URI.
- `OmenAndroidApp.kt` — wires OAuth provider, adds `LaunchingOAuth`/`ExchangingOAuthCode` dispatch, collects the bus, dispatches `OAuthCallbackReceived` + `OAuthExchangeResult`.
- `OmenAuthFlow.kt` — "Continue with Discord" `OmenButton(Secondary)` under "More ways to sign in" divider; only rendered when `SupabaseOAuthProvider.isConfigured("discord")` is true; disabled + loading during ceremony.
- `OkHttpGoTrueTransport.exchangeOAuthCode` — real HTTP: `POST /auth/v1/token?grant_type=pkce` with `{ auth_code, code_verifier }`.
- The `com.slopssaloon.omen://auth/*` intent-filter was already in `AndroidManifest.xml` (Yahoo); no manifest changes needed.

**iOS:**
- `PkceCodes.swift` in `Core/Auth` — CryptoKit-backed mirror of the Kotlin helper.
- `ASWebAuthenticationOAuthProvider.swift` — `ASWebAuthenticationSession` + `ASWebAuthenticationPresentationContextProviding`. `presentationAnchor` walks UIApplication foreground scene for a key window.
- `URLHelpers.swift` — `URL.queryValue(_:)` extension for callback parsing.
- `URLSessionGoTrueTransport.exchangeOAuthCode` — real HTTP against the same PKCE endpoint.
- `AuthViewModel.swift` — accepts a `SupabaseOAuthProvider`; adds `signInWithOAuth(providerId:)` + `handleOAuthCallback(_:)`.
- `OmenIOSApp.swift` — constructs `ASWebAuthenticationOAuthProvider` when Supabase is configured, `UnconfiguredSupabaseOAuthProvider` otherwise; `.onOpenURL` scoped to `com.slopssaloon.omen://auth/*` feeds the view model. Info.plist URL scheme already present for Yahoo; no plist change needed.
- `SignInView.swift` — "Continue with Discord" `OmenButton(Secondary)` gated on `viewModel.discordSignInAvailable`.
- Xcode `project.pbxproj` — registers 3 new source files (PkceCodes, ASWebAuthOAuthProvider, URLHelpers) in Core/Auth + App/Auth groups + Sources build phase.

### CI fix

- `.github/workflows/ios-ci.yml` — removed duplicate `branches:` mapping key that YAML rejected. iOS CI had never actually run since this file was checked in (every push/PR failed at 0s with "workflow file issue"). Fix commit landed cleanly.

## What did NOT ship (and why)

**Passkey wiring** — deferred to `M4-Auth-Passkeys-Onramp` (P2, filed in sprint M lane). Supabase's passkey feature is `@_spi(Experimental)` with the explicit disclaimer *"The API may change without notice."* The JS/Swift SDKs are the only supported clients — no public REST shape documented. Both platforms are deliberately SDK-free per the M0c contract (comment in `URLSessionGoTrueTransport.swift`: *"no Supabase SDK, mirroring Android's OkHttpGoTrueTransport"*). Options presented to founder:
- A. Add Supabase Swift + Kotlin SDKs just for passkeys → breaks doctrine.
- B. Reverse-engineer WebAuthn REST from JS SDK source → fragile, silent breakage risk.
- C. Ship Discord-only, passkey on deck. **← founder chose this 2026-07-24.**
- D. iOS-only SDK. Asymmetric mess.

Contract-layer passkey types + seam remain in place; `UnsupportedPasskeyProvider` gates the UI so no passkey button renders today.

## Verification

- **Android:** `:app:assembleDebug` GREEN. `:core:auth:testDebugUnitTest` GREEN (all Step 4 tests + 5 new PKCE tests). `:core:designsystem:testDebugUnitTest` GREEN (primitive-enforcement scanner still empty allowlist).
- **iOS:** `xcodebuild` not runnable on Windows dev box. iOS CI workflow now valid YAML, but macOS runners rejected by GitHub: *"recent account payments have failed or your spending limit needs to be increased."* macOS runners bill at 10x on private repos; first thing to fail when Actions quota is exhausted.

## Blockers to clear before merge

1. **GitHub Actions billing restored** (expected August 2026).
2. iOS CI green on `claude/m4-auth-providers-v1`. Trigger with `gh workflow run ios-ci.yml --ref claude/m4-auth-providers-v1`, or push a trivial re-trigger commit.

## Fresh-session kickoff prompt (August 2026 when billing returns)

```
You are Claude working on Omen. Soft lean: frontend, docs, specs.

Active task: unblock PR #198 (M4-Auth-Providers-v1 Discord slice) now that GitHub
Actions billing is restored.

1. Trigger iOS CI: `gh workflow run ios-ci.yml --ref claude/m4-auth-providers-v1`.
   Wait for verdict.
2. If GREEN: mark PR #198 ready for review; land it (Justin approves merge).
3. If RED: address whatever iOS CI surfaces. Most likely surface areas: Xcode
   project.pbxproj file registrations (Core/Auth + App/Auth groups + Sources build
   phase), missing imports in ASWebAuthenticationOAuthProvider.swift, exhaustive
   switch coverage over new AuthOutcome / TransportResult / AuthFailure cases.

Read before touching:
- Blueprints/handoffs/2026-07-24-m4-auth-providers-v1-discord-shipped-passkey-deferred.md
- Blueprints/specs/mobile/m4-auth-providers-v1-brief.md
- Direction/current_sprint.md → M lane → M4-Auth-Providers-v1

Do not touch: passkey wiring (separate M4-Auth-Passkeys-Onramp item), Yahoo path,
provider secrets, deploy.
```

## Skills used this session

`slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd` (PKCE tests as RED gate; reducer tests already RED-first in Step 4), `slops-quality-baseline` (Android baseline reheld), `slops-code-review` (self-review during pivot decisions). Considered but N/A: `slops-mobile-smoke` (native, no browser preview), `slops-ui-ux-audit` (only one Secondary button added per platform, exact-primitive composition), `slops-ux-copy` (Discord button copy is Discord brand-required; passkey copy defers per brief §10), `pre-build-research` (used inline via Supabase docs search instead of separate skill), `slops-financial-sketch` / `security-privacy-evidence` / `rbac-risk-review` / `slops-legal-spot-check` (no financial, permission, or legal-surface change; auth code path already covered by M0c contract; Discord OAuth uses public PKCE with CSRF state).

## Skill improvement (one thing worth propagating)

The passkey pivot decision was quality work worth remembering: when a doctrine ("no SDK") and a feature ("wire passkeys") collide, surface the actual options with weight to the founder before writing speculative code. Don't defer, don't half-ship, don't rebel silently. This session did that — a "just wire it" instinct would have shipped fragile reverse-engineered REST calls against an experimental Supabase feature that would break silently on the next Supabase iteration. Filing as guidance-worthy in the loop retro.

## Open state on this session's worktree

- `main` synced (from earlier commit `d3625f8` → +1 for #195 merge → then Step 4 + Step 5 + CI-fix on `claude/m4-auth-providers-v1`).
- Untracked / uncommitted (not touched this session, from prior sessions): `PR_TRIAGE_REPORT.md`, `scripts/prune-merged-branches.sh`, Supabase Vault remediation files (`sql/omen_rls_security.sql`, `test/securitySql.test.js`, `Blueprints/handoffs/2026-07-23-p0-supabase-vault-permissions-remediation.md`, `Direction/reviews/2026-07-23-p0-supabase-vault-permission-remediation.md`, `sql/2026-07-23_revoke_public_vault_function_execution.sql`). These are a separate P0 arc — should be committed on their own branch when addressed.

## Next session's first move

**August 2026 (when Actions billing returns):** paste the kickoff prompt above.
