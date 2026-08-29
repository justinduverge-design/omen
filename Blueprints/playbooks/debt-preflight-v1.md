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

Proposed abort classes, for ratification:

1. Any user-facing claim Omen cannot support with real data.
2. Any provider path unproven against a real connected account.
3. Any instrument dead — we cannot see crashes, or cannot hear testers.
4. Any credential reachable in an emitted payload.

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
| 1 | **Provider proof (§2.5 gate 5)** unproven on both new screens; ESPN + Sleeper never exercised against a real connected account | **NO-GO** | Abort class 2. Agent-runnable today — see 0.4. Highest value per hour in the queue. |
| 2 | **Waiver Watch** hardwired to "availability needs confirmation" for every ready league | **MEL** | Condition: **hide the section** for beta. Repair: after Week 1, with the transactions integration. Shipping a permanent shrug is a claim we cannot support. |
| 3 | **Data-plan ⚠️ rows** — ESPN projection shape, deadline field both providers — inferred, never measured | **NO-GO** | Folds into #1. Each wrong assumption is baked into a shipped contract. |
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

**Weight and balance on this load:** four NO-GO items, of which #1 and #3 are the same work and
#12 is hours. That is a payload the twelve days can carry — **provided #1 is scheduled first and
not behind a founder gate it does not need.**

---

## What this document deliberately does not do

It does not set the beta date, and it does not rank the MEL items against each other. Stage 0.6
fixes the abort classes; everything inside those bounds is a founder scheduling call made with
the register in front of him, not a rule written in advance by the person holding the checklist.
