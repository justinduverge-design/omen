---
metadata_profile: valor-brain-pilot/v0
page_id: omen.ops.o2.rollback
page_type: operational-state
layer: L2
authority: REVIEW_ONLY
task_status: IN_PROGRESS
change_state: APPLIED
exercise_state: NOT_RUN
owner: Justin Duverge
compiled_at: 2026-08-20
repository_commit: 5cf3597
canonical_sources:
  - Direction/current_sprint.md#o2--named-rollback-owner-and-tested-rollback-path
  - Blueprints/playbooks/rollback-runbook.md
  - .github/workflows/deploy.yml
  - Direction/reviews/evidence/2026-08-19-o2/deploy-immutable-tags.patch
requires:
  - O7:CLOSED
  - deploy-immutable-tags:APPLIED
enables:
  - O2:VERIFIED
  - O2:CLOSED
checks_against:
  - Direction/status-model.md
  - Blueprints/done/release-done.md
freshness_triggers:
  - O2 status or claim changes
  - deploy workflow or immutable-tag behavior changes
  - rollback-runbook.md changes
  - a live rollback exercise is attempted
---

# Valor Brain pilot — O2 rollback readiness

This is one founder-directed, review-only pilot of the proposed Valor Brain pattern. It compiles the current truth for one real Omen concept without creating a new canonical folder, registering a schema, activating a resolver, or replacing the sprint.

The canonical task remains `O2` in `Direction/current_sprint.md`. If this page disagrees with a canonical source, the canonical source wins and this page is stale.

## Why this page lives here

- It evaluates a proposed knowledge pattern, so `Direction/reviews/` is the existing DBS route.
- It is not permanent doctrine, a new task queue, a runbook, or execution evidence.
- `page_type` describes the information shape. It does not instruct agents to move all pages of that type into a new folder.

## Metadata contract for this pilot

The frontmatter is intentionally narrow:

- `task_status` uses Omen's existing `READY → IN_PROGRESS → VERIFIED → CLOSED` vocabulary.
- `change_state` describes whether the deploy fix exists in production code. It does not replace task status.
- `exercise_state` describes whether the founder-only operational proof happened.
- `canonical_sources` supplies provenance.
- `requires`, `enables`, and `checks_against` make relationships searchable without pretending they are automatically enforced.
- `freshness_triggers` names events that invalidate the compiled truth.

This metadata profile applies only to this pilot. It is not a repo-wide schema.

## Compiled truth

**Valid against Omen `origin/main` at `5cf3597` on 2026-08-20.**

| Question | Current truth |
| :--- | :--- |
| What is O2's task status? | `IN_PROGRESS`, as recorded in the sprint. The pilot does not rename the task status to `APPLIED`. |
| Is the rollback owner named? | Yes. Justin Duverge is the named owner and sole authorized executor. |
| Is the documentation written? | Yes. `Blueprints/playbooks/rollback-runbook.md` contains the backend procedure, mobile limitation, verification, roll-forward warning, and six-step exercise. |
| Is the deploy fix on `main`? | Yes. PR #347 / `5cf3597` publishes immutable SHA tags for API and cron images and scopes pruning to seven days. |
| What is the live backend rollback path today? | The immutable `sha-<full-commit-sha>` image tag for builds published after PR #347. |
| What is the fallback path? | GHCR digest lookup and a temporary `:rollback` tag for older builds with no SHA tag. It requires package-read access. |
| Has the rollback procedure been operationally proven? | No. The founder-only non-critical live exercise has not run. |
| Can O2 close now? | No. The deploy change is applied, but the required founder-only live exercise has no evidence. |
| Is production mutation authorized by this pilot? | No. This page records the founder boundary; it does not broaden it. |

## State model

The handoff becomes unambiguous when its three different states are kept separate:

```text
O2 task                  IN_PROGRESS
  |
  +-- deploy fix         APPLIED
  |     |
  |     +-- PR #347      5cf3597
  |
  +-- rollback exercise  NOT_RUN
        |
        +-- founder run  PROVEN or FAILED

O2 may advance to VERIFIED/CLOSED only after required evidence exists.
```

`APPLIED` is therefore a valid value for the deploy change, not a valid replacement for Omen's canonical task status.

## Domain language

- **Mutable release pointer:** the `:main` image tag. A later deploy overwrites what it identifies.
- **Immutable release identifier:** `sha-<full-commit-sha>`. It identifies one build after the patch lands.
- **Legacy fallback identifier:** a GHCR digest for an image produced before immutable tags exist.
- **Rollback owner:** the named person accountable for the procedure.
- **Rollback executor:** the person authorized to mutate production. For O2, this is founder-only.
- **Rollback proof:** observed version evidence from a completed rollback and roll-forward, not a reviewed document or passing local test.

These definitions are local to O2. This pilot does not justify a new domain-modeling skill yet.

## Relationships and execution boundary

### Requires

- `O7` is `CLOSED`, so mobile has a minimum-version mitigation even though installed apps cannot be rolled back.
- The immutable-tag patch landed as PR #347, making the SHA-tag procedure the live path for new builds.
- The exercise requires explicit founder execution and a non-critical production deploy.

### Enables

- The landed patch enables a readable rollback target and preserves one week of local image history.
- Completing the exercise enables honest `VERIFIED` evidence for O2.
- Recording the Done receipt, ledger row, and completed-sprint entry enables `CLOSED / COMPLETED`.

### Not part of this concept

- O6's Sentry IP-attribution question is separate privacy work. It appeared in the same handoff but does not belong in O2's dependency chain.
- This pilot does not run `gh auth refresh`, apply the patch, open or merge a PR, deploy, roll back, edit the sprint, or close a task.

## Next actions from current truth

1. Justin runs the documented six-step exercise against a non-critical deploy and records timings plus `/api/version` evidence for rollback and roll-forward.
2. Run `node scripts/check-sprint-staleness.js` and read its coverage block before any closure.
3. If all Done gates are satisfied, add the ledger and completed-sprint receipts and close O2 under the canonical status model.

## Pilot evaluation after the first state transition

1. **Resolver value:** useful at the page level. The route is clear without a new `Direction/state/` folder: a review-only compiled page belongs in `Direction/reviews/`.
2. **Metadata value:** demonstrated once. `change_state` advanced from `PREPARED_NOT_APPLIED` to `APPLIED` while `task_status` correctly remained `IN_PROGRESS` and `exercise_state` remained `NOT_RUN`.
3. **Domain-modeling value:** useful as a short procedure inside the page. There is not yet evidence for a separate reusable skill.
4. **Wayfinder value:** not demonstrated here. O2 is a short dependency chain with one founder gate, not a foggy program of unresolved decision tickets.
5. **Automation readiness:** not ready. The fields need at least one more pilot and a validator with positive and negative fixtures before becoming authority.

---

## Append-only timeline

- **2026-08-19:** O7 closed, establishing the mobile forced-update mitigation.
- **2026-08-19:** the O2 runbook named Justin Duverge as rollback owner and documented the backend and mobile paths.
- **2026-08-19:** the immutable SHA-tag and time-scoped-prune fix was approved and preserved as a patch; it did not land because the authoring token lacked workflow scope.
- **2026-08-20:** `origin/main` remained at `e8fb09e`; the workflow still used mutable `:main` tags and unscoped image pruning.
- **2026-08-20:** this review-only Valor Brain pilot compiled O2's state. No deployment, production rollback, sprint transition, or closure occurred.
- **2026-08-20:** PR #347 merged as `5cf3597`. Immutable SHA tags and seven-day pruning became applied workflow truth; no deploy run was registered for the workflow-only merge, so production was not restarted.
- **2026-08-20:** the pilot advanced only `change_state` to `APPLIED`. `task_status` stayed `IN_PROGRESS`; `exercise_state` stayed `NOT_RUN`.
