# Native finish-and-polish directive

**Status:** FOUNDER-DIRECTED — 2026-09-21  
**Applies to:** the next Omen native visual session and every polish batch that follows it  
**Starting point:** the 32-artboard J1–J6 and chrome implementation merged in PR #459 (`748229bd`)

## The decision

The next session is **not another screen-building marathon**. It prepares a finish-and-polish
system in which the artboards carry the product decisions and SwiftUI/Compose are mostly a
constrained translation of an approved composition.

The existing native set is compositionally built, but that does not make every artboard finally
approved or every screen production-reachable. Implementation exposed avoidable ambiguity in
geometry, typography, degraded states, interaction, data truth and platform parity. Do not respond
by polishing code in isolation. Review the canvas, both runtimes and the screen contract together;
record the better decision in the artboard first; then implement only the approved delta.

The founder wants both outcomes:

1. Polish the artboards until the intended product is excellent in detail.
2. Finish the native product, including efficient tests, reliable captures and frequent
   hands-on iPhone checkpoints.

## Governing loop

For each screen or coherent journey slice:

1. Open the current artboard, current iOS capture and current Android capture side by side.
2. Critique hierarchy, density, typography, geometry, writing, interaction and every honest
   nominal/degraded/unavailable state.
3. Assign one verdict: **approve**, **canvas wins**, **runtime wins**, **recompose**, or
   **blocked by data**.
4. Put the approved result into the artboard and relevant screen contract before broad native
   implementation. If runtime work reveals a genuinely better idea, stop and return the idea to
   the artboard; do not let code become an undocumented design authority.
5. Implement the approved delta on both platforms.
6. Run the smallest honest verification lane, measure runtime geometry, and inspect fresh images.
7. Commit and push a coherent GitHub checkpoint.
8. Install useful checkpoints on the founder's connected iPhone, state the exact commit/build and
   navigation path, and ask for judgment of a small named set of details.
9. Feed device feedback back into the artboard first, then make the next code delta.

The artboard wins by default. A better runtime idea may win only when the canvas is redrawn to the
merged result in the same change. Never "fix" drift only in code and never redraw the canvas after
the fact merely to document an accidental implementation.

## First session: prepare the system and prove it on Command Center

The first session delivers the operating system for the later polish batches. It must not fan out
across all 32 artboards before the process works on one representative screen.

Use **Command Center** as the pilot because it exercises the shared header, help/account controls,
league context, switcher, recommendation hierarchy, cards, bottom navigation, fit behavior,
contrast and both platform shells.

The session is complete only when it has:

- produced a founder-reviewable Command Center critique and explicit artboard verdict;
- updated the artboard and contract with exact approved composition, not vague taste notes;
- implemented the delta on iOS and Android;
- measured both rendered layouts rather than inferring parity from constants or contact-sheet size;
- run focused interaction/accessibility checks;
- captured and personally inspected fresh full-resolution frames;
- pushed a clean GitHub checkpoint; and
- installed that exact checkpoint on the founder's iPhone when the device/signing path is
  available, with a concise in-hand review script.

If this pilot is still slow, ambiguous or produces substantial correction after the build, improve
the process before multiplying it across the remaining screens.

## What every approved artboard must specify

The visual record must answer the implementation questions that previously invited improvisation:

- viewport and safe-area assumptions;
- header anatomy and control order;
- horizontal gutters, section gaps and card padding;
- card bounds and intended flexible/fixed dimensions;
- type role, family, resolved variable-font weight, line height and tracking;
- intended line wrapping and maximum line count for realistic long content;
- declared fit versus intentional scroll behavior;
- relationship to the permanent tab shell and overlays;
- visual size versus independent 44pt iOS / 48dp Android touch target;
- every control's destination or explicit noninteractive meaning;
- loading, empty, failed, degraded, unavailable and not-requested treatment;
- live/mock/unavailable content and the contract field that supports each claim;
- accessibility label when it differs from visible copy;
- intentional platform differences; and
- production state/route required to reach the composition honestly.

Record per artboard: composition status, data-truth status, geometry status, interaction status,
iOS verdict, Android verdict, founder verdict, and the latest evidence path/commit/device/date.

## Native verification ladder

Measure current costs before changing the suite. Record build graph, simulator boot, install,
per-test app launch, test execution, result finalization, capture and contact-sheet time. Optimise
the measured bottleneck rather than guessing.

### Lane A — immediate edit loop

Target: seconds. Run affected-module compilation, focused primitive/model tests, static token and
contract checks, canvas CSS parity, scenario registration validation and production-reference grep.

### Lane B — one-screen verification

Target: roughly one to three minutes. Run one scenario, one selected interaction test, the screen's
geometry probe, touch-target checks, one fresh build/install and one inspected capture.

### Lane C — journey verification

Target: several minutes. Run the journey's nominal/degraded scenarios and interaction suite,
relevant unit classes, both-platform captures, reachability check and inspected ordered sheet. This
is the normal GitHub and founder-device checkpoint.

### Lane D — integration/merge gate

Run the complete iOS unit/UI suites, Android app unit suite and assemble, repository gates, token
parity/contrast, canvas parity, reachability audit and final provenance checks only for a finished
batch. A long full suite is a release gate, not the first way to discover whether one button moved.

Create or refine a **small checked-in runner**, not a giant parallel harness. It must use
`set -o pipefail`, preserve the producer's status, name the destination, record commit/source/test
bundle/installed-app timestamps, detect stale bundles and APKs, report discovered test counts and
named failures, and distinguish build, build-for-testing, test-without-building and executed tests.
Provide only targeted cleanup for stale runner artifacts; broad DerivedData deletion is not the
default.

Avoid Gradle and simulator-heavy iOS UI tests at the same time. That contention already produced a
false iOS launch timeout. Do not use `test-without-building` without proving bundle provenance.

## Simulator, emulator and capture roles

Maintain separate fast-loop and clean-verification targets for each platform:

- a fixed, normally booted iOS simulator for focused work;
- a controlled fresh-install iOS simulator for evidence;
- a fixed accelerated Android emulator for focused work; and
- a cold-boot/known-snapshot Android emulator for final capture.

Every capture records device identifier, logical viewport, physical pixel dimensions, density,
OS, appearance, package/app version, installed artifact timestamp, scenario and commit. Preserve
native aspect ratios in contact sheets. A successful command or manifest is not visual evidence:
open every PNG at full size, confirm timestamp and byte size, and inspect it one frame at a time.

## Founder iPhone loop

Physical-device review is part of normal polish, not a late release ceremony.

For a coherent checkpoint, use the established signing path to build and install the exact commit
on the founder's connected iPhone when available. Report:

- branch, commit and build number;
- whether GitHub contains that commit;
- which screens changed;
- exact navigation path;
- two to five details to judge in hand;
- known unfinished states; and
- whether the artboard already records the result.

Use a direct development install for active pairing. Use TestFlight only when explicitly authorised
and when persistence, remote access or another tester justifies distribution. Do not upload merely
because a local checkpoint exists.

## GitHub checkpoint discipline

Push after a verified shared primitive, a complete screen state ready for founder review, a complete
journey, a physical-device defect fix, or a material design decision. Do not manufacture activity
with unbuildable microcommits. Every checkpoint must be describable in one sentence and leave the
branch buildable.

## Planned finishing sequence after the pilot

Subject to what the Command Center pilot teaches:

1. Shared shell, Command Center, Omen and Account.
2. League, Waiver and Ledger.
3. Trade, onboarding, connection and Start/Sit.
4. Final real-navigation, accessibility, physical-device and beta-readiness acceptance.

These are planning groups, not permission to parallelise shared CSS, design-system primitives,
artboard redraws or final inspection. Collapse groups only when the pilot proves the loop stays
fast and precise.

## Truth fences carried forward

- The current set has 32 artboards and all have native compositions, but scenario availability is
  not production reachability.
- The production-reference audit still carries 11 platform findings. Close them only through real
  state, models and routes; never fabricate data or add inert navigation to make a checker green.
- E017 carries contextual help then account avatar, except Account has no recursive account button.
- D11 is waived only on OmenCall.
- ESPN consent names `SWID` and `espn_s2` but values never appear in UI, captures, payloads or logs.
- Never call ESPN approved or sanctioned.
- Historical receipts preserve issue-time truth and never borrow missing facts from the current
  brief.
- Keep skips and expected failures visible, named and owned. Improving test efficiency must not
  weaken assertions or hide unfinished accessibility work.

## Definition of success

The next session succeeds when it makes later implementation deliberately boring: the canvas
contains the approved idea, tests select the smallest trustworthy lane, captures have unquestioned
provenance, the founder receives useful GitHub and iPhone checkpoints early, and code changes express
design decisions instead of discovering them repeatedly.
