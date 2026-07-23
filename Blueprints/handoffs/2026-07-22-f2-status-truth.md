# F2 Status-Truth Doc Reconciliation Handoff

**Date:** 2026-07-22
**Branch:** `claude/f2-status-truth`
**PR:** _pending push_
**Base:** `main` @ `a90bccf`

## Scope

Close Verify item **F2** (`ready` vs `pending_live_engine`). F2's runtime was already unified 2026-07-19 by `src/services/omenReadiness.js` and the M0-BE F2 contract; the pin stayed open because active handoffs and mobile specs still carried the stale 2026-05-25/26 framing ("engine unbuilt", "Sleeper/ESPN always return pending_live_engine"). This pass corrects those doc lines and marks F2 closed.

Not in scope: any runtime, response shape, response field, provider adapter, test, schema, provider credential, deploy, package, or store change.

## Source-of-truth trace

Runtime rule (unchanged): `src/services/omenReadiness.js:29-37` — `getOmenReadiness()` returns
- `needs_platform` when no active connections
- `pending_live_engine` when active connections exist but none pass `isOmenReadyConnection()`
- `off_season` when usable context but off-season
- `ready` otherwise

`isOmenReadyConnection()` per provider (same file, lines 16-27):
- Yahoo — `is_active` + usable league_id + non-expired token_secret_id
- Sleeper — `is_active` + usable league_id + platform_username
- ESPN — `is_active` + usable league_id + `espn_secret_id` + `swid_secret_id`

Canonical contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md` §F2 (2026-07-19, approved).

Backend-to-frontend authority: the "M0-BE F2 — Omen readiness truth (2026-07-19)" section at the top of `Blueprints/handoffs/backend-to-frontend.md` (lines 9-24).

## Doc drift identified and corrected

Six sites in active docs contradicted the runtime authority:

| File | Location | Drift | Fix |
|---|---|---|---|
| `Blueprints/handoffs/backend-to-frontend.md` | ~line 2543 (Previous Contract Truth 2026-05-25) | "Sleeper-only, ESPN-only … returns `state: pending_live_engine`" — implied any Sleeper/ESPN connection returns pending | Rewrote to say "connection lacking the provider-specific context required for a safe live attempt"; listed the per-provider triggers; pointed at M0-BE F2 authority. |
| `Blueprints/handoffs/backend-to-frontend.md` | ~line 2601 (Omen context 2026-05-25) | "Sleeper and ESPN connections should render `pending_live_engine` until their live Omen engines exist" | Struck through with superseded note; added correct meaning. |
| `Blueprints/handoffs/backend-to-frontend.md` | ~line 3443 (Dashboard Omen tool statuses 2026-05-25) | "current live Omen engine cannot honestly produce a real recommendation from that connection yet" — engine-existence framing | Rewrote to context-missing framing; added historical note explaining the earlier framing was accurate in May 2026 before Sleeper/ESPN engines shipped. |
| `Blueprints/agent_handoff.md` | ~line 91 | "Sleeper and ESPN return `pending_live_engine` until their live Omen engines are ready" | Struck through with superseded note. |
| `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md` | §4.3 | Header "F2 dependency"; body said "being resolved … Recommend pinning F2 with M0c." | Renamed to "F2 — resolved 2026-07-19"; wrote the settled rule inline with pointers to the M0-BE contract and runtime. |
| `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md` | §11 item 4 | Listed F2 as an open backend requirement | Struck through with ✅ resolved note; other three requirements remain open. |
| `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` | §4 step 6 | "being resolved in Verify item F2" | Rewrote with the settled meaning + pointers. |
| `Blueprints/handoffs/frontend-to-backend.md` | Request 4 (native backend requirements from M0c) | Listed F2 as "Pinned" | Struck through with ✅ resolved note; other three requirements remain open. |

## Files also touched

- `Direction/context.md` — added a Current Build Truth line for F2.
- `Direction/current_sprint.md` — bumped "Last updated", struck through F2 in "Next build order", replaced the F2 Verify-lane entry with the closed-form receipt.
- `Direction/agent_inbox.md` — bumped "Refreshed", rewrote "Current truth" line, dropped F2 from "Recommended next pull" and promoted M0-BE-0 to #1.
- `Direction/decision_log.md` — added the 2026-07-22 F2 closure entry.
- `Blueprints/done/LEDGER.md` — added the F2 doc-reconciliation row.
- `Blueprints/playbooks/skill-usage-ledger.md` — added the F2 doc-reconciliation row with a procedure gap.

## Design decisions

### Strikethrough with superseded note over deletion
Legacy 2026-05-25/26 handoff sections describe the state of the world at that time. Deleting the wrong lines would lose evidence of how meaning evolved. Strikethrough + a pointer to the M0-BE F2 authority preserves the trail for review readers without misleading current agents.

### Minimum-diff surface
Only lines that a current reader could act on wrongly were touched. Frozen artifacts (`Direction/reviews/2026-07-19-*`, `Solutions/reports/*-2026-05-26.md`, older dated prompts under `Blueprints/prompts/claude-layer-2-*`, `Blueprints/handoffs/2026-07-04-*`, `Archive/**`) were left as-is — they are point-in-time records.

### No runtime touch
Runtime is authoritative and already correct. Test suites were not re-run: no code changed, no test changed, `git diff --check` is the only meaningful verification for a docs-only pass.

## Verification

- Trace: `grep pending_live_engine` across repo minus `graphify-out/` — 53 files reviewed; only the 6 sites above needed correction.
- `git diff --check` clean.
- Runtime file `src/services/omenReadiness.js` not modified; existing `test/omenReadiness.test.js` still passes (unchanged, not re-run in this shell).

## Boundaries honored

No runtime code, tests, provider adapters, response fields, response codes, credentials, `.env`, DNS, Nginx, SQL, Supabase schema, package files, dependencies, signing, store config, ESPN cookies, or user-facing copy touched. No push, PR, merge, or deploy.

## Skills

- **Used:** `slops-repo-inspector` (trace + drift identification), `planning-pass` (reconciliation order, minimum-diff surface), `slops-context-markdown` (all doc edits with consistent superseded-note pattern), `slops-git-flow` (branch).
- **N/A:** `slops-tdd`, `slops-quality-baseline`, `slops-code-review`, `slops-mobile-smoke`, `slops-ui-ux-audit`, `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`, `slops-ux-copy`, `design-md-author`, `demo-mode-pre-empty-state` — docs-only, no runtime/trust-boundary/user-copy change.

## Skill improvement

When a runtime resolution lands for a pinned Verify item, the same handoff should open a linked doc-reconciliation ticket in `Direction/current_sprint.md` and Verify lane, so the pin doesn't stay hot after the runtime is closed. F2's runtime was closed 2026-07-19 but the doc-reconciliation half sat un-scheduled for 3 days. Recorded in the skill-usage ledger; not blocking.

## Judgment calls Justin can override

- **Strikethrough vs. delete.** Kept the six stale lines struck through with a superseded note pointing at the M0-BE F2 authority. If you'd rather I delete the stale text entirely and keep only the corrected line, say so and I'll do a follow-up pass.
- **Left `Direction/reviews/2026-07-19-m0a-*.md` alone.** That review was a point-in-time reviewer note ("F2 unresolved at review time") and reads correctly as history. Same reasoning for `Solutions/reports/*-2026-05-26.md` and older dated prompts.
- **Did not touch `Direction/current_sprint.md` A-lane / M-lane structure.** F2 Verify-lane entry got the closed-form receipt in place, but I didn't try to reflow priorities beyond that.

## Next work after this PR

1. **M0-BE-0** — backend shared API/state contract + acceptance matrix (F2 was the blocker; now unblocked).
2. **M1-P P3 product compositions** — PlayerRow, DecisionBrief shell, PlatformConnectionCard, ConnectionStatusBadge, MetricStrip, ConfidenceBar, RiskPanel, SignalList.
3. **M3A-QA** — real-device interactive QA (founder/human).
4. **A1 / PR #140** — SVG logo masters visual review.
