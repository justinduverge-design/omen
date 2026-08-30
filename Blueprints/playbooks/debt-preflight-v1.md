# Debt Preflight v1

**Status:** proposal. Not a gate until ratified.
**Written:** 2026-08-29, founder-directed.
**Siblings:** `pre-beta-audit-criteria-v1.md` (*what can be wrong*) ·
`audit-grading-system-v1.md` (*who looks, in what order*). This one asks the third question:
**what do we already know is wrong, what does it cost, and when do we pay it.**

Nothing in here is a discovery. That is the definition of debt — a finding you have already
had, and chosen to carry.

---

## Why two stages

Aviation already solved this, and it did so for the reason the founder named: everything falls
in a sequence.

A pilot does not begin the walkaround the moment they reach the aircraft. First they establish
whether the flight should be attempted at all — is the aircraft legally airworthy, are the
documents current, is the weather go, is the pilot fit. Only then do they walk the airframe.

The order is not ceremony. **A walkaround performed by someone who has already decided to fly is
not an inspection — it is a search for permission.** Stage 0 exists to make the decision to look
independent of the desire to go.

| Stage | Question | Fails when |
|---|---|---|
| **0 — Preflight to the preflight** | Are we equipped and fit to assess this honestly? | We cannot observe what we would need to see, or we do not know our own capacity, or the documents lie |
| **1 — Preflight** | Item by item: can this fly, and under what conditions? | An item is carried with no condition, no owner, and no date |

---

# Stage 0 — The preflight to the preflight

Six checks. **All six must pass before Stage 1 is worth running.** A failure here is not a debt
item — it is a reason to stop and fix the instrument before reading the dial.

### 0.1 — Can we see? (instruments)

You cannot audit what you cannot observe. Before assessing anything, confirm the instruments
are live and honest.

- [ ] Backend errors reach the error backend. *Verified 2026-08-21: GlitchTip receiving
      `environment: production` events from inside `omen_api`.*
- [ ] **Native** crashes reach the error backend within 60s, both platforms. *Recorded closed
      under `O6`. **Re-confirm rather than assume** — this exact claim has been wrong before.*
- [ ] The distinction is held: *"the pipe is open"* and *"our error paths feed it"* are two
      different claims. Issue #354 and `O8` were both created by conflating them.
- [ ] A provoked failure carries no credential in the payload.

**Why first:** a beta with dead instruments does not produce data, it produces silence — and
silence is indistinguishable from success. That is the worst failure mode a monitoring tool has.

### 0.2 — Can we hear? (the radio)

- [ ] A beta tester has a working path to tell us something is broken. `POST /api/omen/feedback`
      is deployed; Help + Support exists. **Confirm the loop end-to-end**, including that
      someone reads the other end.
- [ ] We know who is reading it and how often.

**Answered 2026-08-29 — founder is the reader**, on the same principle as every app and AI
service he pays for: the person carrying the cost reads the signal. Cadence: **daily while the
beta is open**, and not before, since volume is zero until invitations go out.

**But the loop is still open, and the reason is specific.** Feedback writes `followed`,
`user_stars`, and `user_note` onto the `moves` table. The only route that reads them back is
`GET /api/moves`, which is **scoped to the authenticated user** — a tester can see their own
feedback and nobody can see everyone's. *The radio transmits, and the only receiver is the
sender's own handset.*

**Recommendation — the cheap real fix, not the good-looking one:** a saved Supabase query over
`moves` filtered to rows with a non-null `user_note` or `user_stars`, plus a standing daily
reminder while the beta is open. No new route, no admin surface, no auth model to get wrong.
Building an admin endpoint for ten testers is the gold-plating the Scrappy lens exists to catch.
Revisit only if the beta outgrows a query.

**Risk worth naming:** the founder is already the binding constraint on this project by the
sprint's own reckoning. Making him the reader adds load to the constraint. The mitigation is
that the reminder pushes to him rather than requiring him to remember a ritual — a check that
depends on discipline is a check that lapses in week two.

**Why:** flying without a radio is legal in some airspace and stupid in all of it. Ten testers
who cannot reach us are ten testers we learn nothing from.

### 0.3 — Are the documents current? (airworthiness paperwork)

- [ ] The sprint queue reflects reality. Spot-check three items against `main`.
- [ ] No blocker line survives past the condition that satisfied it.

**Why this is a Stage 0 check and not a Stage 1 item:** on 2026-08-29 `M5` slice F was found
carrying "stays blocked" prose five days after its pre-authorized condition had been met. **A
preflight run against a stale manifest inspects the wrong aircraft.** This repo has recorded at
least nine instances of the queue misrepresenting reality; treat currency as an instrument, not
as housekeeping.

### 0.4 — What can we actually carry? (weight and balance)

- [ ] Calendar named. *Today 2026-08-29. NFL Week 1 is **2026-09-10 — twelve days.***
- [ ] The binding constraint named. *It is founder attention, not task count — the sprint says
      so in its own batching rationale. Deploys, secrets, store, devices, and database are
      founder-executed.*
- [ ] Agent-runnable work separated from founder-gated work **before** anything is scheduled.

**Finding at time of writing:** `M11A-ProviderShapeProof` — the top item on every list below —
is `Status: READY`, `Blocked by: None`, **agent-buildable in full**, read-only through the
authenticated Omen API, cost `small`. The founder confirmed standing read access on 2026-08-28.
**The highest-value item in the queue needs no founder hour at all.** If a plan schedules it
behind founder-gated work, the plan is wrong.

### 0.5 — Do we have fuel reserve? (never plan to arrive empty)

- [ ] The plan does not consume every remaining day. If every item lands on 2026-09-09, there
      is no reserve for the one that goes wrong — and one always does.
- [ ] At least one full founder sitting held back, unallocated.

### 0.6 — Is the abort criteria written down, before we look?

- [ ] The *classes* of finding that ground the beta are written and agreed **now**, before any
      finding exists.

**This is the one place where pre-committing is correct, and it is worth being precise about the
apparent contradiction with the criteria doc.** That document says severity thresholds should be
set when findings exist, so a threshold is not quietly set to be met. Both are right, because
they govern different things:

- **Severity of a specific finding** is judged when you have it. Deciding in advance that "the
  contrast issue is minor" is rationalisation.
- **Abort classes** are decided before, precisely so they cannot be rationalised in the moment.
  "We do not open a beta while any provider is unproven" is a rule. "This particular unproven
  provider is probably fine" is what you tell yourself at 11pm on the ninth.

### Abort classes — recommended set, 2026-08-29

The founder asked for a recommendation rather than a menu. This is it: **keep three, tighten
one, add one.** Reasoning is given per class, because a rule nobody can argue with is a rule
nobody will apply.

**1. AMENDED — any user-facing statement that asserts something Omen has not verified.**
*Was: "any user-facing claim Omen cannot support with real data."* Too broad as written. Waiver
Watch saying "availability needs confirmation" is **honest absence**, and the original wording
would have grounded the beta over it. The line that matters is not *claim vs no claim* — it is
**asserting vs admitting**. Honest absence passes. An unverified assertion does not.

**2. KEEP — any provider path unproven against a real connected account.**
Binds at the **invitation gate**, not the audit gate. Ratifying this does not reopen the
2026-08-29 decision to defer `M11A` past the audit; the two are compatible by construction.

**3. KEEP — any instrument dead: we cannot see crashes, or cannot hear testers.**
This class **caught a real failure on its first run** — 0.2 above. A rule that finds something
the first time it is applied is a live rule, not a formality.

**4. KEEP — any credential reachable in an emitted payload.**
Worst blast radius in the set and the least reversible. The shared scrubber has been found holed
in three consecutive sessions, every time by provoking a real failure rather than by review.
Non-negotiable.

**5. ADD — any reproducible crash or hang on the first-run path.**
**None of the other four catch this.** Instruments being alive is not the same as the app being
stable; class 3 would happily pass while the app crashes on launch, because it only asks whether
we can *see* the crash. Scope it to the B1 path — install, sign in, connect, reach a populated
Command Center — so it stays testable rather than becoming "no bugs anywhere."

### The firing rule

**An abort class firing is binary, and the person who wants to ship does not get to grant the
exception.** Without this the classes are advisory, and advisory abort criteria are the thing
0.6 exists to prevent. If a class fires and the founder overrides it, that override is recorded
in `decision_log.md` as a decision with his name on it — not resolved by re-reading the class
until it no longer applies.

---

# Stage 1 — The preflight

Now the walkaround. Every known item gets exactly one classification. **Borrowed from the
Minimum Equipment List, because aviation solved "what may be broken while still flying" and the
answer is never "we'll deal with it."**

| Class | Meaning | Required fields |
|---|---|---|
| **NO-GO** | Grounded. Fix before the beta opens. | owner |
| **MEL** | May fly **with conditions**. | condition, owner, **repair interval — a date** |
| **DEFERRED** | Log it. Next scheduled maintenance. | owner, review trigger |

**The rule that makes this real: a MEL item without a date is a NO-GO item that has not admitted
it yet.** This is the discipline the Scrappy lens fails without — "we'll fix it later" with no
date and no owner is the failure mode named in the grading system.

## The register at time of writing

Classifications are **proposed**. The founder owns the final call, and the Scrappy lens owns the
argument for anything moving out of NO-GO.

| # | Item | Proposed | Condition / note |
|---|---|---|---|
| 1 | **Provider proof (§2.5 gate 5)** unproven on both new screens; ESPN + Sleeper never exercised against a real connected account | **MEL** | **Founder decision 2026-08-29: carried as a liability, deliberately deferred until after the audit.** Condition: **must clear before beta invitations** — abort class 2 still binds at that gate, and this is a deferral, not a waiver. Owner: founder. Repair interval: **date required** — see the note below. |
| 2 | **Waiver Watch** hardwired to "availability needs confirmation" for every ready league | **MEL** | Condition: **hide the section** for beta. Repair: after Week 1, with the transactions integration. Shipping a permanent shrug is a claim we cannot support. |
| 3 | **Data-plan ⚠️ rows** — ESPN projection shape, deadline field both providers — inferred, never measured | **MEL** | Folds into #1 and moves with it. Each wrong assumption is baked into a shipped contract. |
| 4 | **Brand fonts absent**; both apps render in system fallbacks | **MEL** | Condition: no promotional capture, and no accessibility pass, before `M12` lands. Otherwise both are done twice. |
| 5 | **Command Center contrast** findings, pre-existing | **MEL** | Condition: sequenced after #4. Must be closed or **accepted in writing** — not carried silently a third time. |
| 6 | **App-wide Dynamic Type** findings, pre-existing | **MEL** | Same condition as #5. |
| 7 | **Omen of the Week**: DvP + LLM enrichment on the critical path, both commented "enhancement only" | **MEL** | Condition: **measure in B4 before optimising** (`O4`'s lesson). Repair once a number exists. |
| 8 | `ContextualHelpAccessibility` UI test passes in suite, fails in isolation | **DEFERRED** | Review trigger: any second flaky test. One flake is noise; two is a suite you cannot trust. |
| 9 | **Yahoo matchup** returns `provider_unsupported` on the League screen | **DEFERRED** | Honest and named in the contract. Review when Yahoo capability changes. |
| 10 | **Playoff cut line** never populated — no provider path reads playoff settings | **DEFERRED** | `settings_known: false` is honest. Step 3 of the data plan. |
| 11 | **Trade personalization: Sleeper only**; ESPN and Yahoo named unsupported | **DEFERRED** | Named rather than faked. Review with #1's results. |
| 12 | **Android connected instrumentation** not run since the League/Trade screens landed | **NO-GO** | Cheap, and the only Android evidence that exercises a real device. |
| 13 | **Tuesday scoring on the A6 safety hold**; both cron flags `false` | **DEFERRED** | Correctly held. Five of six A6 gates untouched. Not a beta concern — a Week 2 one. |
| 14 | **No branch protection** on the repo (plan limitation, 403) | **DEFERRED** | Review trigger: any red check merged to `main`. The checks are all that stand in for it. |

**Weight and balance on this load:** one NO-GO item (#12, hours) after the 2026-08-29
reclassification, and thirteen carried. That is a light payload for twelve days — but the
lightness is borrowed, not earned: #1 and #3 moved because they were **deferred**, not because
they were **done**, and they come due before invitations.

### The 2026-08-29 carry, recorded plainly

The founder chose to carry #1 and #3 past the audit rather than clear them first. Two things
about that decision are worth stating so nobody later reads them wrong.

**It does not conflict with abort class 2.** The audit runs *before* the beta opens, so
deferring provider proof past the audit and still clearing it before invitations are two
compatible facts. **This is a deferral, not a waiver.** Abort class 2 binds unchanged at the
invitation gate.

**It is the one MEL item in the register whose repair interval is a trigger rather than a
date.** "After the audit" is an event, and the audit has no date yet. By this document's own
rule — *a MEL item without a date is a NO-GO item that has not admitted it yet* — #1 and #3 are
the register's weakest entries until the audit is scheduled. **Scheduling the audit is what
converts them from a promise into a plan.** Flagged, not corrected: the date is the founder's to
set.

**Also carried knowingly:** the League and Trade screens shipped to production on 2026-08-29
ahead of this proof. The founder accepted that at merge time, on the reasoning that both apps
will be under active change throughout the audit anyway. The screens are live and unproven
*today*; no beta tester has been invited to them yet.

---

## What this document deliberately does not do

It does not set the beta date, and it does not rank the MEL items against each other. Stage 0.6
fixes the abort classes; everything inside those bounds is a founder scheduling call made with
the register in front of him, not a rule written in advance by the person holding the checklist.
