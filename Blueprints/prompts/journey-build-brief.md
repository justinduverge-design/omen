# Journey build brief

**Read this instead of fifteen files.** This is a *reads-on-demand* page for one job — building a
screen journey from `design/native-visual-lock-2026-09-13/`. It does not grow the always-read core
and nothing here is new authority: every clause points at the source that owns it, and where this
page and a source disagree, **the source wins and this page is the bug**.

**Why it exists.** Six journey agents each read the same ~15 files to build 2–6 screens. Measured on
this branch, agents cost 200k–320k tokens apiece and several were killed mid-task by session limits
with uncommitted work. Most of that reading was identical, and re-reading it is the single largest
avoidable cost in this workflow.

**Still read yourself, every time:** your own artboards, and `CONTRACTS.md` for your screens. Those
are per-journey and this page cannot carry them.

---

## The five deliverables

Per `Blueprints/specs/design/screen-journeys-v1.md`:

1. **Both platforms built to the artboard.** iOS and Android are separate files — write them
   concurrently, not one after the other.
2. **A nominal pass AND a degraded pass.** Degraded means at least one input `unavailable` **and**
   at least one `live, used: false`. A journey with no capability profile degrades on its failure
   path instead. One degraded scenario **per profile** — J5 has two profiles and therefore two.
3. **Journey captures** — an ordered contact sheet, in the order a user meets the screens, under
   `Solutions/deliverables/native-runs/<date>-<journey>/`. **The lead runs these, not you.** The
   simulator and emulator are shared; register your scenarios and stop.
4. **An interaction test per journey.** Model on `J4InteractionUITests.swift` — it is the best one:
   it found three real defects and floors **both** axes at 44pt, not just height.
5. **A reachability proof:** `node scripts/check-screen-reachability.mjs`. Paste the real output.

---

## Settled — do not re-litigate any of these

1. **The artboard wins by default.** Where the built screen is genuinely better, mix the two —
   **then redraw the artboard to the merged result.** Step three is the one that gets skipped and
   the one that matters; an unrecorded mix becomes drift the next agent "fixes" away.
2. **The E017 header slot carries BOTH controls** — contextual help, then the account avatar, in
   Command Center's order. It is on 25 of the 30 artboards. `OmenScreenShell` implements it: use it,
   do not reinvent it.
3. **D11 is waived on `OmenCall` only.** Every other screen whose contract declares a fit binds.
   Overflow is **measured in px and reported either way**, including for declared scrollers — a
   scroller's overflow is what tells the next person whether an edit made it worse.
4. **The ESPN consent screen names the two cookies** (`SWID`, `espn_s2`). Naming the fields is
   disclosure; showing their **values** stays forbidden by fact-of-record #6, everywhere, forever.
   Both halves are pinned by tests on both platforms — do not "tidy" either away.
5. **"ESPN is research-gated" is withdrawn.** ESPN's terms still do not permit this and the founder
   owns that risk knowingly, so **never describe ESPN as approved or sanctioned**. What was false
   was only the conclusion that it may not be built.

## Two more, established while building J2–J5

6. **Spacing is the fifteen-rung native scale** — `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`.
   Registry §2.5 records the founder replacing the nine-rung scale on 2026-09-13, and is explicit
   that the 6/10/14 rungs are what buy the D11 fit. **`component-lock-v1.md` is the *web* Tailwind
   scale** — it is titled "Omen frontend", built on shadcn/Radix, and does not bind native.
7. **Capabilities render as words, never glyphs** (`capability-symbols-v1.md`). `not_requested`
   renders as **nothing**; `unavailable` must be **named** and must survive truncation; a
   `used: false` input never wears evidence styling. Confidence is a **band, never a percentage**.

---

## The hazards, each of which has actually cost this project time

| Hazard | What happened |
|---|---|
| **`cmd \| tail` returns tail's status** | Two Android steps reported green while printing `BUILD FAILED`. Use `set -o pipefail` and read the output. |
| **A green exit code is not a passing check** | A wrapper ending in `echo` reported "exit code 0" for a run whose log said `** TEST EXECUTE FAILED **`. |
| **A cached Gradle pass is not a fresh pass** | `BUILD SUCCESSFUL in 1s` means nothing re-ran. Use `--rerun-tasks` when you need a real count. |
| **`test-without-building` after editing source** | Produced 2 false failures against a stale binary. |
| **Tests that compile but never run** | Six tests were appended to a file by anchoring on its last closing brace — which belonged to a *second* class in that file. They compiled, the run said "Executed 55 tests, with 0 failures", exit 0, and none executed. **Confirm your additions by name in the output.** |
| **The wrong one of two same-named things** | `SectionLabel` exists in both `OmenCommandCenterScreen.kt` and `OmenLeagueScreen.kt`. **Grep by file path, never bare name.** |
| **A screen that photographs and is unreachable** | Four screens shipped reachable only from screenshot scenarios, twice in journeys already closed as complete. No visual review asks; `check-screen-reachability.mjs` does. |
| **A probe that cannot fail** | J2's first D11 probe measured the same view twice, so overflow was structurally always zero. **Inject height and confirm it is detected.** |
| **Gradle build + iOS UI tests at once** | A UI test failed with "Timed out while launching application via Xcode" purely from CPU contention. Run them serially. |

---

## Commands

```bash
# iOS — the name:iPhone 16 form in definition-of-done.md no longer resolves: it implies
# OS:latest, now 27.0, and iPhone 16 exists only at 26.5 here. Do NOT add CODE_SIGNING_ALLOWED=NO,
# which makes four KeychainSessionStoreTests fail with errSecMissingEntitlement.
xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS \
  -destination 'platform=iOS Simulator,id=3168A79A-736F-4E41-B184-BFDDF066BF86'

# Iterate on the 45 unit-test files — seconds, no simulator boot:
  -only-testing:OmenIOSTests
# The 7 UI-test files each boot the simulator. Run the full suite ONCE, at the end.

# Read a result without re-running the suite — seconds instead of ~15 minutes:
RB=$(ls -dt ~/Library/Developer/Xcode/DerivedData/OmenIOS-*/Logs/Test/*.xcresult | head -1)
xcrun xcresulttool get test-results summary --path "$RB"

# Android — a real count needs --rerun-tasks
./gradlew :app:assembleDebug :app:testDebugUnitTest --rerun-tasks

# Gates
node scripts/check-screen-reachability.mjs
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check
```

**Read artboards cheaply.** Each `.dc.html` is ~37KB and ~34KB of it is the same inline CSS:

```bash
awk '/<\/style>/{f=1;next} f' design/native-visual-lock-2026-09-13/<Screen>.dc.html
```

~3KB. Read `_shared.css` **once** for the design system, then the bodies. Never edit CSS inside an
artboard — `sync-canvas-css.mjs` owns it and `--check` exists to catch exactly that.

---

## Session limits are real — commit accordingly

Five agents have been terminated mid-task by rate limits on this work. The ones that lost least had
committed after every completed step. **A committed partial with an honest message is worth far more
than uncommitted perfection**, and a commit message that says what is *unverified* is worth more
than one that reads as done.

Explicit paths only — never `git add -A` or `git add .`. One shared checkout has already swept one
agent's work into another's commit; take your own worktree.

---

## Baselines to match

| | |
|---|---|
| iOS | **532 passed, 0 failed, 1 skipped, 2 expected failures** (at merge `3321ad22`) |
| Android `:app` | **191 unit tests, 0 failures**, `assembleDebug` successful |
| Reachability | **11 findings** — all pre-existing and reasoned. Do not add a twelfth. |
| Canvas CSS | **OK, 30 artboards match `_shared.css`** |

The skip is `HttpOnlyCookieSpikeTests` (needs a local spike server). The two expected failures are
**real, currently-reproducing accessibility defects** — Command Center contrast (#340) and app-wide
Dynamic Type (#338) — deliberately deferred, not test noise. See `Direction/known_issues.md`.
