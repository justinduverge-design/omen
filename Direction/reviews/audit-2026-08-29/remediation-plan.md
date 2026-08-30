# Remediation plan — beta blockers + Try Demo removal

| | |
|---|---|
| **Status** | **PROPOSAL.** No code changed. One scope decision and one risk check are founder-owned. |
| **Date** | 2026-08-29 |
| **Covers** | `F-VET-01`, `F-VET-B01` (both BETA-BLOCKING) and founder-directed removal of Try Demo |
| **Home** | Kept with the audit results, per the single-results-home rule |

---

## Recommended order: W1 → W2 → W3

Not by size. By what unblocks verification of what.

| | Workstream | Why here |
|---|---|---|
| **W1** | `F-VET-01` — confidence renders as zero | Independent of everything else, fires a ratified abort class, and is the smallest change in the plan. Nothing should sit in front of it. |
| **W2** | `F-VET-B01` — screenshot harness drift | **Must precede W3.** Until the harness matches the app you cannot *see* whether Try Demo is gone, and every screenshot taken to prove it would be evidence about a fiction. |
| **W3** | Remove Try Demo | Largest, and the only one needing a scope decision. Verifiable only after W2. |

---

# W1 — `F-VET-01`: a missing confidence score renders as "Confidence 0"

**Severity:** BETA-BLOCKING · **fires abort class 1** · **Reversibility:** afternoon

### The change

Make confidence optional end to end and render absence as absence — the pattern already used
for `cutLine` and `activity` on League Pulse, so this introduces no new idea.

| File | Change |
|---|---|
| `OmenDecisionBrief.swift` | `let confidence: Int` → `Int?` |
| `OmenDecision.swift:165` | drop `?? 0`; pass `conf?.score` through |
| `OmenDecisionBrief.kt` / `OmenDecision.kt:178` | same, Kotlin side |
| Both brief views | render the confidence bar **only** when a score exists; omit the row otherwise |

**Do not** substitute a placeholder — no "—", no "unknown", no greyed bar at 0. The row is
absent or it is real. A greyed bar still occupies the position where a number belongs and will
be read as a number.

### Verification

- New test per platform: an envelope with no `confidence.score` produces a payload whose
  confidence is nil **and** a brief that renders no confidence element.
- Existing suites stay green: iOS 301, Android 78, backend 901.
- **Backend is already correct** (`omen.js:261` persists `null` behind a `Number.isFinite`
  guard). No server change. Confirm no route starts emitting `0` to compensate.

### Evidence to record

Test names and counts; a screenshot of the brief with confidence absent, once W2 makes
screenshots trustworthy.

---

# W2 — `F-VET-B01`: the screenshot harness is a drifted duplicate of the app shell

**Severity:** BETA-BLOCKING · **Reversibility:** afternoon

This is the highest-leverage item in the plan. It does not fix a user-visible bug; **it restores
the ability to verify anything else visually**, including W3.

### The change — pick one shape, and the second is the recommendation

**Option A — patch the duplicate.** Update `FauxShell` so Trade and League render the real
screens. *Rejected:* it repairs this drift and guarantees the next one. The duplicate is the
defect; a synchronised duplicate is still a duplicate.

**Option B — delete the duplicate (recommended).** `FauxShell` exists for one stated reason:
*"production `CommandCenterView` requires a real SessionManager; screenshot mode explicitly
avoids constructing one."* That is an injection problem, not a rendering problem. Make
`CommandCenterView` accept its dependencies (an already-resolved state plus no-op callbacks) so
screenshot mode can mount **the real shell**. Then delete `FauxShell` and Android's
`FauxBottomNav`.

**A guard, either way — this is the part that must not be skipped.** `DraftClaimAbsenceTests`
failed to catch this because it reads only the two files someone had edited. Replace the
file-scoped assertion with a **repo-wide** one: no shipped source outside a test target may
contain "landing next", "coming soon", or any tab-placeholder string. **A grep across the target
is the assertion; a grep across two files is not.**

### Verification

- Launch each scenario, tap all four tabs, confirm Trade and League render the real screens.
- The new repo-wide assertion fails on a deliberately reintroduced placeholder.
- Android: same, on the emulator.

### Follow-on it unblocks

`F-VET-B03` (no scenario for Trade or League) becomes cheap once the real shell is mounted, and
should land in the same change. `F-HOT-B02` — parity being unassessable — is resolved by W2 with
no separate work.

---

# W3 — Remove Try Demo

**Founder-directed.** Two things need deciding before any code moves.

## Decision 1 — scope. Removing the button is not removing demo mode.

| | Sites |
|---|---|
| The **button** | 2 — `WelcomeView.swift:24`, `OmenAndroidApp.kt:401` |
| Copy that **names** it | 2 — the Waiver Watch empty state, both platforms |
| `.demo` **view states** | 8 — four per platform, across Command Center, Omen, League, Trade |
| `demoUserID` / `DEMO_USER_ID` | 18 references |
| Demo **fixtures** | ~25 references |
| **Tests** touching demo | 12 files |

**Removing only the button manufactures the exact defect this audit just filed.** All eight
`.demo` view states become unreachable in production — which is `F-VET-02`'s finding
(*"a populated state constructed only in fixtures is decoration"*) reproduced deliberately, four
times per platform, on the day it was reported.

**Recommended scope — full removal, with one carve-out:**

1. Delete the button on both platforms.
2. Delete the `.demo` / `Demo` view-state cases and every branch that handles them.
3. Delete `demoUserID` / `DEMO_USER_ID` and the session path that mints a demo identity.
4. **Keep the demo *fixtures*.** They are legitimate screenshot and test data. The harness
   already supports supplying a state directly — `ScreenshotScenarioHost.commandCenter(_ state:)`
   does exactly this — so scenarios can render demo data **without** a `.demo` view state
   existing in the app's state machine. Fixtures become test inputs, not a product mode.

That carve-out is what keeps W3 from deleting the `command-center.demo-connected` and `omen.demo`
scenarios along with the mode.

## Decision 2 — the risk that must be checked first

**Does App Store review need it?** Apple Review Guideline 2.1 requires a reviewer be able to
fully evaluate an app. Omen shows almost nothing without a connected Sleeper, ESPN, or Yahoo
league, and **demo mode is the standard answer to that requirement.** Nothing in
`current_sprint.md` or `release_readiness.md` records a demo account or review-notes strategy —
searched, found nothing, which is not the same as confirming none is needed.

**Check before W3 starts, not after a rejection.** If review does depend on it, the options are
a reviewer-only credential on a seeded league, or keeping demo behind a build flag absent from
Release. Both are cheap *before* the removal and expensive after.

## The dead-copy trap

The Waiver Watch empty state on both platforms reads: *"…or use Try Demo to explore a labeled
example."* If the button goes and this copy stays, the app **instructs the user to press
something that does not exist** — an unverified assertion about the product's own affordances,
and a candidate for **abort class 1**. It must be rewritten in the same change, not a follow-up.

## What the record should also carry

The Scrappy lens found the opposite conclusion four hours ago. `F-SCR-B01` reads: demo *"lets a
tester see real value with zero setup, already built and honestly labelled"* — the cheapest
onboarding asset in the product. **The founder has directed removal anyway, and that is his
call.** It is recorded here as a disagreement rather than quietly dropped, because a plan that
silently reverses a finding from the same day is a plan that loses the reason it existed.

**One genuine benefit, in the other direction:** phase gate 4 requires *"zero unlabeled mock
output."* Removing demo mode removes the only mock surface in the product and makes that gate
trivially satisfiable rather than argued.

### Verification

- Repo-wide grep: no "Try Demo" outside tests and fixture names.
- No unreachable `.demo` state remains — re-run the Phase A A1 sweep (enumerate each state
  enum's production producer) and confirm every case is reachable.
- Both suites green; screenshot scenarios still render, now via directly-supplied state.
- Fresh install on both platforms: welcome screen offers exactly one action.

---

## What this plan does not do

It does not schedule the other fourteen findings, and it does not touch `B7` provider truth —
the liability the founder deferred on 2026-08-29, still due before invitations.

**It also does not resolve `F-VET-01`'s abort class by itself.** Class 1 fires on any unverified
assertion; W1 clears the one instance the audit found. The class stays armed.
