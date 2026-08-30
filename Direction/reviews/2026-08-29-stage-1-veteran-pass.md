# Stage 1 — Veteran pass (Part A, code), 2026-08-29

**Lens:** the Veteran. *Does it hold?*
**Scope:** Part A criteria the Veteran owns — A1, A2, A4, A5, A7, A8, A10. Part B is device work
and is not in this pass.
**Run against:** `main` at `4570300`.
**Abort classes:** ratified 2026-08-29. One fired.

---

## Verdict

**4 findings. One fires an abort class.** Three criteria pass clean, and one is only partly
runnable without a live failure.

| ID | Finding | Class | Severity |
|---|---|---|---|
| **V1** | Missing confidence renders as **"0"** on both platforms | A7 | **BETA-BLOCKING — fires abort class 1** |
| **V2** | League activity panel can never populate; shipped screen renders the contract's *Alternate* as its Primary | A1 | WEEK-1-BLOCKING |
| **V3** | Waiver Watch unreachable for any ready league | A1 | known — register #2, MEL |
| **V4** | New provider fixtures were written from the contract, not captured from traffic | A4 | WEEK-1-BLOCKING |

---

## V1 — A missing confidence score is displayed as zero confidence

**BETA-BLOCKING. Fires abort class 1: *any user-facing statement that asserts something Omen has
not verified.***

`OmenDecision.swift:165` and `OmenDecision.kt:178`:

```swift
confidence: conf?.score ?? 0
```

`OmenDecisionBriefPayload.confidence` is a non-optional `Int`, and `OmenConfidenceBar` renders
it as the literal string `"0"` beside an empty bar. **So when the server does not supply a
confidence score, the user is told Omen's confidence is zero.**

**The server explicitly models absence, and the client discards that care.** `src/routes/omen.js:261`
guards persistence with `Number.isFinite(Number(recommendation.confidence?.score)) ? … : null`,
and `buildOmenLlmPayload` defaults `confidence` to `{}` — the backend treats "no score" as a
real, expected state and stores `null`. Both clients turn that `null` into `0`.

**Why this is the most serious finding in the pass.** It is on **Omen of the Week**, which
`Direction/context.md` names the main event, and the product promise it breaks is explicitly
listed there: *"how confident Omen is."* "Confidence 0" is not a degraded answer — it is a
**different and worse answer than the truth**, and a user cannot distinguish "Omen is not
confident" from "Omen did not say."

Failure scenario: any live Omen run whose engine omits `confidence.score` — a path the server
already anticipates — shows a beta tester a zero-confidence recommendation Omen never made.

**Fix shape:** make `confidence` optional through the payload and render absence as absence, the
way `cutLine` and `activity` were handled on League Pulse. Not a copy change.

## V2 — The League activity panel cannot populate, so the shipped screen is the Alternate state

**WEEK-1-BLOCKING.** Honest, so it does **not** fire class 1 — the copy names the missing family
truthfully. What it breaks is the ratified contract.

`M1-Screen-League`'s 2026-08-22 rejection was explicit: *"an empty activity panel may exist only
as a genuine empty/error state, not as the primary approved experience."* The 2026-08-24
revision satisfied that by making Primary (v2) carry a **populated** Around the League, with the
empty panel demoted to Alternate (v2).

**What shipped on 2026-08-29 renders the Alternate as the primary experience for every user**,
because `league-overview.v1` derives no activity signals in v1 and `activity.items` is always
empty.

**And the data plan cannot be followed as written.** Its own two sections contradict each other:

| Source | Claim |
|---|---|
| §4 step 2 | "Standings-derived activity signals — **none** — derived from a payload that already ships" |
| §3, all three v1 signals | require *"playoff team count known"* or *"deadline field verified for that provider"* |

**No shipped payload carries either.** No adapter reads playoff settings — which is why
`playoffPicture()` hardcodes `settings_known: false`. So step 2, the step sequenced as needing
no provider work, **cannot ship without provider work.** The sequencing is wrong, not merely
unfinished.

**Cheapest honest path:** `sleeperOverview()` already fetches the league object for its name and
season. If that object carries playoff-team-count, the cost is parsing rather than fetching —
**but that field must be measured, not assumed.** Assuming a provider field shape from
surrounding usage is precisely what produced the ⚠️ rows and the Yahoo parser bug. This belongs
to `M11A`.

## V3 — Waiver Watch is unreachable for any ready league

Already in the register as item #2, classified MEL with the condition *hide the section for
beta*. **Re-raised here only to confirm the Veteran independently reaches the same verdict he
did before the register existed:** a section that cannot report a working league is a lie by
omission, and hiding it is the honest move until the transactions integration is real.

No new evidence. No change requested.

## V4 — The new provider fixtures were written from the contract, not captured from traffic

**WEEK-1-BLOCKING**, and it is a finding against this session's own work.

`test/leagueOverviewRoute.test.js` builds Sleeper matchup rows as
`{ roster_id, matchup_id, points }` — a shape taken from reading `lastResultFromMatchups()`,
**not** from a captured Sleeper response. `LeagueOverviewTests.swift` and `LeagueOverviewTest.kt`
do the same for `league-overview.v1`.

**This is the exact failure mode recorded on 2026-08-28**, five days ago: *"a fixture written
from the implementation tests that the implementation is itself."* The Yahoo parsers passed
their unit tests for the entire outage because the fixture encoded the bug.

**Mitigating, and stated so the finding is not overweighted:** the `league-overview.v1` fixtures
are written from the *contract* rather than from the implementation, which is a weaker version
of the same problem — the contract is at least an independent artifact. The Sleeper matchup
shape is the genuinely unverified part, and the ESPN half is mocked at the adapter boundary and
therefore asserts nothing about ESPN's real payload.

**This is `M11A`'s job and it is now due**, per the founder's 2026-08-29 dating of the audit.

---

## Criteria that pass

**A2 — no state substituted for another: PASS, clean.** All 20 non-preview `.loading` render
sites across both platforms were traced to the state that drives them, and **every one
resolves**:

| Surface | Resolves via |
|---|---|
| App shell session restore | `SessionManager.restore()` sets `.signedOut` / `.needsReauth` / `.signedIn` on every path, synchronously |
| Command Center — Ledger | `loadLedger()` → entries / empty / error |
| Command Center — League Pulse | `loadContext()` → available / unavailable (repaired this session) |
| Omen decision brief | `reload()` → loaded / failed |
| League screen | `reload()` → loaded / failed |
| Trade screen | `compare()` → loaded / failed |
| League switcher sheet | `load()` → loaded / failed |
| Connect flow | every busy state exits to `connected` / `retryableError` / `needsReauth` / `canceled`, and carries a Cancel affordance |

The defect this criterion was written for — a resting state wearing a spinner — does not recur
anywhere else in either app.

**A5 — tests with an unmarked expiry: PASS**, after this session's two repairs
(`testLeaguePlaceholderUsesTheApprovedCopy`, and the Trade/League help-absence assertions on
both platforms). No further placeholder-pinning assertions found.

**A10 — test-suite honesty: PASS, with two documented exceptions and one known flake.** Exactly
two `XCTExpectFailure` in the whole suite, each naming its reason and its scope
(`ContextualHelpAccessibilityUITests` — Command Center contrast + app-wide Dynamic Type;
`ForcedUpdateAccessibilityUITests` — the same Dynamic Type finding). **No hidden skips, no
`@Ignore`, no silently disabled tests** on either platform or in the backend suite. The known
flake (`testCommandCenterHelpAffordanceIsLabeledAndOpensItsExplanation`, isolation-dependent) is
register item #8.

**A4 — partial pass.** The Yahoo fixtures now cite their capture date and source in-file
(*"Captured from real Yahoo traffic on 2026-08-28"*, `/league/{key}` captured live from
`470.l.1255365`). **The 2026-08-28 lesson was applied where it was learned.** V4 is that the
lesson was not carried forward to the fixtures written since.

---

## Not runnable in this pass

**A8 — secrets in the emitted bytes.** The criterion requires provoking a real failure on each
provider path and searching the actual emitted output for a canary credential. That is a runtime
exercise against a running server, not a code read, and **the criterion explicitly says review
is not sufficient** — the scrubber has been found holed three times, every time by provocation
and never by reading it. Carried into the runtime portion of the audit rather than marked pass.

**All of Part B.** Device work, real accounts, founder-gated.

---

## What the Veteran hands to the Scrappy pass

Per `audit-grading-system-v1.md`, the Scrappy lens takes this list and decides *which* and
*when* — he may not add to it.

- **V1 fires a ratified abort class.** By the firing rule this is binary: it is not his to
  defer, only the founder's to override, and an override is recorded with a name on it.
- **V2 and V4 both reduce to the same underlying work** — measuring what the providers actually
  return. That is `M11A`, already due.
- **V3 already has a proposed disposition** (hide for beta) that the Scrappy lens authored.
