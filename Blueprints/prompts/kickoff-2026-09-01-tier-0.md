# Kickoff — Tier 0: make Trade work, make search honest

**Written:** 2026-08-31, end of the audit-and-strategy session
**Predecessor:** `Direction/reviews/2026-08-30-omen-bar-audit-and-strategy.md` (34 findings, 17 founder rulings)
**Handoff:** `Blueprints/handoffs/2026-08-31-the-bar-audit-and-tier-0-attempt.md`

Paste the block below to start the session.

---

```text
You are working in the Omen product layer. Read the CLAUDE.md gate list before
touching anything, including the native mobile read gate.

WHY THIS SESSION EXISTS

The previous session audited the app on real devices, produced a full map and
strategy, took seventeen founder rulings, then started Tier 0 and FAILED to fix
the first item. It reverted its own work rather than ship an unverified fix.
Your job is to finish Tier 0.

Read `Direction/reviews/2026-08-30-omen-bar-audit-and-strategy.md` first —
especially §21, which corrects the previous session's own headline finding. Do
not re-derive it. DO verify it.

THE RULE THAT GOVERNS THIS SESSION

Trust nothing that reports on itself — not the code, not the docs, not a bug
report, and NOT THE PREVIOUS SESSION'S FINDINGS. That last one is new, and it
is there because the previous session's most confident finding was wrong about
its own cause, and its own correction (§21) is the proof.

Three things it got wrong, all in one session:
  1. It claimed iOS Trade broke "after adding one player." False. The second
     field on the screen never worked, with or without a player. It inferred a
     cause from the order it happened to test in.
  2. It told the founder the missing-players reports were caused by a brittle
     matcher. Incomplete. A shared 30/minute rate limit renders identically.
  3. It burned six build-test cycles chasing plausible causes in a large view
     instead of building a minimal reproduction first.

So: reproduce the user's EXPERIENCE, not their explanation — and not your
predecessor's either.

START HERE — THE MINIMAL REPRODUCTION (do this before anything else)

`F-BAR-12`: on iOS, the FIRST text field on a screen focuses and types
normally. Every focusable after it is dead. It follows POSITION, not identity —
proved by swapping the two Trade sections, after which the bug moved with the
position.

Already eliminated, each by a separate build-and-run on iPhone 16 / iOS 26.5 —
do NOT retry these:
  1. the container-wide `.onTapGesture { focusedField = nil }`
  2. doubly-bound `@FocusState` (outer `.focused(_:equals:)` over an
     `OmenTextField` that already binds focus internally)
  3. shared view identity from the one `@ViewBuilder` function (`.id(side)`)
  4. `OmenTextField` itself — a RAW `TextField` in third position is equally
     dead, so the design system is exonerated
  5. the keyboard toolbar (`ToolbarItemGroup(placement: .keyboard)`)
  6. `.scrollDismissesKeyboard(.interactively)`

Build the smallest thing that reproduces it: a `TabView` containing a
`ScrollView` containing two `TextField`s and nothing else. Then bisect —
remove the TabView, remove the ScrollView, change the iOS version. Ten
minutes of this beats another six guesses.

Remaining suspects, in order: the parent `TabView` in `CommandCenterView`
(iOS 26 changed floating-tab-bar focus and safe-area behaviour); the
`ScrollView` + `VStack` + `.frame(maxWidth: .infinity, alignment: .leading)`
interaction; a SwiftUI 26.5 regression needing a repro outside this app.

STRONG SIGNAL: the Sign in screen has the same signature — the top control
works, the email field and the button below it do not (`F-BAR-22`). Treat
`F-BAR-12` and `F-BAR-22` as ONE defect until proven otherwise. If they are
one, the blast radius is every multi-field screen in the app, and fixing it is
worth more than everything else in Tier 0 combined.

TIER 0 — THE QUEUE, IN ORDER

  0.1  F-BAR-12 / F-BAR-22 — focus death after the first field. iOS.
       Trade cannot be completed. This is the founder's front door.
  0.2  F-BAR-34 — every player-search failure renders as "no results".
       `TradeViewModel.search()` swallows `.failure` into `suggestions = []`,
       so 429 / network / decode all look exactly like "this player does not
       exist". VERIFIED live: 30 requests then 429, shared bucket across
       /api/players, /api/trade, /api/demo, /api/draft-assistant, per IP.
       This is the direct cause of the only two external reports Omen has ever
       had. Until it lands, no other search fix is verifiable.
  0.3  F-BAR-29 — the engine scores players that do not exist. An invented
       name gets a VORP, a scarcity tier and an LLM paragraph. Founder ruling
       R-10: refuse to score an unresolvable name. No VORP, no tier, no
       summary, no explanation.
  0.4  F-BAR-30 — matcher has no fuzzy step. "Ted McMillan" and "Jackson Dart"
       return []. Real players, real spellings people actually type.
       Add near-match suggestions ("Did you mean Tetairoa McMillan?").
  0.5  F-BAR-14 — Android: a suggestion row is visually identical to a
       committed player. Only "Remove" distinguishes them, so the screen shows
       a player on the receive side while Compare stays disabled and the copy
       says to add one.

NON-NEGOTIABLES

  - BOTH PLATFORMS SHIP TOGETHER. Every fix lands on iOS and Android in the
    same commit, with tests, verified on simulator AND emulator.
  - VERIFY ON A RUNNING APP. A build that compiles is not a fix. The previous
    session's six failures were all caught this way, and that is the only
    reason none of them shipped.
  - REVERT RATHER THAN SHIP UNVERIFIED. If you cannot prove it works, it does
    not land. Say so plainly and hand back the diagnosis.
  - Honest states. Six content states, never substituted. Silence about a
    failure is not neutral — it is a claim (this is F-BAR-34's whole lesson).
  - Design system only. `PrimitiveEnforcementTests` bans raw SwiftUI controls
    in `App/` sources and it will catch you.
  - Facts of record still bind, especially #6 (no provider credential in any
    artifact), #7 (mock data always labelled), #8 (SQL is founder-gated),
    #10 (season floor clears 2026-09-05) and #12 (`connected` != `usable`).

FOUNDER RULINGS THAT CONSTRAIN THE WORK (full text in §12–§19)

  R-01  Command Center keeps the scroll. Navigation rework DEFERRED, not
        rejected.
  R-02  Trade does both — judging is the default, league-mate picker second.
  R-05  The thesis is the LITERAL reading: you always know which team and
        league you are in. Context strip on all ten screens, never
        contradicting itself between tabs.
  R-06/R-12  Command Center shows up to THREE teams; the user picks which
        three; capped at three.
  R-07  When league settings cannot be applied: say so plainly at full volume,
        and give the generic answer anyway, clearly marked. Not a refusal.
  R-08  Team identity is NAME AND MARK ONLY. No repainting. The July 2026-07-12
        theme removal stands.
  R-09  Native Trade must work. Queued properly — do not reorder the plan
        around it.
  R-10  Unknown players: refuse to score. And coverage should make it rare.
  R-13  Command Center layout is SETTLED: primary team in full + up to two
        compact rows + a swipeable widget deck. Design canvas in
        `design/command-center/`.
  R-14  THE DATA FEEDING A PAGE IS PART OF THE PAGE. A screen whose source
        does not exist yet is a screen that is not ready to build.
  R-15  The deck ships with TWO widgets (Ledger, League Pulse — both really
        fed). Waiver Watch joins when F-BAR-04 is wired. Build the deck as an
        ordered variable-length container, NOT three hardcoded cards.
  R-16  No individual defensive players. Team D/ST only. The current
        `VALID_POSITIONS` filter is correct — this is settled, not a gap.
  R-17  Every active player, every draft class. VERIFIED already true
        (ids 96 → 14039). Coverage is not the problem.

ENVIRONMENT TRAPS THAT COST REAL TIME

  - Android debug builds default to `https://example.invalid` and fail
    silently while demo data keeps the app looking healthy. `-P` properties do
    NOT reach `cfg()`. Use:
      OMEN_DEBUG_API_BASE_URL=https://slopssaloon.com ./gradlew :app:installDebug
  - iOS: `Config/Local.xcconfig` supplies the real base URL. After building,
    CHECK THE BUILT `Info.plist` for `OMEN_API_BASE_URL` — do not trust the
    config file.
  - Gradle `BUILD SUCCESSFUL in 1s` often means no work was done. Use
    `--rerun-tasks` and count tests in `app/build/test-results`.
  - `adb shell input text` drops and reorders characters. Type one character
    at a time with a delay.
  - The iOS simulator's hardware keyboard is connected, so the software
    keyboard does NOT appear even when a field IS focused. Absence of a
    keyboard is not evidence of anything. Use the gold focus ring, or whether
    typed characters land, as the tell.
  - `xcrun simctl install` over an existing app preserves its data container.
    `uninstall` first when you need a clean first-run state.

THE DATE THAT DOES NOT MOVE

2026-09-05 — the season floor clears. Today EVERY player returns
`projected_points: null`, so every trade returns `insufficient_data` and
scoring format cannot change any answer. It is NOT known whether that is
correct off-season suppression or an empty pipeline; it cannot be determined
from outside. CHECK IT DELIBERATELY ON 2026-09-05 rather than discovering it.
Nothing in this app has ever run against a live NFL week.

WHAT TO PRODUCE

  1. Fixes that are verified on a running app, both platforms, or an honest
     statement that they are not.
  2. Updated finding status in the audit doc — including corrections to
     anything the previous session got wrong.
  3. A dated handoff in `Blueprints/handoffs/`.
  4. An explicit list of what you did NOT verify and why. The previous two
     sessions' most useful artifact was that section both times.

THE STANDARD

The founder's: "Valor Ventures should be absolutely proud of this."

Every state in Omen is honest. That discipline has held for three sessions and
is worth keeping. But honest is the floor, not the bar — and honest is not the
same as WORKING. Trade is honest about needing a second player and cannot
accept one. That gap is this session's entire job.
```
