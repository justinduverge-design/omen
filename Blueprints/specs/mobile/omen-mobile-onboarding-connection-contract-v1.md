# Omen Mobile Onboarding and Connection Contract v1

**Status:** Proposed M0 contract — founder review required  
**Date:** 2026-07-19  
**Owner:** Native mobile foundation  
**Purpose:** Define the first successful user path before native screens are built.  
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.

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
   - iPhone: native Sign in with Apple first; email/magic link fallback.
   - Android: Google Credential Manager / Google sign-in first; email/magic-link fallback.
   - Existing users can sign in immediately.
   - Auth return is handled with registered mobile deep links, never a fragile manual browser copy/paste.

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

## 5. Provider policy matrix

| Provider | Intended native path | MVP readiness | Rules |
|---|---|---|---|
| Sleeper | username → resolve account → choose league → validate | first native connection candidate | fast, direct, resumable; no sign-in credential collection by Omen |
| Yahoo | official OAuth in system browser → deep-link return → choose/validate league | native candidate after OAuth proof | never embed the login in an unsafe fake web view; callback and cancel handling are mandatory |
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

## 7. Reliability contract

The connection experience must be engineered, not merely styled.

### Required behavior

- Initial app launch renders locally before remote league work begins.
- Login/session restore happens independently from provider sync.
- Long network work shows named progress, a cancel/leave path where safe, and a recoverable result.
- The native client uses request IDs and idempotent connect/validate operations; double-taps and app resumes do not create duplicate connections.
- The server returns safe, machine-readable connection states and opaque error codes; raw provider/cookie details never enter client copy.
- A connection attempt has a bounded timeout and becomes a visible retryable state, never a permanent spinner.
- Connection status can refresh in the background after the user reaches the Command Center.
- Demo Mode is always functional without auth or a connected league.

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

- Credential Manager / native Google sign-in where selected.
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
