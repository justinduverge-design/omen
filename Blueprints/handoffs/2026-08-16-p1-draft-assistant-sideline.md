# Handoff — 2026-08-16 — P1-DraftAssistantSideline

**Branch:** `claude/p1-draft-assistant-sideline` · **Not pushed, merged, or deployed.**

> **Read this line again when the PR lands.** The previous handoff in this repo said exactly the same thing and was still saying it after its PR merged, which produced the sixth recorded instance of the queue advertising shipped work as open. That is a property of handoffs, not of that session: a handoff is written before the merge and nothing re-reads it afterward. This session's first commit corrects that record; this sentence will need the same correction.

This session also carried a queue correction for `P1-ConnectContinueRoute`. It is the first commit on the branch and is described at the bottom. (Its `current_sprint.md` hunk rides in the second commit, because that file carries both changes and splitting a single file across two commits would have been more confusing than the impurity it fixed.)

## What was wrong

The founder sidelined Draft Assistant to the 2027 season on 2026-08-11. The decision was written into `Direction/decision_log.md`, `CLAUDE.md`, and `facts-of-record.md` #9 — and never executed. Five days later the product still shipped the feature to every visitor.

A decision recorded in the log and not carried into the code is, from the user's side, indistinguishable from no decision at all.

Verified on this branch before any change:

| Surface | State |
|---|---|
| Primary nav | `Header.jsx:26` — "Draft Assistant" → `/draft` |
| Route | `routes/index.jsx:52` — `/draft` served |
| Advertised tool list | `dashboard.js:266` — hardcoded `draft_assistant: {available: true, mode: "free", status: "ready"}` |
| Football page | A fourth tab, rendering the full page |
| Landing | `DraftAssistantMiniCard` with a mock top-3 board and an "Open Draft Assistant →" link |
| About page | A feature pill: "Know your pick before your turn." |
| Help drawer | Four entries — a `/draft` help key, two tips, and a quick link |
| Legal | `Privacy.jsx` "draft tools" among purposes of processing; `Terms.jsx` "draft tools" among what Omen provides |
| Backend | `/api/draft-assistant` mounted unconditionally |

**A fourth surface surfaced during the sweep, not in the item's scope list.** `frontend/src/lib/nextUrl.js` allowlisted `/draft` as a post-login redirect destination. With the route removed, a stored or crafted `?next=/draft` would still pass `sanitize()` and drop a freshly signed-in user on a 404. An allowlist entry for a route that no longer exists is a dead end, not a permission. (The prior item's boundary said not to touch `sanitize()` — that was *its* boundary, and for a different reason: its origin/path validation was correct. This is the allowlist contents, not the validation.)

## What changed

| File | Change |
|---|---|
| `src/config/index.js` | **New flag** `draftAssistant.enabled` ← `DRAFT_ASSISTANT_ENABLED`, mirroring the existing `YAHOO_ENABLED` pattern exactly. Carries the full re-activation procedure as a comment. |
| `src/server.js` | The `/api/draft-assistant` mount moves inside `if (config.draftAssistant.enabled)`. Unmounted, the path returns the app's standard 404. |
| `src/routes/dashboard.js` | The hardcoded `draft_assistant` tool entry is gone, replaced by a comment naming the restore step. |
| `frontend/src/routes/index.jsx` | `/draft` route and the page import removed; falls through to the existing catch-all. |
| `frontend/src/components/layout/Header.jsx` | Nav entry removed. |
| `frontend/src/pages/Football.jsx` | Tab, import, and switch branch removed; the hero copy "prepare for the draft" dropped. |
| `frontend/src/components/help/HelpButton.jsx` | The `/draft` help entry, two tips, and the quick link removed. |
| `frontend/src/pages/Landing.jsx` | `DraftAssistantMiniCard` component and its usage removed. |
| `frontend/src/pages/OmenLanding.jsx` | Feature pill replaced with Trade Analyzer. |
| `frontend/src/pages/Privacy.jsx` / `Terms.jsx` | "draft tools" clauses removed. |
| `frontend/src/lib/nextUrl.js` | `/draft` removed from the redirect allowlist. |
| `Direction/decision_log.md` | New entry with the five-step re-activation path. |

**Nothing is deleted.** Preserved and unreferenced: `src/routes/draftAssistant.js`, `src/services/adp.js`, `src/services/sleeperDraft.js`, `src/services/sleeperDraftAccess.js`, `frontend/src/pages/DraftAssistant.jsx`, `frontend/src/data/privateDemoFixtures.js`. A test asserts each still exists, so a future cleanup pass that deletes them fails loudly rather than quietly costing next season's head start.

**Why the flag fails closed rather than refusing politely.** A 403 or a "feature unavailable" body still confirms the feature exists — which is the exact claim the sideline exists to stop making. Unmounted means absent. Only the literal string `true` enables it; `1`, `yes`, and a blank value all stay off, and that is pinned by test.

## Evidence

- **RED first:** `test/draftAssistantSideline.test.js` failed 8 of 10, and the new assertion in `test/dashboardSummary.test.js` failed against the live hardcoded `{available: true, status: "ready"}`.
- **GREEN:** full `npm test` **561/561** (549 baseline, +12), `npm --prefix frontend run build` clean, `git diff --check` clean.
- **Local substitute for CI:** this item's `Done when:` cites no CI. Backend `node --test` (~5s) plus the frontend build is the recorded substitute; `pr-quality.yml` runs the same two on the PR.
- **The strongest evidence is the bundle, not the tests.** `frontend/dist/assets/*.js` contains **zero** occurrences of `Draft Assistant`, `draft-assistant`, or `Draft Position`. Once unrouted, the page tree-shakes out of the production build entirely — so it is unreachable, not merely unlinked. A source grep could not have established that.
- **Store/onboarding re-check** (required by `Done when:`): no shipped store metadata or onboarding copy advertises the feature. The store-copy specs carry it only as a *prohibition* with an open `R7` checkbox, and native help copy was already guarded by tests from `M6-ContextualHelp`.

## Costs and limits, stated

- **Not browser-verified.** Nobody loaded `/draft` in a running app to watch the 404. The bundle grep plus the catch-all route assertion stand in for it.
- **`R7` is not closed by this.** It is a separate item covering store metadata; this pass re-checked it and found nothing to fix, but the checkbox is `R7`'s to tick.
- **Landing layout:** the "More from Omen" grid keeps `sm:grid-cols-2` with one child, so `OmenMiniCard` renders at exactly its previous width instead of stretching to full bleed. That is the minimum-risk visual outcome, not necessarily the right design — a one-item "More from Omen" section is worth a designer's eye.
- **Native untouched.** This is web + backend only.

## Two boundaries held deliberately — both need a founder call

1. **`/api/sleeper/draft*` stays mounted.** It is Sleeper live-draft *tracking*, not Draft Assistant: auth-gated, advertised on no surface, and explicitly protected by the item's own do-not-touch line. It is also what keeps the Privacy **"drafts"** data-collection line truthful — those endpoints do still receive draft data, and removing that line while they run would *understate* collection, which is the worse legal error. If the founder wants the whole draft data path dark for 1.0, that is a second item and the Privacy line moves with it.
2. **No "2027 fantasy draft" marketing line was added.** The 2026-08-14 amendment *permits* one factual mention on the marketing site and one clearly-labelled in-app "not in this version" note. It does not require them, and writing new marketing copy is a founder decision, not a cleanup side effect. The slot is available whenever you want it.

## Skills

Used: `slops-tdd` (RED before GREEN), `slops-repo-inspector` (the sweep that found the `nextUrl.js` allowlist), `slops-ux-copy` + `slops-legal-spot-check` (landing, about, Privacy, Terms). Substituted: `slops-ui-ux-audit` — no new UI shipped, so the audit reduced to a dead-end review, which is what caught the `/draft` redirect and the one-card grid.

**Skill improvement.** The last handoff's lesson — *"when a frontend fix is a decision, move the decision into `lib/` and test it for real; keep source assertions for wiring only"* — was applied too literally at the start of this item and had to be walked back. It is right for **decisions** and wrong for **removals**. When the property under test is that a string is *not reachable anywhere*, a behavioral test can only prove absence at the one call site it exercises; a grep proves it everywhere. The refinement worth codifying:

> Test a removal by absence, over **comment-stripped** source — otherwise the greppable re-activation comments the removal owes to its future self will fail the test that guards it. Reserve real behavioral tests for the parts that genuinely are decisions. Here that was exactly two: the flag failing closed, and the dashboard contract.

The comment-stripping detail is not incidental. The first version of these tests forced a choice between a passing suite and a usable 2027 re-activation trail, and the trail is the more valuable artifact.

## Queue correction (first commit on this branch)

`P1-ConnectContinueRoute` was recorded as `VERIFIED` / "Not pushed or merged" in both `Direction/current_sprint.md` and `Direction/agent_inbox.md`. It had merged as PR #314 / `107ed66` at 2026-08-16T14:55Z — the **sixth** recorded instance of this queue advertising shipped work as pullable, and the second inside a single day. Set to `CLOSED / COMPLETED` with a receipt in `Direction/sprints_completed.md` → "Post-reconciliation closure — 2026-08-16"; the ledger row already existed. The inbox selection is renumbered from 5 items to 4.

The mechanism is now specific enough to automate, and the fix belongs in closeout rather than in a later reconciliation session: **flag any sprint item whose key appears in a merged PR title while its `Status:` is not `CLOSED`.** That check was proposed by the previous reconciliation and not built; it would have caught this instance the moment #314 landed.
