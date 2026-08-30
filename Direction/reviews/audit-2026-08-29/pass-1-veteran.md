# Audit 2026-08-29 — Pass 1, Veteran

| | |
|---|---|
| **Lens** | The Veteran |
| **Question** | Does it hold? |
| **Criteria owned** | A1, A2, A4, A5, A7, A8, A10 · B2, B3, B5, B6, B7, B8 |
| **Commit** | `952b482` |
| **Date** | 2026-08-29 |
| **Method** | Systematic sweep. Every finding re-derived from evidence; recall not admitted. |

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | **1** |
| WEEK-1-BLOCKING | 2 |
| AFTER | 1 |
| Abort classes fired | **1** (class 1) |
| Criteria passed | 3 |
| Criteria not runnable | 7 |

---

## Findings

### F-VET-01 — A missing confidence score is rendered as zero confidence

- **Claim:** When the server omits a confidence score, both apps display "Confidence 0".
- **Evidence:** `OmenDecision.swift:165` and `OmenDecision.kt:178` both read
  `conf?.score ?? 0`. `OmenDecisionBriefPayload.confidence` is a non-optional `Int`
  (`OmenDecisionBrief.swift:24`) and is rendered at line 201 by
  `OmenConfidenceBar(score:label:)`, which prints `"\(clamped)"` — the literal string `0`.
  The server treats absence as real and expected: `src/routes/omen.js:261` persists
  `Number.isFinite(Number(recommendation.confidence?.score)) ? … : null`, and
  `buildOmenLlmPayload` (line 315) defaults `confidence` to `{}`.
- **Failure scenario:** A live Omen run whose engine omits `confidence.score` — a path the
  backend explicitly guards for — shows a beta tester a recommendation labelled zero
  confidence. The user cannot distinguish *"Omen is not confident"* from *"Omen did not say."*
- **Criterion:** A7 — absence is never inferred, and never invented.
- **Severity:** **BETA-BLOCKING**
- **Reversibility:** afternoon
- **Abort class:** **1 — asserts something Omen has not verified. FIRED.**

### F-VET-02 — Five of the eight Waiver Watch states cannot be reached

- **Claim:** `OmenWaiverWatchState` has eight cases; the only production producer can return
  three. `urgent`, `calm`, `pending`, `processed`, and `noCredibleMove` are unreachable.
- **Evidence:** Sole producer is `DashboardSummary.waiverWatch(for:season:)`
  (`DashboardSummary.swift:161-179`). Its complete return set is `.offSeason`,
  `.availabilityUnknown`, `.notConnected`. Every other case appears only in
  `OmenCommandCenterFixtures`, `ScreenshotScenarios`, and the design gallery. Android mirror
  `waiverWatchFor` is identical.
- **Failure scenario:** A connected user in a live week sees "availability needs confirmation"
  in every circumstance — there is no roster, no waiver deadline, and no opportunity that can
  change it. The section is decoration on a working league.
- **Criterion:** A1 — honest state at the screen level. *"A populated state constructed only in
  fixtures and the design gallery is decoration."*
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon (to hide) · contract (to finish)
- **Abort class:** none — the copy is honest absence, not an unverified assertion.

### F-VET-03 — The League activity panel cannot populate, so the Alternate state is the primary experience

- **Claim:** No server path can put anything in `activity.items`, so the shipped League screen
  renders the ratified contract's *Alternate* state for every user.
- **Evidence:** `emptyActivity()` (`src/routes/league.js:299-306`) hardcodes `items: []`, and it
  is the only value `overviewEnvelope` ever assigns to `activity`. `M1-Screen-League`'s
  2026-08-22 rejection reads: *"an empty activity panel may exist only as a genuine empty/error
  state, not as the primary approved experience."* The 2026-08-24 revision satisfied that by
  making Primary (v2) populated and demoting the empty panel to Alternate (v2).
- **Failure scenario:** Every beta tester on every league sees the state the founder explicitly
  refused to approve as primary.
- **Criterion:** A1 — honest state at the screen level.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** contract
- **Abort class:** none — the copy names the missing family truthfully.

### F-VET-04 — Provider fixtures written since 2026-08-28 are not from captured traffic

- **Claim:** The Sleeper matchup fixture shape was taken from the implementation, not from a
  captured response — the exact failure recorded five days earlier.
- **Evidence:** `test/leagueOverviewRoute.test.js` builds rows as
  `{ roster_id, matchup_id, points }`, a shape read off `lastResultFromMatchups()`. By contrast
  `test/yahoo.test.js:19` and `:155` now cite provenance in-file (*"Captured from real Yahoo
  traffic on 2026-08-28"*, `/league/{key}` live from `470.l.1255365`) — the lesson was applied
  where it was learned and not carried forward.
- **Failure scenario:** If Sleeper's real matchup rows differ in shape, every test passes and
  the parser is wrong in production — indistinguishable from an empty provider, because these
  paths degrade silently by design.
- **Criterion:** A4 — fixtures must come from captured traffic.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon (once real traffic is captured — this is `M11A`)
- **Abort class:** none directly; it is the reason class 2 exists.

---

## Criteria passed

**A2 — no state substituted for another. PASS, clean.** All 20 non-preview `.loading` render
sites on both platforms were traced to the state that drives them. Every one resolves:

| Surface | Resolves via |
|---|---|
| App shell session restore | `SessionManager.restore()` sets a terminal state on every path, synchronously (`SessionManager.swift:31-37`) |
| Command Center — Ledger | `loadLedger()` → entries / empty / error |
| Command Center — League Pulse | `loadContext()` → available / unavailable |
| Omen decision brief | `reload()` → loaded / failed |
| League screen | `reload()` → loaded / failed |
| Trade screen | `compare()` → loaded / failed |
| League switcher | `load()` → loaded / failed (`LeagueSwitcherViewModel.swift:32-39`) |
| Connect flow | every busy state exits to connected / retryableError / needsReauth / canceled, plus a Cancel affordance |

**A5 — tests with an unmarked expiry. PASS.** Swept both platforms for assertions pinning
placeholder copy or feature absence. None remain.

**A10 — test-suite honesty. PASS, two documented exceptions.** Exactly two `XCTExpectFailure` in
the entire suite, each naming reason and scope (`ContextualHelpAccessibilityUITests:153`;
`ForcedUpdateAccessibilityUITests:69`). No `XCTSkip`, no `@Ignore`, no disabled tests on either
platform or in the backend suite.

---

## Criteria not runnable in this pass

**A8 — secrets in the emitted bytes.** The criterion requires provoking a real failure and
searching emitted output for a canary; it states outright that review is insufficient. The
scrubber has been found holed three times, every time by provocation and never by reading.
**Not marked pass.**

**B2, B3, B5, B6, B7, B8 — not run. This is Phase B, and it is a separate phase on a separate
day**, per `pre-beta-audit-criteria-v1.md`: *"An auditor doing both at once will quietly demote
B, because B is slower and less satisfying."*

**Correction to how this line first read.** It said "founder-gated hardware", which was only
partly true and understated what is available. The app ships **24 screenshot scenarios** driven
by a launch argument (`ScreenshotScenarios.swift`), **13 simulators** are available on this
machine, and a built Android debug APK exists. B3, B5, B6 and the fixture-backed half of B2 are
runnable without a founder and without touching a credential. **Only the real-account work is
genuinely gated** — B7 entirely, B4's real timing, and the real-league halves of B1 and B2.
Recorded so Phase B is not scheduled around a blocker that does not exist.

---

## Handoff

To the Scrappy pass, per `audit-grading-system-v1.md`: he decides *which* and *when*, and may
not add to this list.

- **F-VET-01 fires a ratified abort class.** By the firing rule this is binary — not his to
  defer. Only the founder may override, and the override is recorded with a name on it.
- **F-VET-03 and F-VET-04 reduce to the same underlying work:** measuring what providers
  actually return. That is `M11A`, now due.
- **F-VET-02** is register item #2 and already carries a proposed disposition.
