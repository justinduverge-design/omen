# Audit 2026-08-29 — Phase B, Pass 3, Hotshot

| | |
|---|---|
| **Phase** | B — the apps, read against a running app |
| **Lens** | The Hotshot |
| **Question** | What are we locking ourselves into? |
| **Criteria owned** | A9 behavioural parity, observed rather than read |
| **Commit** | `fc1690c` |
| **Date** | 2026-08-29 |
| **Method** | Same state on both platforms — first-run, and the demo Command Center — captured and compared. |

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | 0 |
| WEEK-1-BLOCKING | 2 |
| AFTER | 0 |
| Abort classes fired | 0 |
| Criteria passed | 1 |
| Criteria not runnable | 1 |

---

## Findings

### F-HOT-B01 — The first screen of the app has a different layout and a different primary action on each platform

- **Claim:** iOS and Android disagree about where the welcome content sits and which button
  comes first. This is the first thing every beta tester sees.
- **Evidence:** Captured on both, fresh install, same build day.

  | | iOS | Android |
  |---|---|---|
  | Content position | vertically **centred** | **top-anchored**, ~75% of the screen empty below |
  | Button order | `Get started` **then** `Try Demo` | `Try Demo` **then** `Get started` |
  | Button position | bottom-anchored, thumb reach | directly under the subtitle, top third |
  | Primary action | filled `Get started`, **above** the secondary | filled `Get started`, **below** the secondary |

- **Failure scenario:** Two testers on two platforms form different first impressions of the
  same product, and the action under the thumb differs. On Android the secondary action is
  encountered first, so the cheapest path to seeing value and the intended path to signing up
  are inverted relative to iOS. Screenshots taken for the store, marketing, or the founder's
  promotional capture will not match each other.
- **Criterion:** A9 — parity is behavioural.
- **Severity:** WEEK-1-BLOCKING — *"both platforms ship the beta together"* is a founder
  decision, and this is the screen that decision is most visible on
- **Reversibility:** afternoon
- **Abort class:** none

### F-HOT-B02 — Parity itself cannot be assessed while the screenshot harness is drifted

- **Claim:** The Hotshot's entire criterion is unverifiable through the tool built to verify it.
- **Evidence:** Every iOS capture in Phase B came through `ScreenshotScenarios.FauxShell`, which
  is a hand-maintained duplicate of the production shell and supplies its own callbacks — for
  example `onOpenAccount: {}` and `onOpenOmen: {}`, chosen because the real screen hides a link
  when the callback is nil. **Concretely observed this pass:** the Android demo context strip
  renders a `Switch` affordance and the iOS capture of the same state does not. That difference
  may be real, or may be an artefact of which callbacks `FauxShell` happens to pass. **From the
  captures alone it is not decidable**, so it is not filed as a parity finding.
- **Failure scenario:** Cross-platform differences are either missed or invented. `F-VET-B01`
  was scored as an evidence problem for iOS; this is the sharper consequence — it degrades
  **comparison**, and comparison is the only way A9 defects are ever visible. `F-HOT-01` and
  `F-HOT-02` in Phase A were both found by diffing platforms; that method is currently unsafe.
- **Criterion:** A9, A10.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon — it is the same fix as `F-VET-B01`
- **Abort class:** none

---

## Criteria passed

**Demo-state parity, on everything decidable. PASS.** The demo Command Center was reached on
both platforms and compared element by element. The two agree on every value and every label:

| Element | iOS | Android |
|---|---|---|
| Greeting | "Demo · this week's move is ready." | identical |
| Context strip | Demo Titans · "Demo Slate (mock league)" | identical |
| Platform rows | Sleeper Connected 4m ago · Yahoo Disconnected · ESPN Disconnected | identical, same fixed order |
| Matchup | LIVE · Demo Titans 6–1 · 64.8 / Demo Rivals 5–2 · 58.1 | identical |
| Projection | "Projected finish: 119.6–114.2" | identical |
| What to watch | "Opponent has two demo players remaining Monday night." | identical |

Provider order is fixed and identical, never connection-sorted. Demo labelling is present on
both. **No value, label, or ordering differs between the platforms in this state** — the mapping
parity asserted from source in Phase A holds when actually rendered.

---

## Criteria not runnable in this pass

**Theme parity.** iOS was observed in **dark**, Android in **light** — each device's own setting.
Neither platform was seen in the other theme, so the light-mode iOS sweep and the dark-mode
Android sweep are **unassessed, not passed**. `F-VET-B04` was found only because Android happened
to be light, which is a fair warning about what the mirrored sweeps might hold.

---

## Handoff

Phase B closes here. Three lenses, six findings across the phase, two candidates ruled out.

**The Hotshot's authority rule applies to his own output, and here it argues against urgency on
one and for it on the other.** `F-HOT-B01` is an afternoon fix that hardens at first
distribution, like its Phase A siblings — the same "last cheap moment" reasoning. `F-HOT-B02` is
not a design decision at all; it is the same harness fix the Veteran already raised, and it
needs no separate work.

**One structural note for whoever runs the next audit.** Phase B found the highest-severity item
in this audit and could not have been reached from Phase A — the harness drift is invisible to a
code read scoped to changed files and obvious within ninety seconds of tapping a tab. The
criteria doc's instruction to run the two phases on **separate days** exists to protect B's
depth; it was run same-day here at founder direction and produced six findings anyway, but that
is not evidence the rule is wrong. It is one data point against a rule written from several.
