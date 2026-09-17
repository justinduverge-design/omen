# ADR — Shared Decision Context and Receipt

**Status:** Accepted for feature-worktree implementation; release activation remains separate

**Date:** 2026-09-17

## Context

The canonical MVP service already selects an owned context and ranks live Start/Sit, waiver, and guarded trade candidates. Supporting services still own their input reads separately, while recent capability work adds availability vocabulary after recommendation generation. Omen needs a common middle layer without making a league switch an expensive all-source fan-out.

## Decision

Use a small request-scoped context with injected loaders and a public-safe receipt. A source becomes `used` only when an engine explicitly marks it after it affected a candidate, eligibility decision, or selected result. Existing source caches remain where they are; context de-duplication is one request only.

## Alternatives considered

| Option | Decision |
| --- | --- |
| One giant cached league object | Rejected: slow switches, broad staleness/failure coupling, and risky user-isolation keys. |
| Post-decision capability enrichment only | Rejected: cannot truthfully say which input affected a move. |
| Private LLM as orchestrator | Rejected: violates deterministic selection and evidence boundaries. |
| Typed request context plus receipt | Accepted: modular, testable, fast by default, and migratable per surface. |

## Consequences and safety boundaries

The core has no I/O and no provider or credential knowledge. MVP first records sources already consumed by its selector. Optional schedule, DvP, scoring, and operational-pipeline signals remain unavailable or unused until a source-specific policy proves otherwise. This ADR authorizes no SQL, provider credential access, dependency, deployment, production scoring/publication state, Raspberry Pi operation, or store release.
