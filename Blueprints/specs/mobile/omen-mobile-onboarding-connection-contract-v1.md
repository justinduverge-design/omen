# Omen Mobile Onboarding and Connection Contract v1

**Status:** **Approved M0 contract** (Justin, 2026-07-19) — revised per M0a review + sign-in audit  
**Date:** 2026-07-19  
**Owner:** Native mobile foundation  
**Purpose:** Define the first successful user path before native screens are built.  
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.  
**Companions:** `omen-native-mobile-foundation-v1.md` (v1, 2026-07-19), `omen-native-design-house-v1.md` (v1, 2026-07-19), `omen-native-agent-capabilities-canvas-v1.md` (v1, 2026-07-19).  
**Review evidence:** `Direction/reviews/2026-07-19-m0a-onboarding-connection-contract-review.md`, `Direction/reviews/2026-07-19-m0a-signin-flow-audit.md`.

> **Figma reality (2026-07-19):** the official Design House (`mWjrAKPi4JSIP5lAmGAtB3`) currently contains only `00 — Start Here`. Onboarding screen contracts are **not yet Figma-anchored**. Until `04 — iOS Screens` / `05 — Android Screens` exist, this Markdown is the working source of truth and Figma is a pending cross-reference.

## 1. The product promise

A new person must be able to reach a useful Omen experience without confusion, an indefinite loading state, or a risky provider credential handoff.

The primary outcome is not “account created.” It is one of these honest outcomes:

1. connected league ready for Omen;
2. connection is paused but clearly resumable;
3. useful Demo Mode reached without a league;
4. provider-specific recovery action clearly explained.

## 2. Critical distinction

A person creates or signs into an **Omen account** first. They then choose whether to connect Yahoo, Sleeper, or ESPN.

Omen must never imply that it is collecting an ESPN password. It must never show, log, copy, or send platform cookie values through view state, screenshots, analytics, or support flows.

## 3. Reference principles

The experience should borrow product behavior, not visual styling:

- Apple calls for onboarding that is concise and helps people get started; its account guidance emphasizes clearly identifying the authentication method. [Apple onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) · [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts)
- Android’s onboarding guidance asks for clear signposting, progress, and a distinct personality; its quality guidance prioritizes standard interactions, adaptivity, and a coherent identity. [Android onboarding](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding) · [Android quality](https://developer.android.com/quality/user-experience)
- Native Supabase authentication requires app deep links for magic links and OAuth returns. [Native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- App review must have a working demo/review path rather than requiring a reviewer to connect a real league. [Apple app review](https://developer.apple.com/distribute/app-review/)

Visual reference audit targets:
- Apple: calm hierarchy, native controls, explicit account choices.
- ESPN Fantasy: timely week/action framing and recovery urgency.
- Yahoo Fantasy: connected-league command-center clarity.
- Sleeper: player and roster fluency with efficient dense lists.
- Omen: dark premium restraint, brass/verdigris expression, decision before evidence.

## 4. Information architecture

### First launch

1. **Welcome**
   - One clear promise: “See the move before the league does.”
   - Two equal, honest paths: **Try Demo** and **Get started**.
   - Do not use a multi-page marketing carousel.

2. **Omen account**
   - iPhone: **Sign in with Apple** — required whenever any third-party/social login is also offered (App Store Review Guideline 4.8); email OTP-code fallback.
   - Android: **Credential Manager (Sign in with Google)** — the legacy Google Sign-In SDK is deprecated and must not be used; email OTP-code fallback.
   - Existing users can sign in immediately.
   - The email fallback uses an **OTP code, not a magic link**, to avoid mobile cross-app deep-link failures.
   - **Three distinct auth mechanisms apply:** native ID-token for Apple/Google (no browser), system-browser OAuth + PKCE for Yahoo, and email OTP. The concrete auth/deep-link/PKCE/secure-token-storage contract is owned by **M0c**; see `2026-07-19-m0a-signin-flow-audit.md` §4.
   - Auth return for browser-based providers is handled with registered mobile deep links, never a fragile manual browser copy/paste. **Deep-link return is an M0c dependency and is not yet implemented** (`GET /api/yahoo/callback` currently returns to the web Account page).

3. **Choose next step**
   - “Connect a league” is recommended, not a trap.
   - “Explore demo first” remains available.
   - Explain the benefit in one sentence: “Connect a league so Omen can use your roster, scoring, and matchup.”

4. **Choose provider**
   - Yahoo, Sleeper, ESPN are presented with explicit availability/status.
   - No provider is selected by default.
   - Platform identity is distinct from Omen status/risk colors.

5. **Connect or recover**
   - Each provider follows the state machine below.
   - A user can leave and return without losing the safe stage of the operation.

6. **First useful destination**
   - Connected: Command Center with connection confirmation and a clear Omen entry.
   - Not connected: Demo Mode / connection recovery, never a dead dashboard.
   - The "connected → Omen ready" transition uses the single dashboard status truth settled by Verify item **F2** (resolved 2026-07-19): active connection with usable provider context → `ready`; active connection lacking that context → `pending_live_engine`. See `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md` §F2 and `src/services/omenReadiness.js`. Native must not adopt a second status meaning.

## 5. Provider policy matrix

| Provider | Intended native path | MVP readiness | Rules |
|---|---|---|---|
| Sleeper | username → resolve account → choose league → validate | first native connection candidate | fast, direct, resumable; no sign-in credential collection by Omen |
| Yahoo | official OAuth in the **system browser** (`ASWebAuthenticationSession` on iOS / Chrome Custom Tabs on Android) with **PKCE** per RFC 8252 → deep-link return → choose/validate league | native candidate after OAuth proof | never embed the login in a WebView; callback and cancel handling are mandatory |
| ESPN | **research-gated**; current web behavior is cookie-based, not an approved native OAuth contract | not allowed to block first-run success | do not ask for ESPN password or raw cookie entry in a store build; show only an honest supported path after a security, provider, and app-store decision |

ESPN is strategically important, but it cannot be treated as “connected” until its native method is proven. The native MVP must still work for demo, Sleeper, and Yahoo users if ESPN is deferred.

## 6. Connection state machine

Every provider adapter must expose the same user-facing states:

```
not_started
  → authorizing
  → awaiting_return
  → resolving_account
  → choosing_league
  → validating_connection
  → syncing_initial_context
  → connected

authorizing / awaiting_return / resolving / choosing / validating / syncing
  → canceled
  → retryable_error
  → needs_reauth
  → unsupported_on_mobile
  → connected
```

Rules:
- No generic endless “Loading…” label.
- Every waiting screen says what is happening and what the user can do.
- Every non-success state has a safe next action: retry, reconnect, choose another provider, explore demo, or contact support without credentials.
- Cancellation is normal, not an error.
- State is server-backed where appropriate so a killed/relaunched app can recover.
- A network failure cannot strand a user on the onboarding screen.

**Backend mapping (M0c):** these are user-facing states. Today `GET /api/platforms` returns connection status and `GET /api/dashboard/summary` returns tool gates and `off_season`; neither exposes this granular machine. M0c owns mapping each state to a safe, machine-readable backend state and defining any new API surface. Do not assume the current API already emits these states.

## 7. Reliability contract

The connection experience must be engineered, not merely styled.

### Required behavior

- Initial app launch renders locally before remote league work begins.
- Login/session restore happens independently from provider sync.
- Long network work shows named progress, a cancel/leave path where safe, and a recoverable result.
- The native client uses request IDs and idempotent connect/validate operations; double-taps and app resumes do not create duplicate connections. *(M0c backend verification required — idempotency of the existing web connect endpoints is not yet confirmed.)*
- Session/auth tokens are stored only in platform secure storage — iOS Keychain and Android Keystore-backed storage — never plain files, logs, or unencrypted preferences.
- The server returns safe, machine-readable connection states and opaque error codes; raw provider/cookie details never enter client copy.
- A connection attempt has a bounded timeout and becomes a visible retryable state, never a permanent spinner.
- Connection status can refresh in the background after the user reaches the Command Center.
- Demo Mode is always functional without auth or a connected league. This is also the App Store / Google Play review path — a reviewer reaches a useful experience without a real league or credentials.

### Required measurements before public release

Record only safe operational telemetry:
- time from provider action to callback/response;
- validation and initial-sync duration;
- completion, cancel, retry, recovery, and failure outcome;
- provider/state/error-code category;
- app version and network class if approved.

Do not record league names, roster data, cookie values, OAuth token values, raw platform errors containing identifiers, or screenshots.

Targets are set only after baseline device/network testing; do not invent a performance claim before measurement.

## 8. Native UX behavior

### iPhone

- Native authentication sheet for Sign in with Apple.
- System browser authentication when provider OAuth requires it.
- Native sheet or navigation stack for provider choice and league selection.
- Back behavior must preserve state or safely cancel it.
- Support Dynamic Type, VoiceOver, reduced motion, and at least 44pt touch targets.

### Android

- Credential Manager (Sign in with Google) where selected; not the legacy Google Sign-In SDK.
- Browser/custom-tab provider OAuth with a verified deep-link return.
- Compose navigation with Android back behavior and state restoration.
- Support TalkBack, font scaling, reduced motion, and Material 3 accessibility baselines.

Both apps may express Omen’s own visual system, but neither should mimic the other platform’s controls.

## 9. Acceptance test matrix

Before a provider path is called ready, test:

- first install, fresh account, existing account, and expired session;
- provider authorization success, cancel, denial, callback failure, app background/foreground, and app termination during return;
- no network, slow network, connection reset, and server timeout;
- no leagues, multiple leagues, invalid username, token expiry, and provider outage;
- user skips connection and still reaches Demo Mode;
- compact and large phones;
- VoiceOver/TalkBack and large text;
- no secret/cookie value visible in UI, logs, test screenshots, or analytics fixtures.

## 10. M0 deliverables

This contract gates the following small briefs:

1. Omen account/auth contract.
2. Provider connection API/state contract.
3. Native onboarding/navigation map.
4. Native token/theme/component registry.
5. Sleeper proof-of-connection brief.
6. Yahoo OAuth proof-of-connection brief.
7. ESPN mobile feasibility and policy decision memo.
8. Demo/reviewer mode contract.

No SwiftUI or Compose feature screen starts until items 1–4 are approved. No “ESPN connected” UI starts until item 7 is resolved.

**Store-compliance note:** because sign-in creates an Omen account, the native apps must offer **in-app account deletion** (App Store Review Guideline 5.1.1), tied to the existing authenticated web flow and its confirmation phrase `DELETE MY OMEN DATA`. This is a release-gate requirement, not an M0 screen brief.
