# Handoff — 2026-08-16 — P1-DraftAssistantSideline + R7

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
| `src/routes/sleeper.js` | The three `/draft*` route registrations move inside the same flag guard. `/roster` and below untouched. |
| `frontend/src/pages/Privacy.jsx` / `Terms.jsx` | "draft tools" clauses removed; **"drafts"** also dropped from the Privacy collected-data list once the endpoints went dark. |
| `test/sleeperDraftRoute.test.js` | Opts `DRAFT_ASSISTANT_ENABLED=true` so the preserved routes keep their 12 tests green. |
| `frontend/src/lib/nextUrl.js` | `/draft` removed from the redirect allowlist. |
| `Direction/decision_log.md` | New entry with the five-step re-activation path. |

**Nothing is deleted.** Preserved and unreferenced: `src/routes/draftAssistant.js`, `src/services/adp.js`, `src/services/sleeperDraft.js`, `src/services/sleeperDraftAccess.js`, `frontend/src/pages/DraftAssistant.jsx`, `frontend/src/data/privateDemoFixtures.js`. A test asserts each still exists, so a future cleanup pass that deletes them fails loudly rather than quietly costing next season's head start.

**Why the flag fails closed rather than refusing politely.** A 403 or a "feature unavailable" body still confirms the feature exists — which is the exact claim the sideline exists to stop making. Unmounted means absent. Only the literal string `true` enables it; `1`, `yes`, and a blank value all stay off, and that is pinned by test.

## Evidence

- **RED first, twice.** Pass one: `test/draftAssistantSideline.test.js` failed 8 of 10, and the new assertion in `test/dashboardSummary.test.js` failed against the live hardcoded `{available: true, status: "ready"}`. Pass two, after the founder override: the draft-dark assertions failed while `/api/sleeper/draft*` was still registered, and the Privacy assertion failed on the word still being there.
- **GREEN:** full `npm test` **563/563** (549 baseline, +14), `npm --prefix frontend run build` clean, `git diff --check` clean.
- **Local substitute for CI:** this item's `Done when:` cites no CI. Backend `node --test` (~5s) plus the frontend build is the recorded substitute; `pr-quality.yml` runs the same two on the PR.
- **The strongest evidence is the bundle, not the tests.** `frontend/dist/assets/*.js` contains **zero** occurrences of `Draft Assistant`, `draft-assistant`, or `Draft Position`. Once unrouted, the page tree-shakes out of the production build entirely — so it is unreachable, not merely unlinked. A source grep could not have established that.
- **Store/onboarding re-check** (required by `Done when:`): no shipped store metadata or onboarding copy advertises the feature. The store-copy specs carry it only as a *prohibition* with an open `R7` checkbox, and native help copy was already guarded by tests from `M6-ContextualHelp`.

## Costs and limits, stated

- **Not browser-verified.** Nobody loaded `/draft` in a running app to watch the 404. The bundle grep plus the catch-all route assertion stand in for it.
- **`R7` was pulled into this branch** after the re-check turned up live claims in native copy. See its own section below.
- **Landing layout:** the "More from Omen" grid keeps `sm:grid-cols-2` with one child, so `OmenMiniCard` renders at exactly its previous width instead of stretching to full bleed. That is the minimum-risk visual outcome, not necessarily the right design — a one-item "More from Omen" section is worth a designer's eye.
- **Native untouched.** This is web + backend only.

## Founder override, same session — the whole draft path is dark

I flagged two boundaries for review. The founder resolved both, and one reversed my call.

**1. `/api/sleeper/draft*` is now unmounted too.** My argument for keeping it was that Sleeper live-draft *tracking* is a different feature from Draft Assistant — auth-gated, advertised nowhere, and explicitly protected by the item's do-not-touch line. That reasoning was correct and beside the point: **1.0 ships no draft surface at all.** Draft is a 2027 story, not a 1.0 feature with a quiet API left running.

The three routes now register only behind `DRAFT_ASSISTANT_ENABLED`, so they are absent rather than refused — same reasoning as the `/api/draft-assistant` mount. `/roster` and the rest of the Sleeper router are untouched, and that is asserted, not assumed.

**2. The Privacy "drafts" line moved with them — in the opposite direction to my first analysis.** While the endpoints were live, deleting that word would have *understated* collection, which is the worse legal error and is why the first pass kept it. With them unmounted, 1.0 receives no draft data, so keeping it *overstates* collection. Both readings were right for their moment; the lesson is that collection copy and the routes that collect must move together **in both directions**, which the removal site now says in a comment.

**3. No 2027 marketing line** — confirmed, nothing to do.

**`test/sleeperDraftRoute.test.js` opts the flag on explicitly** so the preserved implementation keeps running its 12 tests. Preserved code that silently rots is undeleted, not preserved. That the routes are *absent by default* is proven separately.

**Both directions of the flag are now proven**, which is what makes the re-activation path a demonstrated procedure rather than an assumption:

| `DRAFT_ASSISTANT_ENABLED` | Registered on the Sleeper router |
|---|---|
| unset | `/roster` |
| `true` | `/draft`, `/draft/:draftId`, `/draft/:draftId/state`, `/roster` |

Final numbers after the override: `npm test` **563/563** (549 baseline, +14), frontend build clean, `git diff --check` clean, and the shipped Privacy copy reads `matchups, transactions` in the built bundle.


## R7 — scrub Draft Assistant claims from store metadata and in-app copy

Pulled after the `Done when:` re-check above turned up more than a checkbox.

**The store metadata was already clean.** All three store specs name Draft Assistant only as a *prohibition* with unticked R7 boxes, and the listing is still "Draft for founder review. **Not submitted.**" Nothing to scrub.

**Two false claims were live in shipped native copy, on both platforms** — which R7's `Done when:` covers as in-app copy:

| Claim | Where | Why it is false |
|---|---|---|
| "…plus seasonal **Draft entry**, arrive in the M4-League-Screen slice" | iOS `CommandCenterView`, `ScreenshotScenarios`; Android `OmenAndroidApp` | A forward promise of a cut feature. To a user this reads as "coming soon" — the exact phrasing `CLAUDE.md` prohibits. |
| "Omen will surface relevant **draft** and roster opportunities…" | iOS + Android `OmenCommandCenterScreen`, off-season Waiver Watch | With the draft path dark, 1.0 surfaces no draft opportunities at all. |

**Why the existing ban missed both.** `M6-ContextualHelp` bans the exact product name "Draft Assistant" in *help* copy. Neither string contains it, and neither is help copy. The new tests ban the **word** inside user-facing string literals — the level the claim actually lives at. That is the durable lesson: when a feature is cut, ban the noun and its capability language, not the marketing name in one surface.

**An unrelated leak, found in the same sentences.** Both "landing next" placeholders told users their feature arrives "in the **M4-League-Screen** / **M4-Trade-Screen** slice". A sprint key is not a date, a version, or anything a user can act on — internal planning vocabulary that escaped into the product. Removed from all five sites, and banned by a rule that matches the *shape* of a sprint key, so a newly-minted one cannot slip through either.

**A contract was amended rather than silently overridden.** `omen-native-app-shell-auth-api-contract-v1.md` defined the League destination as carrying a "seasonal Draft entry" — the native copy was faithfully implementing an approved contract that predated the sideline. Governance §3 says stop and flag; the conflict is recorded at §1.4, and the `draft` destination row is **preserved** for 2027 rather than deleted, so its contract survives the sideline. **This is the piece most worth a second opinion.**

### Evidence

- **RED proven on both platforms** by restoring the original strings: iOS named both files and quoted both sentences; Android failed on `State=OffSeason`. Then restored.
- **iOS 192/192** — `xcodebuild test`, **Xcode 26.6, build 17F113**, iPhone 17 Pro simulator (baseline 188, +4).
- **Android 51/51** connected instrumentation on `medium_phone` **API 36** (baseline 50, +1), with `:app:assembleDebug` green.
- **Backend 563/563**, frontend build clean, `git diff --check` clean.
- **Recorded grep** (`Done when:` artifact): `grep -rniE '"[^"]*\bdrafts?\b[^"]*"'` across `mobile/ios/OmenIOS/OmenIOS` and `mobile/android/app/src/main` returns exactly **one** hit — `DesignSystemGalleryView.swift:334` `"Leave draft?"`, a discard-unsaved-work confirmation in the dev-only gallery. Different sense of the word. Sprint-key grep returns none.

### Limits

- **Android's test is narrower than the iOS twin.** iOS scans every string literal under `OmenIOS/App/` from disk; Android asserts the *rendered* semantics tree across the six waiver states, because instrumentation runs on-device where the repo source does not exist and `:app` still has **no JVM unit-test source set** — a pre-existing, founder-gated build-config change, the same limitation recorded for the M5 slice A–C tests. Port the scanner if that source set lands.
- **Screenshots were not regenerated.** `ScreenshotScenarios.swift` copy changed, so any store screenshot built from it is stale until re-captured.
- **No Android render captured** for the changed placeholders — the copy is proven by test, not by eye.

## Skills

Used: `slops-tdd` (RED before GREEN), `slops-repo-inspector` (the sweep that found the `nextUrl.js` allowlist), `slops-ux-copy` + `slops-legal-spot-check` (landing, about, Privacy, Terms). Substituted: `slops-ui-ux-audit` — no new UI shipped, so the audit reduced to a dead-end review, which is what caught the `/draft` redirect and the one-card grid.

**Skill improvement.** The last handoff's lesson — *"when a frontend fix is a decision, move the decision into `lib/` and test it for real; keep source assertions for wiring only"* — was applied too literally at the start of this item and had to be walked back. It is right for **decisions** and wrong for **removals**. When the property under test is that a string is *not reachable anywhere*, a behavioral test can only prove absence at the one call site it exercises; a grep proves it everywhere. The refinement worth codifying:

> Test a removal by absence, over **comment-stripped** source — otherwise the greppable re-activation comments the removal owes to its future self will fail the test that guards it. Reserve real behavioral tests for the parts that genuinely are decisions. Here that was exactly two: the flag failing closed, and the dashboard contract.

The comment-stripping detail is not incidental. The first version of these tests forced a choice between a passing suite and a usable 2027 re-activation trail, and the trail is the more valuable artifact.

## Queue correction (first commit on this branch)

`P1-ConnectContinueRoute` was recorded as `VERIFIED` / "Not pushed or merged" in both `Direction/current_sprint.md` and `Direction/agent_inbox.md`. It had merged as PR #314 / `107ed66` at 2026-08-16T14:55Z — the **sixth** recorded instance of this queue advertising shipped work as pullable, and the second inside a single day. Set to `CLOSED / COMPLETED` with a receipt in `Direction/sprints_completed.md` → "Post-reconciliation closure — 2026-08-16"; the ledger row already existed. The inbox selection is renumbered from 5 items to 4.

The mechanism is now specific enough to automate, and the fix belongs in closeout rather than in a later reconciliation session: **flag any sprint item whose key appears in a merged PR title while its `Status:` is not `CLOSED`.** That check was proposed by the previous reconciliation and not built; it would have caught this instance the moment #314 landed.
