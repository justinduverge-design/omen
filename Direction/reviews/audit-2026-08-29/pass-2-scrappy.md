# Audit 2026-08-29 — Pass 2, Scrappy

| | |
|---|---|
| **Lens** | The Scrappy One |
| **Question** | What does this actually cost? |
| **Criteria owned** | A3, A11 · B1, B4 |
| **Commit** | `952b482` |
| **Date** | 2026-08-29 |
| **Method** | Systematic sweep. Every finding re-derived from evidence; recall not admitted. |

## Verdict

| | Count |
|---|---|
| BETA-BLOCKING | 0 |
| WEEK-1-BLOCKING | 1 |
| AFTER | 2 |
| Abort classes fired | 0 |
| Criteria passed | 1 |
| Criteria not runnable | 2 |

---

## Findings

### F-SCR-01 — Native standings throw away the points columns the web has been rendering for months

- **Claim:** `league-standings.v1` carries `points_for` and `points_against` on every row. The
  web app renders both. **Neither native client decodes either field.**
- **Evidence:** `src/adapters/sleeper.js:341-342` computes both via `statWithDecimal`, and
  `fetchSleeperStandings` returns them on every row — they are load-bearing enough that line 349
  uses `points_for` as the standings tiebreaker. The web reads them at
  `frontend/src/components/league/LeagueStandings.jsx:76` and `frontend/src/pages/Standings.jsx:110,120`.
  Native `LeagueStandings.Team` declares only `teamName`, `isCurrentUser`, `rank`, `wins`,
  `losses` on **both** platforms.
- **Failure scenario:** A tester opens the League screen and sees a standings table with no
  points-for column — the standard tiebreaker every fantasy platform shows, and the field their
  league is actually being sorted by. They cannot see why two teams at 6-2 are ranked
  differently. The data is already fetched, already paid for, and already on the wire.
- **Criterion:** A3 — data fetched and discarded.
- **Severity:** WEEK-1-BLOCKING
- **Reversibility:** afternoon — two decoded fields and two table columns, no provider work
- **Abort class:** none

### F-SCR-02 — The activity work is sequenced as free and is not

- **Claim:** The data plan sequences standings-derived activity signals as needing no provider
  work, while every signal it defines requires data no shipped payload carries.
- **Evidence:** `m1-league-screen-data-plan-v1.md:130` — step 2, *"Standings-derived activity
  signals | **none** — derived from a payload that already ships."* Lines 115-117 define all
  three v1 signals, and each requires *"playoff team count known"* or *"deadline field verified
  for that provider."* No adapter reads playoff settings — which is why `playoffPicture()`
  (`src/routes/league.js:316`) hardcodes `settings_known: false`.
- **Failure scenario:** Anyone planning from §4 schedules the activity panel as a free
  afternoon, starts it, and discovers mid-task that it needs a provider capability nobody has
  measured. The plan misprices the work.
- **Criterion:** A11 — documentation that asserts a fact.
- **Severity:** AFTER — it costs a planning error, not a user-visible defect
- **Reversibility:** afternoon
- **Abort class:** none

### F-SCR-03 — The feedback loop has a transmitter and no receiver

- **Claim:** Beta feedback can be written and cannot be read by anyone but its author.
- **Evidence:** `POST /api/omen/feedback` upserts `followed`, `user_stars`, `user_note` onto
  `moves` (`src/routes/omen.js:512-517`). The only route reading them back is `GET /api/moves`
  (`src/routes/moves.js:93`), which is scoped to the authenticated user. There is no
  all-testers view on any surface.
- **Failure scenario:** Ten testers file feedback during Week 1 and nobody sees it, because
  seeing it requires a manual Supabase query nobody has written or scheduled.
- **Criterion:** A11 / Stage 0.2 — the instrument exists but has no reader.
- **Severity:** AFTER — blocks the beta, not this audit; already carries an agreed fix
- **Reversibility:** afternoon
- **Abort class:** would fire **class 3** (*cannot hear testers*) at the invitation gate if the
  saved query is not in place by then.

---

## Criteria passed

**A3 — data fetched and discarded. PASS on the two paths this session repaired, with F-SCR-01
outstanding.** The two largest instances are now closed and verified in place:

| Path | Was | Now |
|---|---|---|
| `league-standings.v1` rank / record / team count | fetched for the context strip, discarded | drives League Pulse (`LeagueStandings.swift:93`) |
| Sleeper + ESPN matchup — opponent, both point totals, ESPN's `winner` | reduced to one `"W"`/`"L"` letter | kept by `matchupFromMatchups()` / `matchupFromEspnSchedule()` |

Sweeping the remaining provider surface found exactly one live instance, F-SCR-01.

---

## Criteria not runnable in this pass

**B1 — the first ninety seconds.** Phase B, and genuinely founder-gated: it needs a real
account and a walk of the install → sign-in → connect → populated Command Center path.

**B4 — timing.** Phase B, founder-gated. Requires measurement against a running app on cellular. **Explicitly not
estimated here.** `O4`'s recorded lesson is that a performance number means nothing without a
stated admission-control policy, and guessing one is worse than having none. The Omen of the
Week enrichment chain is the named target: `src/routes/omen.js:541-560` awaits `liveOmenResult`,
then `enrichWithDvp`, then `enrichWithLlm`, then `persistLiveRecommendation` **in sequence**,
with DvP and LLM both commented *"enhancement only."* That is a shape worth measuring, not a
number worth asserting.

---

## Handoff

To the Hotshot pass: he speaks only about work that has already survived *is it broken* and *is
it worth doing*.

- **F-SCR-01 is the cheapest real improvement in the entire audit** — two decoded fields, two
  columns, zero provider work, and it closes a visible gap against the web app.
- **F-SCR-02 is a planning defect, not a product defect.** It should be fixed in the document
  before anyone schedules from it again.
- On **F-VET-01**, the Scrappy lens has no deferral to offer: it fires a ratified abort class,
  and the fix is an afternoon. There is no cost argument for carrying it.
- On **F-VET-02**, the Scrappy disposition stands unchanged: **hide the section for beta.** One
  commit, versus a per-provider transactions integration that is the biggest slip risk in the
  queue at twelve days out.
