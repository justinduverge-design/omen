# Audit 2026-08-29 — Pass 3, Hotshot

| | |
|---|---|
| **Lens** | The Hotshot |
| **Question** | What are we locking ourselves into? |
| **Criteria owned** | A6, A9 |
| **Commit** | `952b482` |
| **Date** | 2026-08-29 |
| **Method** | Systematic sweep. Every finding re-derived from evidence; recall not admitted. |

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | 0 |
| WEEK-1-BLOCKING | 2 |
| AFTER | 1 |
| Abort classes fired | 0 |
| Criteria passed | 1 |
| Criteria not runnable | 0 |

---

## Findings

### F-HOT-01 — The two platforms disagree about whether a section is optional, and they disagree in opposite directions

- **Claim:** `league-overview.v1` was designed so sections fail independently. iOS couples them
  at the decode boundary; Android does not. The same response produces two different screens.
- **Evidence:** `LeagueOverview.swift` declares `let matchup: Matchup` — non-optional, synthesised
  `Decodable`, so an absent `matchup` key throws and the **entire** decode fails. Android parses
  `matchup = parseMatchup(root.optJSONObject("matchup"))`
  (`LeagueOverview.kt:252`), and `parseMatchup` accepts a null object, returning
  `Status.Unavailable`.
- **Failure scenario:** The server ships a response omitting `matchup` — a shape the contract's
  own independence rule invites, and one a future server version could produce for an
  unsupported provider. **Android renders standings with an unavailable matchup. iOS renders
  "Omen sent something this version of the app couldn't read" and shows nothing at all.** One
  payload, two products.
- **Criterion:** A6 — contracts degrade, never blank. A9 — parity is behavioural.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon now · **one-way once builds are in testers' hands** — an app
  already installed cannot be taught to tolerate a section it was compiled to require, so the
  server can never safely omit one until every installed build is replaced
- **Abort class:** none

### F-HOT-02 — iOS requires four fields the server may legitimately omit; Android defaults them

- **Claim:** `trade-compare.v2` fields are required on iOS and defaulted on Android. The
  asymmetry is systematic, not incidental.
- **Evidence:** `TradeCompare.swift` — `Evaluability.missingProjectionCount: Int`,
  `totalPlayerCount: Int`, and `AnalysisContext.applied: [String]` are all non-optional with
  synthesised decoding. Android's `TradeCompare.kt:111-120` reads the same four through
  `?: 0` and an empty-list builder.
- **Failure scenario:** A server release adds a verdict path that omits `applied` or an
  evaluability count — additive by the server's own rules, and safe by A6 — and iOS Trade breaks
  with a decode error while Android keeps working.
- **Criterion:** A6 · A9.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon now · **one-way once shipped**, same reasoning as F-HOT-01
- **Abort class:** none

### F-HOT-03 — The activity contract has the seam; the clients have not proven they can use it

- **Claim:** `activity.unavailable_families` exists so waivers can land without a contract
  change. No test on either platform exercises a **populated** `items` array, so the promise is
  untested.
- **Evidence:** `LeagueOverviewTests.swift` and `LeagueOverviewTest.kt` both assert only the
  empty case (`status: empty`, `unavailable_families: ["transactions"]`, `items: []`). Both
  screens have a populated branch — `OmenLeagueScreen.swift` `activitySection`,
  `OmenLeagueScreen.kt` `ActivitySection` — that no test reaches.
- **Failure scenario:** The waiver work lands, sends its first populated `items`, and a mapping
  or rendering defect surfaces then — in the change that was specifically designed to be cheap.
- **Criterion:** A6 — the degradation path is tested; the *upgrade* path is not.
- **Severity:** AFTER
- **Reversibility:** afternoon
- **Abort class:** none

---

## Criteria passed

**A9 — parity, on the mapping rules. PASS, with F-HOT-01/02 as the exceptions.** Swept the
honest-absence rules that were written twice, once per platform. They agree:

| Rule | iOS | Android |
|---|---|---|
| Side with no team name never reaches the hero | `heroTeam` guards on empty name | `heroTeam` guards identically |
| Missing score renders as em dash, never `0.0` | `?? "—"` | `?: "—"` |
| Unknown `status` → `unavailable` | custom `init(from:)` | `Status.from()` |
| Unknown `verdict_state` → `insufficientData` | custom `init(from:)` | `VerdictState.from()` |
| Cut line only when `settingsKnown` | guarded | guarded |
| Points formatted locale-independently | `String(format:)` | `Locale.US` — deliberate, a comma decimal would misread as a list |

Help copy is byte-identical across platforms by inspection, as its own doc comment requires.

---

## Criteria not runnable in this pass

None. A6 and A9 are both fully assessable from source.

---

## Handoff

The Hotshot speaks last and his authority is proportional to reversibility, so his own
findings are stated against that rule rather than around it.

- **F-HOT-01 and F-HOT-02 are `afternoon` today and `one-way` the moment a build reaches a
  tester.** That is the whole basis for raising them now: an installed app cannot be taught to
  tolerate a field it was compiled to require, so every optional-vs-required decision hardens at
  first distribution. This is the single point in the calendar where they are cheap.
- **No redesign is proposed.** The fix is making four declarations optional and one section
  tolerant — smaller than the tests already written around them. There is no Scrappy objection
  available, which is the correct outcome for a Hotshot finding: if it needed a rewrite to
  justify, it would not be worth doing at twelve days out.
- **F-HOT-03 is genuinely deferrable** and is flagged only so the waiver session knows the seam
  is unproven in the direction it will actually be used.
