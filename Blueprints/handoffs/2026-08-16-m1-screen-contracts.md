# Handoff — 2026-08-16 — M1-Screen-Trade + M1-Screen-League (proposal pass)

**Track dependency (audit trail).** This design/doc pass is branched from and depends on the code track `feat/m5-slice-e-ledger` (`cc2fa59`, `M5-Native-API-Client` slice E). They are deliberately separate commits so the design record can be audited without reading a native diff, and separate does not mean independent: the shared queue and ledger files carry both tracks' entries, and this branch's versions of `Direction/current_sprint.md`, `Direction/decision_log.md`, `Blueprints/done/LEDGER.md`, and `Blueprints/playbooks/skill-usage-ledger.md` are **additive on top of** the code track's. Land the code track first; this one is a fast-forward on it.

**Proposal only. Not approved.** A screen contract is not self-ratifying; ratification is founder-only. Figma writes are live in the Design House file `mWjrAKPi4JSIP5lAmGAtB3` (Figma has no "unpushed" state), and the repo changes are local only — not committed to a shared branch, pushed, merged, or deployed.

## The finding that changed the shape of this work

**The wireframes both items asked for already existed.** Before drawing anything I inventoried the file, and found the full M1-P screen body already on the canvas:

| Required by §2 | iOS (04) | Android (05) |
|---|---|---|
| Trade builder — primary + alternate | `41:130` / `41:143` | `41:153` / `41:166` |
| Trade verdict — primary + alternate | `41:176` / `41:192` | `41:202` / `41:218` |
| League standings/activity — primary + alternate | `30:162` / `30:181` | `30:194` / `30:213` |
| Golden — Trade verdict | `38:2` | `39:2` |

All eight required low-fidelity flows exist on both platforms with a primary and an alternate state, and all three golden pairs exist. **This is the eighth recorded instance of the queue describing existing work as work to be done** — and the first in the design lane rather than the code lane, which is why the staleness script could not catch it: it reads sprint keys against merged PR titles, and a Figma frame has no PR.

What was actually missing was the two pages the §4 acceptance gate also requires, both **empty**:

- **`01 — Principles & References`** — the annotated evidence board (source → exact behaviour it may influence → the Omen rule that prevents copying → owner/date).
- **`06 — QA & Evidence`** — the per-screen record of contract links, states, platform differences, open questions, and approval status.

So this pass wrote the missing halves rather than duplicating the frames.

## What changed

| Where | Change |
|---|---|
| Figma `86:2` (page 01) | **New.** References board scoped to these two flows: Apple HIG, Material 3, WCAG 2.2 AA, fantasy-category conventions (observed, never copied), the internal visual briefs, and the shipped backend contracts as a truth check. |
| Figma `87:2` (page 06) | **New.** `M1-Screen-Trade` QA record — frames, contract links, states, intentional platform differences, two open questions, approval status. |
| Figma `88:2` (page 06) | **New.** `M1-Screen-League` QA record — same shape, plus the Draft scope correction and two open questions. |
| Figma `18:7` (iOS) / `18:20` (Android) | **Corrected.** Both M2 app-shell contract frames still listed `Draft` in their top-level destination row. Amended to the 1.0 list with a dated note that the destination is cut from 1.0 and preserved for 2027. |
| `Blueprints/handoffs/frontend-to-backend.md` | Three backend gaps found while writing the contracts, recorded rather than resolved inside a screen. |
| `Direction/current_sprint.md` | Both items carry a dated `Unblock: … ROUTED` line and an `Evidence (proposal, not approval)` pointer. Status stays `READY` with the `FOUNDER_APPROVAL` blocker intact. |

**The Draft correction is worth its own line.** `R7` amended the repo-side app-shell contract on 2026-08-16, which made the Figma copy the stale one — the exact artifact a future implementer would read before building the League screen. It would have re-taught a cut feature. Fixed on both platforms with the amendment visible rather than silently deleted, so the 2027 restore stays greppable.

## Founder decisions — made 2026-08-16, applied

| # | Decision | Applied where |
|---|---|---|
| 1 | Trade verdict's fourth label lands on the **server** — additive `contract_version` + evaluability signal on `POST /api/trade/compare`, derived from the existing `missing_projection_count`. Client-side inference from `confidence: "low"` rejected. | Routed to backend lane; QA record `87:2` |
| 2 | **"Personalize" waits for real league context.** No scoring-format-only affordance ships; slice G's personalized half is blocked until `/compare` accepts league/roster context. Neutral path unaffected. | Routed to backend lane; QA record `87:2` |
| 3 | **The empty activity section is the v1 target.** Both League Primary frames redrawn and renamed "standings live, activity empty (v1)"; the populated composition preserved as a labelled future state (iOS `90:2`, Android `90:8`). | Figma, both platforms; QA record `88:2` |
| 4 | **Off-season standings: clean omission for 1.0.** Prior-season history parked as a future backend capability. | QA record `88:2` |
| — | Three items minted: `M1-QA-EvidenceGate`, `M9-NativeScreenBacklog`, `M10-DesignLaneStaleness`. | `Direction/current_sprint.md` |

**Still outstanding: ratification of the two contracts themselves.** Every frame keeps its `PROPOSAL — AWAITING FOUNDER APPROVAL` badge and slices F and G stay blocked until that happens.

## The questions as originally posed (superseded by the table above)

1. **Trade verdict vocabulary (blocks slice G).** Approved design names four labels; the shipped route emits three (`accept | decline | neutral`) with no representation for *Insufficient data*. Extend the route, or accept that the fourth label is unreachable on native.
2. **What "Personalize" means (blocks the personalized half of slice G).** `POST /api/trade/compare` takes no league or roster context — only `scoring_format`. Either the route gains league context, or native scopes the word "personalized" to scoring format and says so on screen.
3. **The League Primary frame draws an activity feed that does not exist (shapes slice F).** No backend source for "Around the League" exists, and visual briefs §1.6 already ships the Command Center half as an honest empty state. Either treat the populated frame as the future-state target and build the empty state for v1, or redraw Primary as empty and label the populated version as future.
4. **Off-season standings content.** The alternate frame offers prior-season final standings *or* clean omission; `league-standings.v1` supports only clean omission today. Prior-season history is a new backend capability, not a screen decision.
5. **Ratification itself** — both contracts, and the two corrected app-shell frames.

## Remaining §4 acceptance gap for the pass as a whole

The gate is written for the whole M1 pass, not per flow. After this session:

- `01 — Principles & References` exists but is **scoped to Trade and League**. The other six flows' reference influence is still unannotated.
- `06 — QA & Evidence` now holds **2 of 8** flow records. Command Center, Omen lead / Start-Sit, Waiver Analysis, team/league switcher, Account → Connected Leagues, and Welcome/provider connection have none.

That is real, unclaimed work. It is not in either of these two items' `Done when:`, so it was flagged rather than silently absorbed — and is now minted as **`M1-QA-EvidenceGate`**. The four approved-but-unbuilt screens found in the same audit (Waiver Analysis, Start/Sit detail, Ledger detail, team/league switcher sheet) are minted as **`M9-NativeScreenBacklog`**, and the check that would have caught this incident is **`M10-DesignLaneStaleness`**.

## What is NOT proven

- **No founder approval.** Every frame written this session is badged `PROPOSAL — AWAITING FOUNDER APPROVAL — 2026-08-16`.
- **No implementation.** Slices F and G were not started and must not be, per both items' do-not-touch line.
- **No component was created, renamed, or published**, no token was invented, and no competitor layout, asset, or copy was reproduced.
- The pre-existing frames were **read and audited, not redrawn** — their content is the M1-P pass's work, not this session's, and the two open questions above are the only defects this audit found in them.
