# Audit Grading System v1 — three lenses

**Status:** proposal. Not a gate until ratified.
**Written:** 2026-08-29, founder-directed.
**Companion:** `pre-beta-audit-criteria-v1.md` holds the checklist — *what can be wrong*.
This document holds *who is looking, in what order, and what happens when they disagree*.

---

## The one idea

Three auditors look at the same code and the same app. **They are not three opinions on the
same question — they are three different questions**, and each one's blind spot is another's
specialty.

If all three agree on everything, the system has failed. It has become one reviewer wearing
three hats, which is worse than one reviewer, because it produces false confidence at triple
the cost. **The output of this system is the disagreements.**

---

## The three lenses

### 1. The Veteran — *"Does it hold?"*

Twenty years in. Not impressed by anything. Keeps it simple because he has been paged at 3am by
clever code and never once by boring code.

| | |
|---|---|
| **Asks** | Is this correct? Is it honest? Will it survive contact with a real user on a bad network? |
| **Looks at** | Failure paths, error handling, state machines, the thing that happens when the provider is down. Fundamentals. |
| **Catches** | Complexity not earning its keep. Missing states. Silent failure. "It works on my machine." Anything clever. |
| **Blind spot** | Dismisses genuinely better new things as fashion. Will happily maintain something that should have been deleted. |
| **Tell that he is right** | He can describe the exact failure, with inputs. |
| **Tell that he is wrong** | "That's just how we've always done it." |

**Example from this repo, in his voice:** *"Your loading spinner is on a state that can never
resolve. It's not slow. It's never going to finish. Did anyone open the app?"*

### 2. The Scrappy One — *"What does this actually cost?"*

Drives a Civic. Knows the product better than anyone in the room, including the people who
wrote the spec. Has shipped more with less than the other two combined.

| | |
|---|---|
| **Asks** | What is the cheapest thing that makes this real? What are we building that no user will ever touch? |
| **Looks at** | Scope, cost, sequencing, what can be honestly deferred, what data we already have and are throwing away. |
| **Catches** | Gold-plating. Work that serves the spec instead of the user. The 20% that delivers 80%. Things we already paid for and discarded. |
| **Blind spot** | Under-builds. Accrues debt and calls it pragmatism. "We'll fix it later" is sometimes a lie. |
| **Tell that he is right** | He can name the user who benefits, and the cheaper path. |
| **Tell that he is wrong** | The "later" he promises has no date and no owner. |

**Example from this repo, in his voice:** *"We're already paying for the full matchup on every
call — opponent, both scores — and squeezing it into one letter. We don't need a new
integration. We need to stop throwing away what we bought."*

### 3. The Hotshot — *"What are we locking ourselves into?"*

Reads release notes for fun. Knows what shipped last month. Sometimes insufferable. Occasionally
saves the whole project.

| | |
|---|---|
| **Asks** | Will this still be right in eighteen months? What does this decision make expensive later? |
| **Looks at** | Architecture, contract shape, platform capabilities we are not using, deprecations, one-way doors. |
| **Catches** | Dead-end designs. Contracts that will need a v2 the moment a real feature lands. Ageing dependencies. Missed platform primitives. |
| **Blind spot** | Chases novelty. Rewrites working code. Optimises for a future that may not arrive. |
| **Tell that he is right** | He can name the specific future change this blocks, and what it will cost then. |
| **Tell that he is wrong** | The benefit is "it's more modern." |

**Example from this repo, in his voice:** *"The activity section ships empty — fine. But if you
ship it without `unavailable_families`, then the day waivers land you're changing the contract
and both clients. Put the slot in now and that day costs nothing."*

*(That one was taken. The seam shipped on 2026-08-29 for exactly this reason.)*

---

## The sequence, and why it is this order

**Veteran → Scrappy → Hotshot.** Not negotiable, and the reason is not seniority.

**1. Veteran first, because correctness gates everything.** If the thing is broken or dishonest,
no amount of cost analysis or future-proofing matters. His pass produces the raw list. Running
him first also means the other two are reasoning about a *real* inventory rather than a guess.

**2. Scrappy second, because cost gates scope.** He takes the Veteran's list and turns it into a
plan under the actual constraint — which right now is calendar, not capability. He is the only
one authorised to say "not before beta." He cannot add items the Veteran did not find; he
decides *which* and *when*.

**3. Hotshot last, because commitment is the thing you can least afford to get wrong — and the
thing you least want to over-serve.** Running him first is the classic failure: he redesigns
something the Scrappy would have cut entirely, and now everyone is attached to the redesign.
By going last he only ever speaks about work that has already survived "is it broken?" and "is
it worth doing?"

**The order also matches the reversal cost.** A correctness bug is cheap to fix and expensive to
ship. A scope decision is cheap to revisit. An architecture decision is cheap to make and
expensive to unmake — so it gets decided last, with the most information.

---

## When they disagree

Disagreement is the point, so it needs a resolution rule rather than a vote.

**The rule: authority is proportional to reversibility.**

| Situation | Who wins | Why |
|---|---|---|
| Veteran says broken, others say ship | **Veteran** | Correctness is not a trade. Non-negotiable. |
| Scrappy says defer, Veteran says fix now | **Veteran on correctness, Scrappy on everything else** | "Wrong answer to a user" is correctness. "Not built yet" is scope. |
| Hotshot says redesign, Scrappy says ship it | **Scrappy — unless the decision is hard to reverse** | This is the whole rule. Hotshot's authority scales with what the choice costs to unmake. |
| Hotshot vs Veteran on approach | **Whoever names a concrete failure** | An abstract argument loses to a specific one, every time. |
| All three agree | **Look harder** | Either it is genuinely obvious, or the lenses have collapsed. Check which. |

**The reversibility test, stated plainly:** if we can change our mind in an afternoon, Scrappy
decides. If changing our mind means a contract version, a migration, a store submission, or
re-teaching users something — Hotshot decides, and he owes a written reason.

---

## What each lens is scored against

Each lens grades the same criteria from `pre-beta-audit-criteria-v1.md`, but they own different
ones. Shared criteria get graded by all three, and those are where disagreement is expected.

| Criterion | Veteran | Scrappy | Hotshot |
|---|---|---|---|
| A1 honest state at screen level | **owns** | reads | reads |
| A2 no state substituted | **owns** | — | — |
| A3 data fetched and discarded | reads | **owns** | — |
| A4 fixtures from real traffic | **owns** | — | — |
| A5 tests with unmarked expiry | **owns** | reads | — |
| A6 contracts degrade | reads | — | **owns** |
| A7 absence never invented | **owns** | — | — |
| A8 secrets in emitted bytes | **owns** | — | — |
| A9 cross-platform parity | reads | reads | **owns** |
| A10 test-suite honesty | **owns** | reads | — |
| A11 docs that assert a fact | reads | **owns** | — |
| B1 first ninety seconds | reads | **owns** | reads |
| B2 every screen, real league | **owns** | reads | — |
| B3 honest states on device | **owns** | — | — |
| B4 timing | reads | **owns** | reads |
| B5 accessibility | **owns** | reads | reads |
| B6 copy and claims | **owns** | reads | — |
| B7 provider truth | **owns** | reads | — |
| B8 errors reach somewhere | **owns** | — | — |

**Read the column totals.** The Veteran owns most of it, and that is correct for a pre-beta
audit — the question right now is overwhelmingly "is this true and does it hold." The Hotshot
owns three, because at twelve days from Week 1 his job is small and specific: stop us signing
anything we cannot unsign. If a future audit inverts that balance, the product has changed
phase, and that is worth noticing.

---

## The proof this is not theatre

Three real items from this session, graded by all three. If the lenses were decoration they
would agree. They do not.

### Waiver Watch is still hardwired to "availability needs confirmation"

- **Veteran:** *Beta-blocking.* A section that cannot report a working league is a lie by
  omission. Hide it or finish it, but do not ship a permanent shrug.
- **Scrappy:** *Not beta-blocking — hide it.* The real fix is a per-provider transactions
  integration with its own evidence pass. That is the single biggest slip risk in the queue,
  twelve days out. Hiding it costs one commit.
- **Hotshot:** *No opinion on timing.* The contract slot exists, so this is a client decision
  with no lock-in either way.
- **Resolution:** Veteran and Scrappy agree on the problem, differ on the fix. Reversibility is
  an afternoon → **Scrappy decides. Hide it, finish it after Week 1.**

### Omen of the Week runs its enrichment chain serially

- **Veteran:** *Correctness-adjacent.* DvP and LLM are both commented "enhancement only" and
  both sit on the critical path, so an enhancement failing slowly degrades the core product.
  That is a design error, not a performance nit.
- **Scrappy:** *Measure first.* We have never timed it. `O4`'s lesson is that a perf number
  means nothing without a stated admission-control policy. Do not optimise a number nobody has.
- **Hotshot:** *One-way-door risk is low.* Moving enrichment off the critical path is additive
  and does not change the response contract.
- **Resolution:** Scrappy's "measure first" is a *sequencing* claim, not a correctness one, so
  it does not override the Veteran — it orders him. **Measure in B4, then fix.**

### Provider proof (§2.5 gate 5) is not satisfied

- **Veteran:** *Beta-blocking, full stop.* Every provider path shipped on 2026-08-29 is
  fixture-proven. A wrong parser is indistinguishable from an empty provider — nothing logs,
  nothing alerts. We have already been burned by exactly this, for weeks, on Yahoo.
- **Scrappy:** *Agrees, and it is cheap.* One real account per provider. Hours, not days. There
  is no scope argument to make; this is the highest value-per-hour item in the entire queue.
- **Hotshot:** *Agrees, different reason.* Every ⚠️ row in the data plan is an assumption baked
  into a shipped contract. Each one that is wrong is a contract change later.
- **Resolution:** All three agree → **look harder.** Checked: this is genuinely obvious, not a
  lens collapse. It is the top item.

---

## How a finding is written under this system

Extends the finding format in the criteria doc:

| Field | Rule |
|---|---|
| **Claim** | One sentence. |
| **Evidence** | File+line, command+output, or screenshot. Never a hypothetical. |
| **Lens** | Which of the three raised it |
| **Contested by** | Any lens that disagreed, and their reason. Blank is suspicious. |
| **Severity** | `BETA-BLOCKING` / `WEEK-1-BLOCKING` / `AFTER` |
| **Reversibility** | `afternoon` / `contract` / `one-way`. Decides who wins a tie. |

---

## Known liabilities carried in deliberately

Founder decision, 2026-08-29: the League and Trade screens shipped to production ahead of
provider proof, **accepted as a liability until the next round** because the apps will be under
active change during the audit anyway.

Recording it here so it is a decision with a name on it, not a gap someone discovers later:

- Provider proof (§2.5 gate 5) outstanding on both new screens. **Deferred until after the audit by founder decision 2026-08-29** — `debt-preflight-v1.md` register #1/#3. Deferral, not waiver: abort class 2 still binds at the invitation gate.
- Waiver Watch still hardwired.
- Command Center contrast + app-wide Dynamic Type findings, pre-existing.
- `ContextualHelpAccessibilityUITests.testCommandCenterHelpAffordanceIsLabeledAndOpensIts
  Explanation` passes in suite, fails in isolation.

These belong in the **debt proposal**, which is a separate document from this one and from the
criteria. Different question: the criteria ask "how do we judge it", this asks "who is looking
and when", and the debt proposal asks **"what do we already know is wrong, what does it cost,
and when do we pay it."** Nothing above is a discovery — it is all already known, which is
precisely why it is debt rather than an audit finding.
