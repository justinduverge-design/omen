# A6 — completion audit, clause by clause

**Date:** 2026-08-27
**Purpose:** the founder asked to "finish A6". This walks its own `Done when:` clause by
clause and says which are met, which are not, and what each remaining one is waiting on.
Nothing here is asserted from a task description; every claim names the file or the test.

`npm test` **862/862** at the time of writing.

---

## The clauses

| # | Clause | State |
|---|---|---|
| 1 | every recommendation names an immutable provider-rule snapshot and versioned canonical Scoring Contract | **PARTIAL — blocked** |
| 2 | Omen calculates every supported material rule from lawful event facts | **ENGINE DONE, DATA BLOCKED** |
| 3 | coverage is explicit for every rule | ✅ **MET** |
| 4 | reconciliation distinguishes all seven states | ✅ **MET** |
| 5 | a league-exact result fails closed when any material rule or adjustment cannot be reproduced | ✅ **MET** |
| 6 | historical rows without the new contract preserve the PPR fallback | ✅ **MET** |
| 7 | the additive schema and its application evidence are recorded | ✅ **MET** |

### 1 — snapshot on every recommendation: PARTIAL

`persistLiveRecommendation` (`src/routes/omen.js`) persists a contract version, contract
hash, provider-rule-snapshot hash and coverage state on **every** issued live
recommendation, and refuses to issue one it cannot persist. Derivation is
`scoringSnapshotResolver.js`.

Two things stop this being fully met, and neither is an engineering gap:

- **The rule body is withheld.** `RETAIN_RULE_BODY` is `false` for all three providers, so
  `moves.scoring_contract` stays `null`. A6's own EXTERNAL blocker covers capturing *and
  retaining* a provider's complete private rules, and Sleeper's written commercial-use
  permission is pending. **Founder call:** whether reading a user's own Sleeper league
  settings, through a connection they authorized, falls under that request at all. If not,
  this is a one-line change.
- **A restricted provider cannot have a snapshot at all.** The clause as written is
  unsatisfiable for ESPN. The drafted amendment (in `current_sprint.md` under A6) replaces
  "names a snapshot" with "names a snapshot **or** an immutable hashed restriction
  attestation". The code already behaves that way. **Awaiting ratification.**

### 2 — calculate every supported rule from lawful event facts: ENGINE DONE, DATA BLOCKED

The engine is complete and now replay-proven: `test/scoringReplayMatrix.test.js` replays
four scoring periods × two archetypes × three league shapes and reconciles every one as
`exact`.

What is missing is not code. The Tuesday source publishes aggregate fantasy points, not the
per-event facts a contract prices, so a live contract row reconciles to `unsupported` with
its missing facts **named** rather than scored as zero. That seam is `A7B`.

### 3–6 — met

- **3:** `Blueprints/specs/a6-scoring-coverage-matrix.md`, generated from the code with a
  drift-guard test. Sleeper maps 32 of 37 canonical events; the five gaps are named.
- **4:** `scoringReconciliation.js`, with a test asserting every one of the seven states is
  reachable.
- **5:** `provider_restricted` and `ambiguous` can never reach `exact` whatever the numbers
  say; a missing fact is refused rather than zeroed. Both tested, and the replay matrix adds
  the positive case — a standard league graded against PPR's provider total is a `mismatch`.
- **6:** `scoreMove` keeps the PPR fallback for rows lacking `scoring_contract_required`.

### 7 — schema and application evidence: met

The additive compatibility migration was applied to production 2026-08-26 after explicit
founder authorization and a rollback preflight, recorded in `facts-of-record.md` #8 and in
A6's `Unblock:` line. `sql/2026-08-26_a6_scoring_contract_production.sql` is the source.

---

## Two defects found while finishing this, both by building the replay matrix

**1. Banded field goals were modelled wrong, and reported `supported` while being wrong.**

The derivation mapped Sleeper's `fgm_*` bands onto `field_goals_made` with a `range_event`
operator, treating the fact as *the yardage of one kick*. So a kicker who made **two** field
goals supplied `field_goals_made: 2`, which fell inside the 0–19 band and scored as a
two-yard kick — 3 points instead of 6. Coverage still read `supported`, meaning Omen would
have claimed league-exact capability for a number it had got wrong.

Fixed: bands now map onto the canonical **count-per-band** keys
(`field_goals_made_0_39` / `_40_49` / `_50_plus`) with `per_event`. Sleeper publishes five
bands and the canonical vocabulary has three, so two sub-bands that disagree inside one
canonical band now make the league `ambiguous` rather than silently picking one value.

Deliberately **not** collapsed to a single `field_goals_made` rule when every band pays the
same: collapsing would change which fact key the contract requires, so a league staying flat
or going tiered would silently change the shape of the facts needed to grade it.

**2. My own fixture arithmetic was wrong, and the matrix caught it.**

The `QB-bad-day` archetype was authored with a provider total of `-1.14`; the correct figure
is `-1.54`. The engine was right and the fixture was wrong. Recorded because it is the
cheapest possible demonstration that the matrix does what it is for.

---

## What "finish A6" cannot mean today

Three things remain, and none is agent-resolvable:

1. **Sleeper retention rights** — founder judgement, one line of code once decided.
2. **The acceptance amendment** — founder ratification, no code.
3. **Lawful per-event facts** — `A7B`, and separately ESPN's and Yahoo's provider paths.

Every engineering clause that can be met without those is met. A6 should stay `BLOCKED`
with its blockers restated as the three above, rather than being closed on an engine that
has no facts to run on.
