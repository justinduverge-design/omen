# Handoff — 2026-08-16 — M5-Native-API-Client slice E (Ledger)

**Merged** as PR [#320](https://github.com/justinduverge-design/omen/pull/320) / `ee4387f`, 2026-08-17T00:41Z. **Not deployed.**

> Corrected after the merge, per the closeout rule this repo keeps relearning. No PR checks ran — `pr-quality.yml` is path-filtered and this change is mobile-only, the same precedent recorded for slice D (#317) and `M5-NativeConnect` (#310). Local evidence is the substitute and is recorded below.

## What was wrong

The Ledger section of the Command Center rendered from shell truth alone. `dashboard-summary.v1` carries tool gates and connection booleans — it carries no move rows — so the mapping could only choose between two guesses:

```swift
ledger: omenStatus == .needsPlatform ? .notConnected : .empty
```

Every connected signed-in user was therefore told **"No Ledger entries yet"**, whether or not they had a full history. `GET /api/moves` has shipped since Tier 2 and the web Move History page already consumes it; the native app simply never called it.

## What changed

| File | Change |
|---|---|
| `App/Api/MovesHistory.swift` / `feature/api/MovesHistory.kt` | **New.** Decodes `moves-history.v1` and maps rows to the shipped `OmenLedgerEntry`. |
| `DashboardRepository.swift` / `Repositories.kt` | `MovesRepository` + Api/Stub implementations. |
| `CommandCenterViewModel.swift` / `.kt` | Second request after the shell renders; owns `loading` / `error` / rows. |
| `DashboardSummary.swift` / `.kt` | `from(summary:context:ledger:)` — slice E overlay, same never-regress rule as slice C. |
| `OmenCommandCenterScreen.swift` / `.kt` | `OmenLedgerPreviewState` gains `loading` and `error`, both rendered through `OmenStateSurface`. |
| `AppShellView.swift` / `OmenAndroidApp.kt` | Constructs `ApiMovesRepository` from the same public base URL. |

**No backend change.** No query string either: `season` defaults to the current NFL season server-side and `limit` to 20. Sending our own season would mean the client deciding what "this season" is, which `getCurrentNflWeekContext()` already owns.

**Composition unchanged.** Approved Figma node `72:2` is untouched — the two new states use the existing state surface, which the composition already used for empty and disconnected.

## The part worth reviewing: nullability, and one deliberate asymmetry

Following the slice-D lesson, I read `src/routes/moves.js` before modelling the client. `normalizeMove()` emits `null` **per field**: `recommendation` is `headline || reasoning || null`, and `move_type`, `followed`, `stars`, `effectiveness_pct`, and `created_at` are each independently null on an ordinary ungraded row. Only `id` is always present. So every field but `id` is optional on both platforms — modelling them as required would turn the most common row shape into a decode failure and tell the user their Ledger is unreadable when the truth is "this move hasn't been graded yet".

On Android that meant not using `org.json`'s coercing readers: `optString`/`optInt`/`optBoolean` return `""`, `0`, and `false` for an absent key, which is precisely how a missing grade becomes a fabricated one. Null-preserving readers are at the bottom of `MovesHistory.kt` and are pinned by an all-nulls test.

**The asymmetry worth a second look:** a standings failure is silent (slice C) and a Ledger failure is not. The context strip has an honest resting state — an unfilled strip claims nothing. The Ledger's resting state is *"No Ledger entries yet"*, which is a positive claim about the user's history, so rendering it after a failed read would tell a user with a full Ledger that they have none. Hence a visible error surface, while the rest of the screen stays up.

### Honesty rules, each pinned by test on both platforms

1. **A row with no recommendation is dropped, not rendered blank.** A line reading only "WEEK 6 · WAIVER" looks like a rendering bug.
2. **An unlabelled `move_type` renders as `MOVE`.** Naming it "START/SIT" or "WAIVER" would assert advice Omen never recorded.
3. **Effectiveness shows only for a followed, decided move** — mirroring `buildSummary()`, rather than pairing a score with a move the user never made.
4. **An unrecognised `outcome` is shown verbatim**, not bucketed into "pending", which would hide a real backend change behind a plausible word.
5. **A malformed row drops itself, not the section**; a malformed payload fails to an honest error.
6. **`needs_platform` never issues the request** — that user's Ledger is `notConnected` by definition, and "no entries yet" would be a weaker answer bought with a round trip.
7. **Demo cannot reach the network.** The load path short-circuits on the demo user id; tests supply a counting repository to prove zero calls, assert live ledger state stays `nil`, and assert every demo row still carries its `DEMO` label (facts-of-record #7).

`moves.id` decodes from a JSON number **or** a string, so a future column-type change cannot silently blank a user's Ledger. It is the one field with no honest fallback — an unreadable id drops the row rather than minting a UUID that would change on every refresh.

## Evidence

- **iOS 221/221** unit + **5/5** UI tests — `xcodebuild test`, **Xcode 26.6, build 17F113**, iPhone 16 simulator. Baseline 208 unit (+13: 8 `MovesHistoryTests` + 5 slice-E view-model tests).
- **Android `:app:testDebugUnitTest` 27/27** JVM (`MovesHistoryTest` 9, `CommandCenterLedgerTest` 5, `OmenDecisionTest` 13 unchanged) — baseline 13, +14. `:app:assembleDebug` **BUILD SUCCESSFUL**. `:core:designsystem:testDebugUnitTest` **22/22** with `--rerun-tasks`, including the primitive-enforcement scanner.
- **Backend unchanged** — no file under `src/`, `test/`, or `frontend/` was touched; the 563/563 baseline stands from the previous session rather than being re-claimed here.

**Note on the Android test location:** all slice-E Android tests are pure mapping and view-model logic, so they live in `:app/src/test` (JVM), per the source set added earlier today. No new instrumented test was needed, and the connected 64-test instrumentation suite was **not** re-run this session.

## What is NOT proven

- **No live round trip.** Every state is exercised from contract-shaped JSON. The server has not been observed emitting these bodies for a real signed-in user with real move rows.
- **No device render.** No screenshot of the wired Ledger on either platform — test-proven, not eye-proven. The two new state surfaces (`loading`, `error`) have never been seen on a device.
- **The connected Android instrumentation suite was not re-run**, so the on-device Command Center render is unchanged-by-inspection rather than re-verified.
- Slice **F** (League) and **G** (Trade) remain design-gated behind `M1-Screen-League` / `M1-Screen-Trade` and must not be pulled without approved contracts.
