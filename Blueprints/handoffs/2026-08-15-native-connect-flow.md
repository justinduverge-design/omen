# Handoff — 2026-08-15 — M5-NativeConnect: the native connect flow

**Branch:** `feat/m5-native-connect`. **Not deployed** — native ships through the stores.
**Authority:** `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §4 (IA), §5 (provider policy), §6 (state machine), §7 (reliability).

## Why this was the top item

After M5 slices A–C the apps read real shell truth and honestly told a disconnected user to "Connect a league to see your matchup" — and then offered **no way to do it**. No connect screen, no provider picker, no call to the shipped Sleeper routes on either platform. `OmenPlatformConnectionCard` existed as a design-system component used only in the gallery.

## What shipped

Onboarding steps 4–6 on both platforms: **choose provider → connect or recover → first useful destination**. Steps 1–2 (Welcome, Omen account) were already built.

- iOS: `App/Connect/{ConnectFlow,ConnectRepository,ConnectViewModel,ConnectView}.swift`
- Android: `app/feature/connect/{ConnectFlow,ConnectRepository,ConnectViewModel,ConnectScreen}.kt`
- Entry point: a "Connect a league" button on the Command Center, shown **only** when the shell has no verified context and a connect path exists — it can never advertise a dead end or sit beside a real league name.

## Provider policy — a contract decision, not a shortcut

| Provider | Shipped behavior | Why |
|---|---|---|
| **Sleeper** | full in-app connect | contract §5 names it "first native connection candidate"; routes already shipped |
| Yahoo | honest "On hold" | `YAHOO_ENABLED` false pending a Fantasy API entitlement only Yahoo can grant. The OAuth handshake succeeds while every Fantasy call 403s — a button here would produce a connection that reads connected and serves nothing |
| ESPN | routed to web + extension | §5 research-gates ESPN and forbids password or raw cookie entry in a store build; §10 blocks "ESPN connected" UI until the feasibility memo resolves. Works because `platform_connections` is server-side per user |

## Contract rules the code enforces, with tests

1. **Cancellation is normal, not an error** (§6). Modeled as its own state; a test asserts it never becomes `retryableError`, and the copy does not apologize or scold.
2. **No generic endless "Loading…"** (§6). Each waiting state carries its own sentence; asserted per state.
3. **Every non-success state has a safe next action** (§6). Errors offer retry *and* the demo; an unavailable provider explains itself and routes onward.
4. **Idempotent connect** (§7). Retrying an attempt reuses its `request_id` so the backend replay guard recognizes it. A fresh id is minted only for a genuinely new attempt, and cancelling clears the pending one so an abandoned attempt is not answered from the ten-minute replay cache. Both behaviors are tested.
5. **Generated ids match `NATIVE_REQUEST_ID_PATTERN`** (`[A-Za-z0-9_-]{16,128}`) — otherwise the route 422s before reaching Sleeper. Asserted directly rather than assumed.
6. **No credential language** (§2, §7). A test scans every failure message for "password", "cookie", and "token".
7. **No placeholder beside a real value.** A league missing scoring format or team name renders a shorter subtitle rather than printing a gap filler.

## Evidence

- **iOS 174 / 0** (Xcode 26.6 `17F113`, iPhone 17 Pro simulator). Baseline 158/0 — +16.
- **Android 42 connected instrumentation tests / 0 failures** (`medium_phone` API 36). Baseline 26/0 — +16. Plus `:app:assembleDebug`, `:app:assembleDebugAndroidTest`, and `:core:{auth,session,designsystem}` unit tests green.
- Backend unchanged at **537/537**.

### A flake, recorded rather than buried

The **first** full Android connected run aborted mid-suite — `Expected 42 tests, received 23` — with a collateral failure in the pre-existing `OmenCommandCenterScreenTest`. Both classes then passed in isolation (4/4 and 16/16), and **three consecutive full runs passed 42/42**.

Read as emulator instability on first boot after `assembleDebugAndroidTest`, not a product defect. Recorded because a fail-then-pass that gets quietly reported as "green" is how a real intermittent bug hides. If this recurs, start here rather than re-diagnosing.

## Not covered — real-device QA remains

This item proves the **state machine and provider policy**, not the device matrix. The contract §9 acceptance list still open:

- a real Sleeper account round trip against live data;
- app backgrounded / terminated mid-connect, and return-to-foreground recovery;
- no-network, slow-network, and connection-reset behavior;
- VoiceOver / TalkBack, Dynamic Type / font scaling, compact and large phones.

Do not describe native connection as production-proven on this evidence.

## Next

- `M6-ContextualHelp` — spec-backed and now more valuable, since there is a real connected state to explain.
- M5 slices **D** (Omen destination) and **E** (Ledger) — wiring against shipped routes.
- Slices **F/G** (League, Trade) still need their M1 screen-contract slices before any build.
