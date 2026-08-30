# Audit 2026-08-29 — Phase B, Pass 2, Scrappy

| | |
|---|---|
| **Phase** | B — the apps, read against a running app |
| **Lens** | The Scrappy One |
| **Question** | What does this actually cost? |
| **Criteria owned** | B1, B4 |
| **Commit** | `fc1690c` |
| **Date** | 2026-08-29 |
| **Method** | Fresh install both platforms. iOS: uninstall/reinstall, cold launch, first-run screen. Android: `pm clear`, `am start -W` timing, Try Demo path. |

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | 0 |
| WEEK-1-BLOCKING | 0 |
| AFTER | 1 |
| Abort classes fired | 0 |
| Criteria passed | 1 |
| Criteria not runnable | 1 |
| Candidate findings ruled out | 1 |

**This is a thin pass and it should be read as one.** The Scrappy lens owns two criteria; one of
them is largely unmeasurable without a real account. Padding it would be the failure this lens
is supposed to catch in other people.

---

## Findings

### F-SCR-B01 — Demo is the cheapest onboarding asset in the product and it is positioned inconsistently

- **Claim:** The demo path lets a tester see real value with zero setup, and it is already
  built and honestly labelled — but it sits **below** the primary action on iOS and **above** it
  on Android.
- **Evidence:** iOS first-run: `Get started` (filled) then `Try Demo` (outlined), bottom-anchored.
  Android first-run: `Try Demo` (outlined) then `Get started` (filled), top-anchored. Both
  captured this pass. Tapping Android's `Try Demo` reaches a fully populated Command Center —
  live matchup, scores, projection, what-to-watch — with **every element labelled demo**.
- **Failure scenario:** Not a defect a user hits; a value the product leaves on the floor. A
  beta tester who cannot or will not connect a league immediately has one honest way to see what
  Omen does, and the two platforms disagree about how prominent it is.
- **Criterion:** B1 — the first ninety seconds.
- **Severity:** AFTER
- **Reversibility:** afternoon
- **Abort class:** none

---

## Criteria passed

**B1 — the first ninety seconds. PASS on what was walkable.** Install → launch → welcome →
`Try Demo` → populated Command Center, on Android, in four taps and no dead ends. Nothing
spun, nothing failed, and every demo element is labelled as demo. **The sign-in and connect
legs were not walked** — they need a real account.

**Timing, measured rather than asserted:**

| Platform | Measurement | Value |
|---|---|---|
| iOS | `simctl launch` call, cold, fresh install | **874 ms** |
| Android | `am start -W` TotalTime, cold, first ever run | **10,373 ms** |
| Android | `am start -W` TotalTime, cold, runs 2–4 | **5,745 / 2,562 / 2,267 ms** |

**No timing defect is claimed, and the reason is the whole point.** A single measurement would
have reported a **10.4-second cold launch** and almost certainly filed it beta-blocking. Three
more runs showed it converge to ~2.3 s: the first figure was the freshly-booted emulator's own
warm-up, not the app's. Both are debug builds on virtual devices, so neither number
characterises release-on-hardware. This is `O4`'s recorded lesson — *a performance number means
nothing without a stated policy* — reaching the same conclusion from the other direction.

---

## Criteria not runnable in this pass

**B4 — timing, on the target that matters.** The named target is the Omen of the Week enrichment
chain: `src/routes/omen.js:541-560` awaits the live provider build, then DvP, then LLM, then
persistence **in sequence**, with DvP and LLM both commented *"enhancement only."* Measuring it
requires an authenticated request against a real connected league. **Not estimated. Not
inferred.** It stays open against the provider-proof work the founder deferred.

---

## Ruled out — recorded so it is not re-found and mis-reported

**The bright green border around the Android platforms card is NOT an app defect.** Sampled from
the raw framebuffer it is **`#1EFF1C`** — pure-saturation lime, matching no Omen token (nearest
brand greens are `dataLive` `#34C759` and `omen` `#2F7D5B`). That looked like a design-system
violation. It is not: `settings get secure accessibility_enabled` returns `1` and
`enabled_accessibility_services` names TalkBack, so the ring is **TalkBack's own focus
rectangle**, drawn by the system.

**Second candidate ruled out in two passes, and both were plausible.** The first was the launch
ANR (Phase B Veteran). Both would have been defensible findings on the evidence *visible in the
screenshot*, and both were wrong. **What separated them from real findings was one command
each** — `logcat -b events`, and `settings get secure`. That is cheap enough that there is no
excuse for reporting either.

---

## Handoff

- **F-SCR-B01 is the only finding, and it is `AFTER`.** No cost argument is available on
  anything the Veteran raised in Phase B: `F-VET-B01`, `B02`, `B03` and `B04` are all afternoon
  fixes, none needs a founder, and one of them invalidates audit evidence. There is nothing to
  defer.
- To the Hotshot: **parity comparison through the screenshot harness is unsafe** until
  `F-VET-B01` is fixed. The iOS captures in Phase B came through `FauxShell`, which supplies its
  own callbacks — so any iOS-vs-Android difference observed through it may be the harness, not
  the app.
