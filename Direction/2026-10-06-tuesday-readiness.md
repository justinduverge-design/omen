# Tuesday (2026-10-06) readiness — deferred work and entry gates

**Opened:** 2026-09-28. **Target:** the next Tuesday development/release checkpoint after the
2026-09-29 iOS beta candidate is archived by Justin.

This page owns work deliberately excluded from the 2026-09-29 release session. It is not evidence
that any item below is implemented, deployed, activated, or released. The 2026-09-29 session stays
focused on one verified iOS candidate; tomorrow's archive remains Justin's final store action.

## Operating rule

Start this plan from the exact archived 2026-09-29 commit and its release evidence. Reconcile
`Direction/current_sprint.md` against `main` before pulling work: T1/T2 contain implementation claims
that require review/merge-state verification, while T3/T4 still cite dependencies that may have moved.
Do not use this readiness page as a replacement queue or silently advance a sprint state from prose.

Each production, SQL, publication, provider-account, secret, deploy, merge, or store action still
requires the authority applicable to that action. A green local test is not production evidence.

## Must — establish next week's truthful baseline

1. **Close the 2026-09-29 evidence loop.** Record the archived SHA, actual iOS build number, App Store
   Connect processing result, physical-iPhone smoke result, and any tester-visible regression. Do not
   infer Build 7 or Build 8 from the source tree alone.
2. **Reconcile the active sprint.** Run the staleness checker, compare T1/T2/T3/T4/T5 against merged
   `main`, and move only evidence-backed terminal work to the verified-detail/ledger route. Preserve
   unresolved dependency and founder-decision boundaries.
3. **Profile the remaining league-switch path.** The server now runs the two independent ESPN checks
   concurrently. Measure the clients' five-surface refresh after `POST /api/leagues/active` on iOS and
   Android before changing it. Record per-surface timings and prove selected league/team/season remain
   consistent; do not trade identity correctness for perceived speed.
4. **Restore platform release parity.** Establish the Android version/build baseline, run the Android
   release-quality matrix, and prepare a Play-distribution plan. “Both platforms ship” is a contract
   goal, not permission to upload or publish. Do not describe the 2026-09-29 iOS-only candidate as a
   cross-platform release.

## Must — football-intelligence activation gate

The local football-intelligence foundation and Stage D integration exist, but customer activation is
not complete. Execute this as an evidence chain, never as one broad “turn it on” action:

1. Confirm the immutable artifact root, retention, encryption, access policy, off-device backup, and
   restore procedure. Prove an artifact-specific restore, hash verification, and index rebuild.
2. Review the authored serving SQL against the approved architecture and current production schema.
3. Apply SQL/RLS only under an exact database action approval. Re-run the proven authenticated-user,
   unpublished/superseded-row invisibility, denied-write, and service-role-write matrix against the
   intended environment without exposing keys or JWTs.
4. Produce and independently validate one publishable read-model artifact with source IDs,
   retrieval/as-of time, derivation/model versions, coverage, freshness, uncertainty, correction, and
   supersession evidence.
5. Publish only an explicitly accepted row. Candidate artifacts have no implicit promotion path.
6. Verify the authenticated read route and additive `omen-decision-brief.v3` response in the deployed
   environment. Scheme DNA, System Signal, and Coaching Tree remain distinct; intelligence is context,
   never the move selector.
7. Inspect web plus physical iOS/Android rendering for available, stale, partial, disputed,
   identity-unresolved, unavailable, and no-published-row states.
8. Activate customer exposure only after restore, RLS, publication, route, client, rollback, and
   observability evidence are all green. Preserve an immediate fail-closed rollback path.

**Stop:** no customer-facing scheme label or confident interpretation may appear without traceable
published evidence and a visible uncertainty/freshness state.

## Should — Trade T3, T4, and T5

Use `Blueprints/specs/omen-trade-rework-v1.md` and the reconciled sprint entries as authority.

### T3 — swipe candidate review

- First verify T2's response shape and production/load posture.
- Approve the native screen contract before code.
- Cover loading, reasoning-visible candidate, dismiss, save, exhausted, zero-result, and
  provider-degraded states on both platforms.
- T3 may show optimistic save state but must not invent persistence owned by T4.

### T4 — saved trade queue

- Retain T2 reasoning verbatim at save time and expose roster staleness.
- Outcomes are self-reported `accepted`, `rejected`, `countered`, or `null`; never inferred.
- Decide the destination and storage contract before implementation. Schema authoring and schema
  application are separate; Supabase application remains an exact-action gate.

### T5 — native three-team builder

- Approve the third-partner selection and three-sided offer interaction before implementation.
- Consume T1's legs-based comparison contract without reopening the approved two-team default.
- Build SwiftUI and Compose in parity and verify split-handoff steps, accessibility, and degraded
  provider states.

## Should — accessibility debt

### #338 — Dynamic Type audit visibility

Re-open as a focused typography-system task, not a deadline patch. Preserve the explicit Wix Madefor
`wght` variation used by `OmenTypography`; the prior `Font.custom` approach flattened the weight ramp.
Acceptance requires runtime scaling, resolved-face/weight tests, audit visibility, long-content and
large-category captures, and iOS/Android parity. Do not claim a user-facing scaling failure when the
known defect is audit visibility.

### #340 — Command Center contrast

Reproduce the expected audit failure without `XCTExpectFailure`, identify the exact elements from the
audit attachments, repair through approved semantic tokens on both platforms, and retire the expected
failure only when the audit passes. Include the broader `text-secondary` on `surface-2` 4.43:1 light-
mode pair in the design-system sweep; do not “fix” only one fixture.

## Remaining beta follow-ups

- Run the full real-account provider matrix for ESPN, Yahoo, and Sleeper across login/session restore,
  league discovery, active-league switching, Command, Trade, Omen, reconnect-required, temporary
  outage, partial provider failure, and stale credential generation.
- Reconcile any 2026-09-29 tester feedback into `Direction/known_issues.md`; no issue closes from a
  release note or verbal report alone.
- Confirm the actual next iOS and Android version/build numbers from the stores before source changes.
- Refresh TestFlight/Play tester copy from the shipped diff; do not reuse stale Build 5/6 language.
- Re-run API health/readiness/version, dependency audit, full backend, native builds/tests,
  reachability, diff check, and rollback review on the exact candidate SHA.
- Keep backend redesign/containment work independent from the release train until its reconciliation,
  cache/season identity, mock-fallback, full-suite, and production-compatibility gates are complete.

## Exit criteria for the 2026-10-06 checkpoint

- The prior archive has a durable evidence receipt and every new item maps to a current sprint entry.
- Football intelligence is either activated through the complete gate above or remains explicitly
  off with the exact unmet gate named.
- T3/T4/T5 report their real contract/dependency state; no UI or persistence is implied by backend
  capability alone.
- Android has an evidence-backed parity status, not an assumed one.
- #338 and #340 begin this checkpoint **OPEN**. They close only after native evidence verifies the
  fixes; otherwise they remain explicitly open with no masked failure.
- League switching is measured end to end and preserves selected-context identity.
- No archive, upload, publication, deploy, SQL, or customer activation is inferred from this plan.
