# Post-Live Corvus Technology-Learning Runbook

## Status

**PARKED. Do not run before the activation gate.**

## Purpose

After Corvus is live, teach Justin why the product uses its current technologies, how the pieces connect, what tradeoffs were accepted, and which improvements are worth completing before the season ends.

The runbook uses Corvus itself as the curriculum. Learning sessions do not change production or app code; improvement ideas return through `planning-pass` and the normal company-baseline playbook.

## Activation Gate

All conditions must be true unless Justin explicitly overrides them:

1. Corvus satisfies `../done/release-done.md` for the public baseline.
2. Production has operated for at least seven stable days.
3. A seven-day `slops-product-pulse` report exists with usage, errors, and latency.
4. Known P0/P1 launch defects are closed or explicitly accepted.
5. The remaining season window and improvement capacity are stated.

When the gate opens, reactivate and redistribute `slops-learning-loop` through the L0 skill lifecycle before the first session.

## Learning Cycle

| Session | Question | Skills/procedures | Demonstration |
|---|---|---|---|
| 1. System map | What runs where, and why? | `slops-learning-loop`, `slops-repo-inspector`, `slops-graphify` | Justin explains L0/L1/L2, browser/API/data/AI/infra boundaries from memory and traces one request |
| 2. Product data flow | How does a league become a recommendation? | `workflow-tree-spec`, `slops-data-ingest-plan`, provider handoffs | Trace Yahoo/Sleeper/ESPN input through normalization, math, narration, response, and UI states |
| 3. Technology choices | Why Node/React/Supabase/Redis/Ollama/KVM/Tailscale/Sentry and what are the tradeoffs? | ADRs, `slops-ai-integration-review`, `pre-build-research` as needed | Decision table with alternatives, constraints, current evidence, and revisit trigger |
| 4. Trust and quality | How do tests, auth, RLS, scrubbers, done gates, and rollback protect users? | `slops-tdd`, `security-privacy-evidence`, `slops-code-review`, `slops-quality-baseline` | Run/interpret one focused test, one trust-boundary review, and one rollback path |
| 5. Live operations | How do we know Corvus is healthy and diagnose it safely? | `slops-product-pulse`, `slops-canary`, `slops-investigate`, observability runbook | Read real health/error/latency evidence and form one tested diagnosis without production mutation |
| 6. Improve before season end | Which changes have the highest user value per unit risk/time? | `product-gap-analysis-session`, strategy red-team reference, `planning-pass`, `slops-financial-sketch` if cost matters | Ranked improvement backlog with kill criteria, owners, evidence, and season deadline |

Each session begins with retrieval, uses one real Corvus artifact, ends with a demonstration, and schedules a short spaced review. Do not substitute a lecture or document dump for demonstrated understanding.

## Outputs

- Dated learning note in `Direction/reviews/` with retrieval result, misconception, demonstrated capability, and next review date.
- Technology-choice table linked to current ADRs and live evidence.
- One architecture/data-flow explanation Justin can reproduce without notes.
- Prioritized before-season-end improvement items in `Direction/current_sprint.md` through `planning-pass`.
- `slops-learning-loop` prior-use note after the first complete cycle.

## Boundaries

- No production mutation, deploy, secret read, migration, package install, purchase, or source edit during a learning session.
- Do not expose ESPN cookies, tokens, personal data, or production environment values.
- Do not optimize technology for novelty. Every proposed change needs a measured problem, expected user benefit, verification, rollback, and season deadline.
- Community-product discovery remains separately parked and is not part of this runbook.
