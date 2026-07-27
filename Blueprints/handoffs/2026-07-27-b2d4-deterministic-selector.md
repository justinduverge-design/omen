# B2-D4 — Deterministic Recommendation Selector — 2026-07-27

**Branch:** `backend/b2d4-deterministic-selector`, stacked on `backend/b2d-s2-sleeper-waiver-wiring` (PR #217)
**Contract:** `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md` § Deterministic selection; acceptance row **B2-D4 selector**
**Issue:** #162

## ID correction

Filed during planning as "B2-D-S4" and then "B2-D-D1". Both were wrong:

- **S4** is already taken — off-season honesty, decided 2026-07-26 in the waiver-pool spec.
- The correct ID is **B2-D4**, the `selector` row in the parent contract's acceptance matrix.

The S-series belongs to the Sleeper waiver spec; the D-series belongs to the canonical contract. They are different specs and the numbering is not shared.

## Problem

`start_sit` and `waiver_pickup` both existed. Nothing arbitrated between them.

`buildLiveOmenMvpMoveForUser` ran a **priority short-circuit**: if the optimizer returned any swap, that swap was the answer, and the waiver path was never generated. A 4-point lineup tweak beat a 12-point waiver add purely for being checked first. The contract asks for an *order of operations, not a priority*.

## Delivered

### `src/services/omenSelector.js` — new, pure

Owns steps 4-6 of the contract and nothing else. No network, no clock, no provider knowledge, so ranking is testable without a provider.

- **Step 4 — eligibility.** Rejects candidates that are unavailable, cross-context, missing a live required signal, carrying `mock` / `stub` / `stale` / `fixture` / `sample` inputs, unscored, or showing a zero-or-negative edge. Returns a *reason* rather than a bare boolean, so the engine can report why a type produced nothing without inventing a recommendation to explain it.
- **Step 5 — ranking.** Highest `decision_score` wins. Documented stable tie-break applies **only** after equal numeric scores: `start_sit` → `waiver_pickup` → `trade_suggestion`, ordered by how much of the roster the move disturbs. A final tie-break on stable id keeps ranking deterministic for two same-type candidates rather than depending on provider response ordering.
- **Step 6 — honest empty.** No eligible candidate returns no advice. A type is never substituted to fill the screen.

### `decision_score` — the comparable unit

Expected points gained this week, for both types.

- `start_sit`: the optimizer's `swap.delta`.
- `waiver_pickup`: `pickup.projected_points - outStarter.projected_points`.

The OUT starter's own projection is **subtracted rather than assumed to be zero**. That is what makes the comparison genuine rather than merely numeric — both numbers answer the same question.

### `trade_suggestion` — declared, never selectable

Always returns `available: false` with `no_provider_capability`. Per the contract's capability matrix, no provider exposes a normalized opponent-roster candidate surface; **B2-D3 must land before this can produce anything.** It is declared rather than omitted so the type reports as explicitly unavailable instead of silently not existing.

### Preserved from S2

The waiver preconditions are unchanged — a genuinely OUT starter and a real, projected, same-position player. They are what keeps the comparison honest, and they are also what keeps always-generating candidates free: **no pool is fetched for a roster with no OUT starter**, asserted by test. Sleeper pools are already cached, so the marginal cost in the OUT-starter case is a cache read.

## Evidence

**GitHub Actions billing hold is active. All evidence below is SUBSTITUTED (local), per `definition-of-done.md` § Degraded verification. No workflow ran.**

| Gate | Result |
|---|---|
| RED | `B2-D4 selects the waiver add when it out-scores the lineup swap` **fails** against the S2 engine at `97ad5ab`, passes with the selector. Verified by checking out the original `omen.js` and re-running. |
| GREEN | `npm test` **460/460**, up from 432/432 on the S2 tip (+23 selector unit tests, +5 engine tests) |
| Selector unit suite | `node --test test/omenSelector.test.js` — 23/23 |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| `git diff --check` | clean |
| iOS / Android | **N/A** — backend only, no native surface touched |

The other four engine tests are invariant guards and pass against both engines. That is intentional and worth stating plainly: **one test carries the behavior change**, the rest defend properties that must survive it.

## Interpretation recorded for review

The contract's B2-D4 row says *"no fallback when the winning candidate's required live signal is missing."* Two readings exist:

- **(a)** Ineligible candidates are filtered before ranking; a genuinely eligible lower-scoring candidate may still be presented.
- **(b)** If the top scorer is rejected, the whole response goes empty.

**Implemented (a)**, because contract step 4 places rejection before step 5's ranking, and step 6 forbids substitution only when *no* eligible candidate remains. Presenting a real, live, positive-edge candidate is honest even when a better one was rejected.

This is a judgment call on ambiguous contract wording. If Justin wants (b), the change is confined to `selectDecision` and one test.

## Files changed

- `src/services/omenSelector.js` — new, 150 lines
- `test/omenSelector.test.js` — new, 23 tests
- `src/services/omen.js` — orchestrator replaced; `buildWaiverPickupForConnection` → `buildWaiverCandidateForConnection` returning raw pieces plus a score instead of a finished envelope; `buildTradeCandidate` added
- `test/omenMvpLiveService.test.js` — 5 engine tests appended

## Not done / boundaries respected

- No provider credentials, SQL, schema, env, deploy, package, or production action.
- No new dependency.
- No native wiring — backend capability only.
- Trade remains unavailable. No trade recommendation is produced, per B2-D3.
- Yahoo waiver untouched (PR #211's scope, gated on Yahoo API reapproval).
- ESPN untouched — blocked on the E0 spike.

## Merge order

This branch stacks on #217, which stacks on #215.

```
#215 (S1) → #216 (docs) + #217 (S2) → this branch (B2-D4)
```

Merge #215 first; GitHub retargets the rest to `main`.

## Skills

- **Used:** `slops-tdd` (RED proven by reverting the engine, not asserted), `slops-repo-inspector` (verified branch state and contract IDs before writing).
- **Considered, N/A:** `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-ux-copy` — no user-visible surface changed; recommendation copy is unchanged. `security-privacy-evidence` — no auth, credential, provider-secret, or user-data boundary touched. `slops-quality-baseline` — substituted with the local run above while CI is down.
- **Weak:** none.

## Skill improvement

`slops-tdd` should require the RED proof be produced by **reverting the implementation and re-running**, not by writing the test first and asserting it would have failed. Two of the five engine tests I wrote would have passed against the old engine; without the revert I could have claimed behavior coverage I did not have. The revert took under a minute and is the only thing that distinguishes a real regression test from a vacuous one.

## Next

- **B2-D3 trade capability** is now the blocker for the third decision type. The selector already has its slot.
- **B2-D5 native handoff** renders each returned type. The selector's `rejected[]` array gives the native layer honest per-type unavailability reasons if that is wanted in the envelope — not currently exposed.
