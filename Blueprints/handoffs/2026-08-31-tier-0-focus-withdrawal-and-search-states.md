# Handoff — Tier 0: `F-BAR-12` withdrawn, `F-BAR-34` fixed

**Date:** 2026-08-31
**Branch:** `main`
**Scope:** Tier 0.1 and Tier 0.2 of the bar-audit queue.
**Full detail:** `Direction/reviews/2026-08-30-omen-bar-audit-and-strategy.md` §22 and §23.

---

## The headline

**`F-BAR-12` and `F-BAR-22` are withdrawn. There is no focus defect on iOS.**

A trade can be completed on iOS today, and could be before this session started. Two sessions
described this bug three different ways and all three were wrong, because the instrument was
never calibrated.

**Root cause of the false finding:** screenshot pixels were converted to tap points with the
wrong vertical scale (2.251 instead of ≈2.346 px/pt). Every computed tap landed 20–35pt low —
in the gap *between* controls. The taps hit nothing. Because the error is proportional to `y`,
controls further down the screen missed more reliably, which is exactly why the bug appeared to
"follow position" and appeared to move when the two Trade sections were swapped.

§21's six eliminated hypotheses were true negatives from a broken instrument. Six build-test
cycles proved only that a mis-aimed tap does not focus a text field.

**What broke it open:** a minimal reproduction — `TabView` > `ScrollView` > two `TextField`s,
compiled standalone with `swiftc`, no Omen code — worked perfectly on the first try, eliminating
all three remaining suspects in ten minutes. Then a calibration build that renders the tap
location it actually receives proved the tap *coordinates* were exact, localising the fault to
the arithmetic that chose them.

**What this does not settle:** the founder's on-device report still stands as a report. This was
a simulator, and simulator input is not touch input. What is disproved is the **diagnosis** —
`OmenTextField`, `omenFocusRing`, the container tap gesture, the keyboard toolbar, the
`TabView` and the `ScrollView` are each exonerated by direct measurement. If the founder still
cannot complete a trade on his own hardware, that is a **new** investigation carrying no code
suspect forward, and it needs a device log, not another hypothesis.

---

## What shipped

**`F-BAR-34` — every player-search failure rendered as "no results". Fixed on both platforms.**

Confirmed live against production first: `/api/players/search` serves ~27 requests then `429`s
for the rest of the minute, on a bucket shared per-IP with `/api/trade`, `/api/demo` and
`/api/draft-assistant`. This is the direct cause of the only two external reports Omen has had.

`suggestions` is replaced by a five-case `SearchState` (`idle` · `searching` · `results` ·
`empty(query)` · `failed(error)`) on both platforms. `suggestions` survives only as a derived
accessor reading from `.results`, so the old conflation cannot be rebuilt by a caller. `429` gets
its own title and copy; every failure message still names the manual path.

Plus one adjacent fix, deliberately called out as separate: the iOS suggestion row was calling
`onAdd?(player.name, side)` and discarding position/team/id, contradicting its own doc comment
and leaving `onAddResult` dead. Name-only players resolve to `position: "UNK"` server-side and
fall out of scarcity and tier, so this was a scoring defect. Now matches Android.

### Verified on running apps

| State | iOS (iPhone 16 / 26.5, real API base URL confirmed in built `Info.plist`) | Android (emulator-5554, `OMEN_DEBUG_API_BASE_URL`) |
|---|---|---|
| `results` | "Jefferson" → 4 rows | "Jefferson" → 4 rows |
| `empty` | "No player matches “JeffersonZqxwvp”" | "No player matches “Zqxwvp”" |
| `failed(429)` | "Too many searches" + wait copy | "Too many searches" + wait copy |

The `429` state was reproduced by exhausting the live bucket with 45 curl requests from the same
IP, then searching in the app.

**Tests:** iOS 316 (was 308), 0 failures. Android 190 across 24 classes, 0 failures. 8 new tests
per platform, including a direct assertion that `failed(429) != empty(query)`.

---

## What I did NOT verify, and why

1. **The founder's physical device.** Everything here is simulator and emulator. `F-BAR-12` is
   withdrawn as a *code* defect; it is not disproved as a *device* experience. Highest-value
   next step: reproduce on real hardware with a log, or close the report with the founder.
2. **Tier 0.3 `F-BAR-29`** (engine scores players that do not exist, ruling R-10) — not started.
3. **Tier 0.4 `F-BAR-30`** (no fuzzy matching; "Ted McMillan", "Jackson Dart" return `[]`) —
   not started. Both are backend work and neither is unblocked or blocked by this change.
4. **Tier 0.5 `F-BAR-14`** (Android: suggestion row visually identical to a committed player) —
   **not fixed, and still open.** My change added distinct surfaces for `empty` and `failed`
   only; the `results` rows are visually unchanged, so the confusion stands exactly as reported.
5. **The web app.** Untouched. `F-BAR-28` (web Trade has no player search at all) is unaffected.
6. **Real-week behaviour.** Every player still returns `projected_points: null`. The season floor
   clears **2026-09-05** — check it deliberately that day rather than discovering it.
7. **Whether the 429 copy is right at the volume it fires.** The threshold is ~27 requests; with
   a 250ms debounce a fast typist searching three names could plausibly still trip it. Worth
   watching once real users exist; not tunable from the client.

---

## For the next session

Read §22 before anything else. The transferable lesson is not about SwiftUI:

> **Calibrate the instrument before trusting a negative result.** "The app did not respond" is a
> claim about the app *and* about the harness, and the second half went unchecked for two
> sessions. Trust nothing that reports on itself — the test rig included.

Two concrete traps found this session, both worth keeping:

- **iOS has its own `BUILD SUCCESSFUL in 1s`.** A new test file not registered in
  `project.pbxproj` reports `** TEST SUCCEEDED **` while silently not compiling. Count the tests.
- **The simulator screenshot is not uniformly scaled to the reported point space.** Derive the
  scale from a known on-screen geometry, or read tap coordinates back from the app, before
  trusting any coordinate-driven test.
