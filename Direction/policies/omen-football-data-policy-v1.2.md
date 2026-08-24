# Omen Football Data Policy v1.2

**Audience:** Founder and product leadership
**Status:** Adopted by founder — 2026-08-24
**Purpose:** amend the adopted v1/v1.1 policy with an honest definition of recommendation outcomes.

This document is an amendment to `omen-football-data-policy-v1.md` and `omen-football-data-policy-v1.1.md`. Their rules remain in force.

## The added commitment

Omen evaluates its advice against the decision context it had when it made the recommendation. It never uses later information to make itself look better or worse, and it never treats a user’s separate choice as an Omen success or failure.

## 1. A recommendation is a recorded decision, not just a player name

At recommendation time, Omen must preserve the minimum decision snapshot needed to evaluate that advice fairly:

- the exact advice, alternatives, and intended action;
- the account’s relevant league, roster, and supported scoring-contract context;
- the information Omen actually used, including its timestamps and confidence;
- the applicable ruleset, source version, and decision-model version; and
- the recommendation’s stated horizon and success criterion when those differ by recommendation type.

Omen must not reconstruct this context later from “current” league settings, rosters, injury information, or player availability.

## 2. Four truths remain separate

| Truth | Meaning | What Omen must not do |
|---|---|---|
| Factual outcome | The provider-authorized final league result, including a disclosed provider/commissioner adjustment where applicable | Substitute an Omen estimate for the final result |
| Decision quality | Whether the recommendation was reasonable or outperformed the defined available alternative using the information Omen had then | Judge with hindsight or claim certainty the evidence does not support |
| User follow-through | Whether the account followed the advice, when Omen can know that safely and accurately | Treat a user’s independent choice as an Omen win or loss |
| User impact | Whether the followed action helped the account’s real outcome | Collapse this into raw player points or claim causation without the decision context |

## 3. Honest outcome states

Omen uses plain, non-blaming outcome language. At minimum it distinguishes:

- **Outcome verified** — the factual provider result is final and the recommendation can be evaluated.
- **Recommendation outperformed the defined alternative** — decision-quality conclusion with its evidence.
- **Not followed — counterfactual shown** — Omen may show what the advice would have meant, but does not credit or blame the account.
- **Provider-adjusted result** — the final result includes a disclosed league/provider adjustment that Omen did not independently derive.
- **Not evaluable** — material evidence is missing, unsupported, changed too late, or cannot be reconstructed fairly.

Omen must not reduce these states to a simplistic win/loss label.

## 4. Consequence for implementation

Full league scoring and provider reconciliation supply the factual-outcome layer; they do not themselves prove decision quality or user impact. Before an outcome feature ships, its recommendation type must define its alternative, horizon, required snapshot fields, and evaluation rule. A lineup choice, waiver pickup, trade idea, and long-horizon roster recommendation may not share an invented one-size-fits-all grade.

## 5. What did not change

This policy amendment does not authorize a collector, timer, provider credential, paid source, SQL application, migration, deployment, production scoring flag, or ADP work. It establishes the product/data contract those later phases must satisfy.

## Related records

- Base policy and custody amendment: `Direction/policies/omen-football-data-policy-v1.md`, `Direction/policies/omen-football-data-policy-v1.1.md`
- Current full-scoring-contract direction: `Direction/current_sprint.md` (`A6`, `A7`)
