# League-Aware Waiver System v1

**Status:** Phases 0-3 built and merged to `main` for Sleeper. ESPN/Yahoo Phase 0 outstanding.

| Phase | State |
|---|---|
| 0 · Settings probe | **DONE (Sleeper + ESPN)** — both verified against real leagues. Yahoo still gated on API reapproval. |
| 1 · Canonical model | **DONE** — `src/services/waiverSystem.js` |
| 2 · Surfacing / §6.2 gate | **DONE** — `waiver-analysis.v1` carries `waiver_system`; wired through the route and Omen of the Week |
| 3 · Bid recommendation | **BUILT, NOT RATIFIED** — `src/services/waiverBid.js`. `SEASON_DEFINING_POINTS` and `VALUATION_HORIZON_WEEKS` are judgement calls awaiting founder sign-off. Claim probability remains out of scope and forbidden. |

**Not verified against a real waiver period.** No 2026 waivers have run. The first, ~2026-09-10,
is the first genuine evidence the bid curve is sane.
**Date:** 2026-09-05
**Owner:** Backend / waiver analysis
**Intent:** `Direction/intents/2026-09-05-league-aware-waiver-wire.md`
**Parent contract:** `Blueprints/specs/b2d-canonical-omen-context-and-capability-contract-v1.md` — selected-context verification, deterministic selection, and envelope rules are inherited and not restated.
**Design rule this clears:** `omen-mobile-visual-briefs-v1.md` §6.2.

## Decision

Waiver *analysis* ships today and is deliberately waiver-*system*-blind. §6.2 forbids exposing
FAAB amount, waiver priority, or claim probability "unless Omen has verified the league's waiver
system and the capability is truly implemented." Nothing verifies the league's waiver system, so
the gate has never been clearable.

This spec builds that verification and the values it unlocks. It does **not** rebuild the
available-player pool — that is `b2d-live-waiver-pool-sleeper-espn-v1.md`, already built and
provider-proven for Sleeper and ESPN.

**The unlock is per-league and per-provider, never global.** A league whose waiver system was not
positively identified stays under the current §6.2 restriction. Silence is the correct output;
a default is not.

## Capability matrix and gates

| Provider | Pool (existing) | Waiver-system detection (this spec) | Gate |
|---|---|---|---|
| Sleeper | built + provider-proven | probeable now — public GETs, no credentials | none |
| ESPN | built + drafted-league proven | needs a real league session | founder device (S2/SWID) |
| Yahoo | fixture-verified | unknown until reapproval | Yahoo API reapproval (external) |

**Yahoo cannot pass this spec's acceptance in the current entitlement state.** That is an
external blocker, recorded here rather than designed around. The intent's "all three providers"
line is satisfied by Sleeper and ESPN plus a Yahoo path that activates on reapproval.

## Phase 0 · Settings probe — research before build

**No field names are asserted in this spec.** The repo's own precedent (the ESPN E0 feasibility
spike) is research-first, and §6.2's word is *verified*. Guessing a settings key and shipping a
budget read on it is the exact failure §6.2 exists to prevent.

Probe, per provider, against a real drafted league:

- Which field expresses the waiver system, and its full value set — including whatever ESPN and
  Sleeper each call continuous / rolling / reset / none.
- Whether a FAAB budget total and per-team remaining are exposed, and whether remaining is
  authoritative mid-week or lags pending claims.
- Whether a per-team waiver priority position is exposed, and when it updates.
- What a league in an unsupported or unrecognized configuration returns.

**Done when:** each provider has a recorded value set with a real observed sample per branch, and
any field that is absent is recorded as absent rather than assumed. Sleeper is runnable
immediately and needs only a league id. ESPN requires a founder-device session.

### Phase 0 findings — Sleeper, observed 2026-09-05

Probed live and credential-free against three real leagues on the founder's account
(`darthslops`, user `995170650467762176`): two `in_season`, one `pre_draft`.

`league.settings` waiver keys, as observed:

| League | status | `waiver_type` | `waiver_budget` | `waiver_bid_min` | `waiver_day_of_week` | `waiver_clear_days` |
|---|---|---|---|---|---|---|
| Omen App Data | in_season | **0** | 100 | 0 | 2 | 2 |
| EB FOOTBALL | in_season | **2** | 100 | 0 | 2 | 2 |
| D465 | pre_draft | **0** | 100 | 0 | 2 | 2 |

**The critical finding: every value-bearing field is populated regardless of waiver type.**

- `waiver_budget: 100` is present on all three leagues, including both `waiver_type: 0` leagues.
- `waiver_position` (a real 1..N priority order) is present on **every roster in both**
  in-season leagues, including the `waiver_type: 2` league.
- `waiver_budget_used` is likewise present on every roster in both.

No field is absent when it does not apply. An implementation that reads whichever field it finds
would display a FAAB budget *and* a waiver priority for every league in the product, would be
wrong for at least one branch in every case, and **would pass a naive test suite**, because the
data is always there and always well-formed.

`waiver_type` is the only discriminator. Every other waiver field is a decoy and must never be
read before it has been gated on `waiver_type`. This is the single rule Phase 1 exists to enforce.

**Value mapping — evidenced, not inferred.** Verified against completed 2025 seasons by reading
actual waiver transactions rather than settings fields:

| `waiver_type` | League observed | Waiver txns | Transaction `settings` keys | Bids seen |
|---|---|---|---|---|
| `0` | D465 2025 | 57 | `priority`, `seq` | **0** |
| `1` | EB FOOTBALL 2025 | 241 | `priority`, `seq` | **0** |
| `2` | — | none yet | — | — |

`0` and `1` are both priority-based. Across 298 real waiver transactions no bid amount appears in
any of them. `2` has never been observed in this account's history.

**Transactions are the authoritative verification signal, not settings.** A league's waiver
transactions carry `priority` under a priority system and a bid amount under FAAB. Settings
fields are always populated and prove nothing; transactions record what the league actually did.
Where a league has waiver history, Phase 1 should confirm the system against it.

**`waiver_type` is per-season and changes.** EB FOOTBALL ran `1` in 2025 and runs `2` in 2026 —
the same league, a different waiver system. It must be read per-season and must never be cached
across years, and a season rollover must re-verify rather than carry the prior value forward.

**`waiver_type: 2` is FAAB — founder-confirmed 2026-09-05.** Confirmed mapping:

| Value | System | Basis |
|---|---|---|
| `0` | priority | 57 waiver txns, 2025 D465 — `priority`/`seq`, no bids |
| `1` | priority | 241 waiver txns, 2025 EB FOOTBALL — `priority`/`seq`, no bids |
| `2` | **FAAB** | founder confirmation, EB FOOTBALL 2026 |

The value set is not proven exhaustive. An unrecognized value maps to `not_determined`.

**This probe found a live product-truth defect, and it is the argument for the feature.** The
founder stated the FAAB league was on ESPN and that no Sleeper league ran FAAB. The data
contradicted him, and he was mistaken: **EB FOOTBALL changed from priority (`1`) in 2025 to FAAB
(`2`) in 2026** and he was unaware. Omen is currently giving system-blind advice into that league
while its own product owner held the wrong model of it. A user cannot be relied on to know their
own waiver system, and a season-cached value would have been wrong for this exact league.

**Two blockers this removes:**

1. **A credential-free FAAB league now exists.** `EB FOOTBALL` (`1311998161723600896`), `in_season`,
   `waiver_budget: 100`, 10 teams. The FAAB branch and the Phase 3 bid recommender can be built
   and verified against a real FAAB league **without an ESPN device session**. ESPN is no longer
   on the critical path for FAAB.
2. **Both branches are now covered credential-free.** `Omen App Data` (`waiver_type: 0`) is the
   negative case; `EB FOOTBALL` (`2`) is the positive. The intent's "never shows FAAB to a
   non-FAAB league" acceptance line is testable today against two real in-season leagues.

**ESPN league of record:** *Slops Saloon Fantasy Football Showdown*. Still required for ESPN
Phase 0 and still gated on a founder-device session — but it now blocks only ESPN provider
coverage, not the FAAB capability.

### Phase 0 findings — ESPN, verified 2026-09-05

Probed live through an authenticated browser session (`mSettings` + `mTeam`) against three real
leagues on the founder's account:

| League | `acquisitionType` | `isUsingAcquisitionBudget` | `acquisitionBudget` | `minimumBid` | `waiverRank` | System |
|---|---|---|---|---|---|---|
| Slops Saloon FF Showdown | `WAIVERS_CONTINUOUS` | **true** | 100 | 0 | 4 | FAAB |
| Everything Backwards | `WAIVERS_TRADITIONAL` | **true** | 100 | 0 | 12 | FAAB |
| Las Vegas Pro H2H PPR | `WAIVERS_TRADITIONAL` | **false** | 100 | 1 | 5 | priority |

**`isUsingAcquisitionBudget` is the only discriminator.** Two traps, both confirmed here:

1. **`acquisitionType` is not the discriminator, though it looks like one.**
   `WAIVERS_TRADITIONAL` appears with the budget flag both true and false. Mapping on the type
   string gets the third league exactly wrong.
2. **`acquisitionBudget: 100` is present on the non-FAAB league**, and `waiverRank` is present on
   every team of every league including both FAAB ones. Same decoy pattern as Sleeper: no field
   is absent when it does not apply.

The founder's stated premise — one FAAB league on ESPN — was again incomplete: **two** of his
three ESPN leagues run FAAB. Third time a league's real waiver system differed from what its
owner believed.

**Provider status after this probe:** Sleeper verified, ESPN verified, Yahoo unverifiable pending
entitlement reapproval.

## Phase 1 · Canonical waiver-system model

Normalize every provider's vocabulary into one internal shape, the way scoring settings are
already normalized. Providers disagree on names for the same mechanic; the engine must not learn
three dialects.

The model carries: the system in force, whether a budget applies and its total and remaining,
whether a priority order applies and the user's position in it, and — required — **how the system
was determined**: positively read from the provider, or not determined.

`not_determined` is a first-class value, not an error and not a fallback to FAAB. Everything
downstream branches on it.

**Done when:** each probed provider maps onto the model with no provider-specific field leaking
past the adapter boundary; an unrecognized value maps to `not_determined` rather than to the
nearest guess; unit tests cover each branch including the unknown one.

## Phase 2 · Surfacing — the §6.2 clearance

Extend the waiver analysis contract to carry the waiver system and its values, and lift the §6.2
restriction **only** where the system was positively determined.

Rules, each derived from §6.2's own wording:

- FAAB budget and remaining appear only for a league determined to run FAAB.
- Waiver priority position appears only for a league determined to run priority.
- Neither ever appears for a `not_determined` league. The existing system-blind advice is the
  correct output there, unchanged.
- A league that runs FAAB never shows a priority position, and the reverse. Showing the wrong
  one is the failure mode the intent names as worse than silence.
- Claim probability remains **out of scope in v1** and stays under §6.2. It requires modeling
  other managers' budgets and intent; nothing in Phase 0 or 1 makes it knowable.

**Done when:** a FAAB league shows budget and remaining matching the provider's own settings
screen; a non-FAAB league shows no FAAB value anywhere in the waiver experience; a
`not_determined` league renders exactly today's output; the off-season branch is preserved.

## Phase 3 · Bid recommendation

Founder-directed into the first cut, over a recommendation to defer it. Recorded as such.

A recommended bid appears only for a league where the system is determined FAAB **and** budget
remaining is known. It must state what it rests on. Where the inputs are not present, the bid is
**absent — never zero, never a guess.** This follows the pool spec's existing rule that a null
projection stays unknown and never becomes zero.

**Open — resolve before building this phase:** what makes a recommended number defensible. A bid
is a strategy claim about a market, not a data read, and §6.2's caution is pointed exactly here.
Phases 0–2 do not answer it and this spec does not invent an answer. Named as an open question in
the intent; founder and design decide.

**Done when:** the basis is agreed and written into this section, then a bid appears only under
the conditions above and is absent otherwise.

## Explicitly out of scope

- Submitting or executing claims. Omen advises; the user acts in their provider.
- Redesigning the Waiver Analysis screen. §6 is ratified; this fills it with league-true values.
- Claim probability (see Phase 2).
- The available-player pool.
- The VORP replacement-level calibration question.

## Acceptance — traced to the intent

| Intent acceptance line | Phase |
|---|---|
| ESPN FAAB league reports FAAB, budget and remaining match the provider | 0, 1, 2 |
| Non-FAAB league never displays a FAAB amount or budget | 1, 2 |
| Advice available across providers | 0–2; **Yahoo blocked externally** |
| Undetectable system says so and falls back, never guesses | 1, 2 |
| Bid states its basis, absent when inputs missing | 3 |
| Verified on founder device against real leagues | all |

## Sequencing note

NFL Week 1 is ~2026-09-10. `M9-BE-WaiverAnalysis` is built and one approval from deploy. This
spec does not depend on that deploy and does not block it. Shipping the existing system-blind
analysis first is the lower-risk path into Week 1; this layer improves it rather than replacing
it. Sequencing remains a founder call.
