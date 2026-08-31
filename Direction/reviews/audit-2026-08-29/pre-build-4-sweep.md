# Pre-Build-4 sweep — every reachable screen, both platforms

**Date:** 2026-08-30
**Trigger:** the founder's condition for cutting Build 4 — *"make sure all pages work before
build 4"* — after Build 3 reached his cousins with a Trade screen that did not work.
**Method:** drive each screen on a real simulator/emulator against the **production API** and
look at it. Not "the tests pass". Not "the contract says". Open it and use it.

## Why this sweep existed at all

Build 3 shipped a Trade destination whose player field called nothing (`F-DEV-03`). Six audit
passes and 300+ tests missed it, because every one of them examined **rendered state** and none
of them **typed into the screen**. The founder found it in his first minutes of real use.

So the entry condition here was deliberately different: exercise the flow, don't inspect it.

## What it found

Two defects that no audit pass, no test, and no user report had surfaced.

| ID | Defect | Severity |
|---|---|---|
| `F-DEV-04` | Every Compare would have 400'd — players sent as bare strings, not objects | **Beta-blocking** |
| `F-DEV-05` | Switcher told demo users *"Your session expired"*, which is false | High (on Apple's review path) |

Both are written up in `real-device-findings.md`. The shape worth carrying forward:

- **`F-DEV-04` was hidden behind `F-DEV-03`.** Nobody could reach Compare, so nobody found that
  Compare was broken. **Fixing one defect is what exposed the next.** A sweep that had stopped at
  "autocomplete works now" would have shipped it to the cousins.
- **`F-DEV-05` lived in the intersection of two states that were each checked alone.** The
  switcher was reviewed while signed in (correct). Demo was reviewed on Command Center (correct).
  Nobody opened *the switcher while in demo*.

Both are the same root failure as `F-DEV-03`: **the audit examined states, and defects live in
transitions and intersections.**

## Coverage

| Screen | iOS | Android | Result |
|---|---|---|---|
| Welcome / Try Demo | ✅ | ✅ | renders |
| Sign in (Apple / Discord / email) | ✅ | — | three paths render; founder is signed in on his own device, so the flow is proven in the field |
| Command Center | ✅ | ✅ | full scroll to bottom: matchup, waiver watch, ledger, League Pulse |
| Omen | ✅ | ✅ | `Demo` + `Mock` labels correct per facts-of-record #7 |
| Trade | ✅ | ✅ | typed → picker → pick → both sides → Compare enabled → verdict surface |
| League | ✅ | ✅ | honest "Demo league" — declines to fake a league rather than inventing one |
| Switch Team & League | ✅ | ✅ | **fixed this sweep** (`F-DEV-05`) |
| Account | ✅ | — | signed-in state, support entry, sign out |
| Help + Support | ✅ | — | Help Center, and *"Opens your mail app"* per the `F-VET-06` fix |

**League Pulse renders real content on both platforms.** The founder's original complaint —
*"standings temporarily unavailable takes forever to load"* — is gone.

## What this sweep did NOT prove, stated plainly

- **The full signed-in Trade round trip.** Demo deliberately issues no verdict
  (facts-of-record #7) and no real account was available to sign in with. The payload shape is
  pinned by three tests per platform, and **that exact payload was run against the production
  route and returned a real analysis** — but the in-app end-to-end was not exercised.
- **Real-league League and Command Center.** Demo shows no live league by design. The founder
  confirmed these himself on his device: *"League… standings works… Matchup, standing. Yeah.
  First in a playoff spot."*
- **ESPN's provider path.** Still `M11A` claims 1 and 3, still needs his cookies, still carried
  as a named liability.

## One environment trap, recorded because it nearly caused a false report

The Android **debug build points at `https://example.invalid` by default** — a deliberate
placeholder guard. Every network call fails silently, and because demo data is served locally the
app looks perfectly healthy. Two emulator runs showed an empty autocomplete that read exactly
like a wiring bug in code that was already correct.

`-Pomen.debugApiBaseUrl` does **not** work: `cfg()` reads environment variables and
`local.properties`, never Gradle project properties. The working form is:

```bash
OMEN_DEBUG_API_BASE_URL=https://slopssaloon.com ./gradlew :app:installDebug
```

## Suite state at the end of the sweep

- iOS **326 passing**, 0 unexpected
- Android unit **96 passing**, 0 failures
- Backend **910 passing**

One flake class confirmed, not fixed: `HelpSupportAccessibilityUITests` contrast audits fail on a
simulator that has been driven by hand and pass on a clean boot — a second instance of the
`ContextualHelpAccessibilityUITests` behaviour in register #8. The trigger is the environment,
not the tests.
