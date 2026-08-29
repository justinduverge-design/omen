# Pre-Beta Audit Criteria v1

**Status:** proposal — founder ratification required before either audit is run as a gate.
**Written:** 2026-08-29, at founder request, ahead of the first beta invitations.
**Scope:** two separate passes. **Part A — Code.** **Part B — The apps as a user meets them.**

Run them in that order and on separate days. They fail differently: A is read against the
repo, B is read against a running app on a real device. An auditor doing both at once will
quietly demote B, because B is slower and less satisfying.

**Every criterion below is derived from a failure this repo has actually had.** Where a
criterion came from a specific incident, the incident is named. A criterion nobody can trace to
a real failure is a style opinion, and it does not belong in a gate.

---

## How a finding is recorded

Each finding carries:

| Field | Rule |
|---|---|
| **Claim** | One sentence. What is wrong. |
| **Evidence** | A file and line, a command and its output, or a screenshot. **Not** a description of what would happen. |
| **Severity** | `BETA-BLOCKING` / `WEEK-1-BLOCKING` / `AFTER` |
| **Class** | Which criterion below it failed |

**A finding with no evidence line is not a finding.** This is the single rule that matters
most: this repo's recorded history is full of confident conclusions that were never measured —
the "GitHub Actions billing hold" that never existed, the Yahoo 403 read from three digits with
the response body thrown away, and a scrubber that "matched" the exact string it was failing to
protect. Every one was a plausible claim asserted without a measurement.

---

# Part A — Code audit

## A1. Honest state, at the SCREEN level and not only the section level

**This is the criterion the 2026-08-29 session was opened by, and it is first for that reason.**

Command Center had three sections — Matchup Hero, League Pulse, Waiver Watch — each of which
was individually defensible. Every one rendered a true statement. Together they meant a fully
connected user on a healthy league was told there is no matchup, that waiver availability needs
confirming, and that standings are unavailable. **No test could catch it, because every section
behaved exactly as specified.**

Check, per screen:

- [ ] Assemble the screen's state for a **healthy, fully connected user**. Does every section
      have a reachable path to a populated state? A populated state constructed only in
      fixtures and the design gallery is decoration.
- [ ] For each section, name the input that would produce its populated case. If the answer is
      "none currently exists", that section is **not shipped**, regardless of how honest its
      empty copy is.
- [ ] Read the screen as a whole, out loud. Does the sum read as "working" or as "broken"?

## A2. No state substituted for another

`OmenStateSurface`'s own doc comment says "Never substitute one state for another." League
Pulse's terminal `.unavailable` was rendered with `kind: .loading`, drawing a spinner that
could never resolve. The founder read it as "takes forever to load"; nothing was loading.

- [ ] Every `.loading` surface has a path that resolves it. Grep each render site and follow it.
- [ ] No resting state renders a spinner, a progress bar, or a shimmer.
- [ ] `empty`, `loading`, `error`, `disconnected`, `stale`, `mock` each mean what the registry
      says. A section's state is derived from data that could actually distinguish them.

## A3. Data fetched and discarded

Three separate instances found in one session: standings fetched for the context strip with
rank/record/team-count dropped; `lastResultFromMatchups()` and `lastResultFromEspnSchedule()`
each resolving the opponent and both point totals and returning one `"W"`/`"L"` letter.

- [ ] For each provider call, list what the response carries against what the caller keeps.
- [ ] Where the screen shows an empty section that the discarded fields could have filled, that
      is a finding — a paid-for round trip whose answer was thrown away.

## A4. Fixtures must come from captured traffic

`test/yahoo.test.js` built `league[0]` as an array — the shape the parser expected, not the
shape Yahoo sends. The bug lived in the fixture, so the test asserted the defect and passed.
Then `realLoading` asserted `.empty` ledger and `.unavailable` pulse on a screen whose shell
request was still in flight — same shape, three weeks later.

- [ ] Every provider fixture traces to a captured real response, with a date.
- [ ] No fixture was written by reading the implementation.
- [ ] Ask of each state fixture: *has the system actually established this yet?* A loading
      fixture asserting a settled answer is this bug.

## A5. Tests with an expiry nobody marked

`testLeaguePlaceholderUsesTheApprovedCopy` pinned a placeholder sentence by value. Once the real
screen shipped, that assertion could only ever prove the screen had **not** shipped.

- [ ] Grep for tests that assert placeholder copy, "landing next", "coming soon", or the
      absence of a feature. Each must either assert the durable invariant instead, or carry an
      explicit deletion trigger.
- [ ] Grep for `assertEquals(<n>, …entries.size)`-style counts. These fail loudly when a real
      addition lands, which is fine — but the comment must say what the number means.

## A6. Contracts degrade, never blank

- [ ] An unrecognized enum value degrades to the honest non-answer, never to a confident one.
      `verdict_state` degrading to a *verdict* would be the client issuing a call the server
      never made.
- [ ] One unknown field or section does not fail a whole decode.
- [ ] Sections that the server reports independently are rendered independently.
- [ ] Contract additions are additive. Existing consumers keep reading what they read.

## A7. Absence is never inferred, and never invented

- [ ] No client computes a value the server owns (verdict, rank, playoff odds).
- [ ] `null` from the server renders as absent — never as `0`, `0.0`, `—` where a number would
      be read as real, or a plausible sentence.
- [ ] Every unavailable state names **which** thing is unavailable when the contract tells it.
- [ ] Nothing user-facing says "temporarily" unless something actually retries.

## A8. Secrets, in the emitted bytes

The shared scrubber has been found holed in three consecutive sessions, **every time by
provoking a real failure and searching the emitted output, and never by review.** `authorization`
was missing outright; once added, `Bearer <token>` still survived because the key/value rule
stopped at the first space.

- [ ] Provoke a real failure on each provider path. Search the actual emitted bytes — logs,
      error payloads, the error-tracking store — for the exact canary credential.
- [ ] "We have a scrubber" is a claim needing evidence, not a fact.
- [ ] No ESPN cookie, SWID, or Yahoo token value in any artifact, screenshot, or fixture.

## A9. Cross-platform parity is behavioural, not structural

- [ ] The same payload produces the same user-visible answer on iOS and Android. Diff the
      mapping rules, not the file lists.
- [ ] User-facing copy is byte-identical where both platforms say the same thing. A copy split
      is a defect, not a platform difference.
- [ ] Both platforms' test suites cover the same rules. A rule tested on one platform only is
      a rule that will drift.

## A10. Test-suite honesty

- [ ] Record counts and the exact command. iOS: `xcodebuild test -project … -scheme OmenIOS
      -destination 'platform=iOS Simulator,name=iPhone 16'` with `xcodebuild -version`.
      **Do not** add `CODE_SIGNING_ALLOWED=NO`; four red Keychain tests means the wrong command.
- [ ] Every `XCTExpectFailure` / `@Ignore` / skip is listed with its reason and its owner.
      **Known open:** Command Center contrast and app-wide Dynamic Type, both pre-existing.
- [ ] Flaky tests are named, not re-run until green. **Known open:**
      `ContextualHelpAccessibilityUITests.testCommandCenterHelpAffordanceIsLabeledAndOpens
      ItsExplanation` passes in the full suite and fails in isolation or on a dirty simulator.
- [ ] Green CI is necessary, not sufficient — PR #206 passed 481/481 and would still have
      crash-looped production.

## A11. Documentation that asserts a fact

- [ ] Sprint/inbox blockers reflect reality. **A pre-authorized gate whose condition is met is
      an open gate** — `M5` slice F sat "blocked" for five days after its condition was met.
- [ ] When a fact of record is superseded, every place asserting the old fact is amended — not
      only the file where the correction was discovered. This has recurred at least three times.
- [ ] No handoff claims deployment without `done/release-done.md` gate 4 evidence. Merged is
      not released.

---

# Part B — App audit

Run on **real devices**, both platforms, signed in with a **real connected league**. Not the
simulator, not demo mode, not fixtures. A screenshot is the evidence.

**Sequencing:** `M12-BrandFonts` lands before this pass. Both apps currently render in system
fallbacks; auditing typography and Dynamic Type on the wrong typefaces means auditing twice.

## B1. The first ninety seconds

The beta tester's actual path. Walk it and screenshot every step.

- [ ] Install → open → sign in → connect a league → reach a populated Command Center.
- [ ] Count the steps. Count the dead ends. Count the moments where nothing says what is
      happening.
- [ ] At each screen: could a reasonable person conclude the app is broken? Write down where.

## B2. Every screen with a real league

For Command Center, Omen, Trade, League, Connect, Account, Help:

- [ ] Screenshot with a healthy connected league. **No section may be empty, spinning, or
      hedging.** (This is A1, verified against reality rather than against the code.)
- [ ] Screenshot signed out, mid-connect, and with a deliberately broken connection.
- [ ] Nothing spins for more than a few seconds without resolving or explaining itself.

## B3. Honest states, on a device

- [ ] Kill the network mid-load on each screen. Every section reaches a resting state.
- [ ] Break one provider and leave another healthy. The healthy half still renders.
- [ ] Nothing labelled mock or demo appears anywhere in a signed-in real-account session.

## B4. Timing, measured

`O4`'s lesson: a performance number means nothing without a stated admission-control policy.
Derive concurrency from the rate limits rather than choosing it.

- [ ] Time to first meaningful content per screen, on cellular, on a mid-tier device.
- [ ] Omen of the Week specifically. Its route runs the live provider build, DvP enrichment,
      LLM enrichment, and persistence **in sequence**, with DvP and LLM both commented
      "enhancement only" while sitting on the critical path. Measure before deciding.
- [ ] Any wait over ~2s says what it is waiting for.

## B5. Accessibility

- [ ] Largest Dynamic Type / largest font scale on every screen. Nothing clipped, overlapped,
      or unreachable.
- [ ] VoiceOver and TalkBack through the primary path. Every control has a real label; no
      icon-only control announces as "button".
- [ ] Contrast audit passes. **Known pre-existing failures on Command Center must be closed or
      explicitly accepted in writing — not carried silently.**
- [ ] Reduced motion honoured.

## B6. Copy and claims

- [ ] No "coming soon", no month, no date anywhere user-facing.
- [ ] **Draft Assistant:** at most one factual "2027 fantasy draft" mention on the marketing
      site and one clearly-labelled in-app "not in this version" note. **Never** in store
      metadata, onboarding, navigation, legal copy, or the advertised tool list.
- [ ] No Stripe, subscription, paywall, or price anywhere. Omen is free indefinitely.
- [ ] No internal sprint identifiers in user-facing text.
- [ ] Every capability the UI implies is backed by a shipped route, or labelled as not yet
      existing.

## B7. Provider truth — the release gate

**This is the one most likely to be skipped, and it is the one that decides whether the beta is
real.** `m1-league-screen-data-plan-v1.md` §2.5 gate 5: every provider capability needs live
proof before it is claimed on a shipped screen.

- [ ] Sleeper, ESPN, and Yahoo each exercised with a **real** connected account.
- [ ] The ⚠️ rows in that plan's §1 — ESPN projection shape, deadline field for both providers
      — are measured, not inferred.
- [ ] **When a provider comes back after an outage, re-verify the parse layer, not just the
      connection.** The Yahoo binding was broken the entire 403 era and nobody could see it,
      because a wrong parser is indistinguishable from an empty provider: nothing logged,
      nothing alerted, no error event.
- [ ] `connected` ≠ `usable` (facts-of-record #12). Prove a bound league, not a connection row.

## B8. Errors reach somewhere

- [ ] Force a native crash on each platform. It appears in the error backend within 60s.
      (This is the phase-3 gate; it is listed here because B is where it is actually testable.)
- [ ] A provoked provider failure produces an event with no credential in the payload.
- [ ] "The pipe is open" and "our error paths feed it" are two different claims. Prove the
      second — that conflation is exactly what created `O8` and issue #354.

---

## What this document does not do

It does not decide severity thresholds or what blocks the beta. That is a founder call, and it
should be made when the findings exist rather than in advance — a threshold set before the
findings is a threshold set to be met.
