# M1-P — Figma Screen-Contract Pass — 2026-07-20

## Task ID and scope

M1-P (P2-gating step) — the full `m1-figma-screen-contract-pass-v1.md` pass. Started scoped to `01 — Principles & References` + the three `03 — Components` proposals (Context Strip, Matchup Spine, Evidence Disclosure); Justin then approved continuing through the full pass in the same session: `04`/`05` low-fidelity screen contracts for all 8 required flows, 3 high-fidelity golden-screen pairs, and the `06 — QA & Evidence` board. This handoff covers the complete pass, staged for founder review per the acceptance gate in `m1-figma-screen-contract-pass-v1.md` §4.

## Outcome

Built in Figma file `mWjrAKPi4JSIP5lAmGAtB3` ("Omen Native Design House"):

- **`01 — Principles & References`** (page `1:2`) — new frame `23:2` "Omen Native Reference Library": authority-order card, six approved-implementation-reference cards (Apple HIG, Apple tab bars, Apple sheets, Material 3, Compose accessibility, WCAG 2.2), fantasy-product observation policy (ESPN/Yahoo/Sleeper, allowed-observation vs never-copy), and the agent citation rule. Transcribes `m1-native-reference-library-v1.md` verbatim into an inspectable board; no new claims invented.
- **`03 — Components`** (page `1:4`) — three new proposal frames alongside the existing approved registry frame (`14:2`), each visibly badged `PROPOSAL — NOT APPROVED — NOT IN REGISTRY` in crimson, with brass-outlined chrome (vs. the approved registry's neutral border) so the distinction is unmistakable on the canvas itself:
  - `25:2` **Context Strip** — anatomy, variants/states (connected, recovery, empty, multi-team), tokens, accessibility, iOS/Android expression, source citation.
  - `25:26` **Matchup Spine** — anatomy, temporal variants (before/live/final/off-season + narrow-width behavior), tokens, accessibility, iOS/Android expression, source citation.
  - `25:50` **Evidence Disclosure** — anatomy (collapsed/expanded), variants (clear/close/unavailable/incomplete/started/off-season decision states), tokens, accessibility, iOS/Android expression, source citation.
- **`04 — iOS Screens`** (page `1:5`) and **`05 — Android Screens`** (page `1:6`) — low-fidelity wireframe contracts, each with a primary + alternate state, placed alongside the pre-existing M2 app-shell contract frames (`17:12`/`17:13`). Originally built as 8 flows with two compound-named flows compressed into stacked-stage wireframes; **Justin rejected the compression 2026-07-20** and both were rebuilt as fully independent screen contracts, bringing the total to 10 screen types:

  | Screen | iOS primary / alt | Android primary / alt |
  |---|---|---|
  | Command Center | `28:2` / `28:21` | `29:2` / `29:21` |
  | Omen lead (This Week's Omen) | `41:2` / `41:24` | `41:34` / `41:56` |
  | Start/Sit detail | `41:66` / `41:85` | `41:98` / `41:117` |
  | Waiver Analysis | `30:2` / `30:24` | `30:37` / `30:59` |
  | Trade builder | `41:130` / `41:143` | `41:153` / `41:166` |
  | Trade verdict | `41:176` / `41:192` | `41:202` / `41:218` |
  | League matchup + standings/activity | `30:162` / `30:181` | `30:194` / `30:213` |
  | Team/league switcher sheet | `30:226` / `30:245` | `30:258` / `30:277` |
  | Account → Connected Leagues | `30:290` / `30:306` | `30:322` / `30:338` |
  | Welcome/provider connection | `30:354` / `30:367` | `30:383` / `30:396` |

  Each block within a screen names its approved component/proposal and cites the source content verbatim from the visual briefs; no high-fidelity one-off component was built in a wireframe, per spec §2. The original combined "Omen lead + Start/Sit detail" and "Trade builder + verdict" frames (former node IDs `29:40`/`29:73`/`29:91`/`29:124` and `30:72`/`30:99`/`30:117`/`30:144`) were deleted, not just superseded — they no longer exist in the file.

- **4 golden-screen pairs** (high-fidelity, paired iOS/Android, in a dedicated column at `x=2700` on pages `04`/`05`) — also split per the same founder decision, one more pair than the spec's literal "3 golden pairs":

  | Golden screen | iOS | Android |
  |---|---|---|
  | Command Center | `31:2` | `34:2` |
  | Omen lead | `42:2` | `42:34` |
  | Start/Sit detail | `42:66` | `42:97` |
  | Trade verdict | `38:2` | `39:2` |

  Each uses real token colors/hierarchy (not wireframe placeholders), with platform-native chrome differences: iOS tab bar with dot active-indicator vs Android bottom navigation with filled pill active-indicator (Material 3 vs HIG expression). Icon glyphs are text-label placeholders only — real iconography is a later production-asset step. The original combined "This Week's Omen / Start-Sit" golden pair (former node IDs `35:18`/`37:2`) was deleted. Trade builder has no golden pair — golden coverage remains scoped to Trade verdict only, unchanged from the original 3-item golden list.

- **`06 — QA & Evidence`** (page `1:7`, frame `40:2`) — one entry per screen (10 low-fi flows + 4 golden pairs = 14 entries), each with contract/brief citation, exact Figma node references, primary/alternate state description, platform-difference notes, open questions/deviations, and founder-approval status (all still marked `PENDING` for review — the founder decisions below resolved specific open questions, not the overall pass approval).

All content is sourced from `omen-mobile-visual-briefs-v1.md` (§1, §4–§11, §14, §16), `m1-native-reference-library-v1.md`, `m1-native-primitives-enforcement-v1.md`, and `omen-native-design-system-registry-v1.md`. No invented visual pattern; no external-research-only additions (citation rule self-applied).

## Build issues found and fixed during the golden-screen pass

Two Figma Plugin API bugs surfaced while building the golden screens (all caught via in-workflow `screenshot()` verification before moving on, per the `figma-use` skill's incremental-build discipline):

1. **Default-white fills bleeding through unfilled auto-layout containers.** `figma.createAutoLayout()` defaults to a white fill; any container left without an explicit `fills` assignment showed as a white block against the dark theme. Fixed by explicitly setting `fills=solid(BG)` on every auto-layout container, not just the visually-styled cards.
2. **Fixed-width columns collapsing to a stale height.** A `resize(width, 10)` call to set a column's fixed width also locked its height at the placeholder `10`, clipping all content — `counterAxisSizingMode='AUTO'` on the frame itself did not override the child's `layoutSizingVertical`, which remained implicitly `FIXED` at 10px. Fixed by explicitly setting `layoutSizingVertical='HUG'` on the child after resizing. Both fixes are visible in the corrected golden Command Center (iOS `31:2`, rebuilt in place) and were applied proactively in every subsequent golden-screen build.

Both issues were self-contained to this session's script authoring (not a `figma-use` skill defect) and were resolved via the tool's atomic-failure/read-fix-retry pattern before any downstream screen was built on the broken pattern.

## Founder decisions applied mid-review (2026-07-20, same session)

Justin reviewed the flagged open questions from the first pass and gave two decisions, both applied before this handoff was finalized:

1. **No to the stacked-stage compression.** "Omen lead + Start/Sit detail" and "Trade builder + verdict" are now four independent screen contracts (10 total low-fi screens, up from 8) and four golden pairs (up from 3) — see the updated tables above. The combined frames were deleted outright.
2. **Auth-provider label is mechanism-based, not platform-based.** The Account → Connected Leagues Android wireframe (`30:322`) was corrected from "Signed in with Google" to "Signed in with Apple," matching the iOS wireframe, since the underlying sample account's chosen mechanism doesn't change by device. This is now a resolved rule recorded in the `06` QA entry, not an open question.

Both decisions are logged in `Direction/decision_log.md` under "Decisions Added 2026-07-20 (M1-P Figma screen-contract pass — founder review)."

## Final approval (2026-07-20, same session)

Justin approved the full pass after reviewing the resolved decisions above. Applied in Figma: all 3 `03 — Components` proposal badges changed from `PROPOSAL — NOT APPROVED — NOT IN REGISTRY` (crimson) to `APPROVED COMPOSITION — Justin, 2026-07-20` (verdigris), nodes `25:2`/`25:26`/`25:50`; all 14 `06 — QA & Evidence` entries changed from `PENDING` to `APPROVED — Justin, 2026-07-20`, node `40:2` and children. Applied in markdown: `omen-native-design-system-registry-v1.md` §3.2 now lists Context Strip, Matchup Spine, and Evidence Disclosure as approved compositions with a pointer back to their Figma anatomy. **M1-P P2 (shared foundation primitives) and P3 (first Omen compositions) are unblocked** — see `Direction/current_sprint.md` for the next pull.

## Evidence discrepancy found and resolved mid-task

Session opened with a false alarm: an initial `get_metadata` call (no `nodeId`) on the file returned only page `00 — Start Here`, which read as "the M1-F/M2-F foundation boards (`13:2`/`14:2`/`17:12`/`17:13`) are missing." This was logged as a discrepancy in `Direction/decision_log.md` and `Direction/known_issues.md`. A follow-up `use_figma` read of `figma.root.children` showed all seven pages and all four foundation boards are present exactly as the registry claims — **no rebuild was needed**. Both log entries were corrected in place before proceeding; see the "Note Added 2026-07-20 (false-alarm correction)" decision-log entry and the corrected known-issues note. Lesson recorded: enumerate Figma pages via `use_figma`/`figma.root.children`, not `get_metadata` with no `nodeId`, before concluding content is missing.

## Skills used, skipped, substituted

- **Used:** `slops-repo-inspector` (kickoff read chain), Figma `figma-use` skill (mandatory before any `use_figma` call — loaded and cited in every `skillNames` param), `slops-context-markdown` (this handoff + decision log + known issues).
- **N/A:** `slops-tdd`, `slops-quality-baseline`, `slops-code-review` — no app source touched. `slops-mobile-smoke` — no running app surface. `slops-ui-ux-audit` — informal visual QA was done via in-workflow screenshots against the existing approved board's grammar; a formal audit pass is more appropriate once golden screens exist (M1-P P2 continuation).
- **Skill improvement:** none needed for `figma-use`; one procedural gap found and corrected in this session's own working method (see discrepancy note above) rather than in a skill file.

## Files changed

- `Direction/decision_log.md` — discrepancy entry, then correction entry.
- `Direction/known_issues.md` — discrepancy note, then correction note.
- `Blueprints/handoffs/2026-07-20-m1p-figma-reference-and-proposals.md` (this file).
- Figma file `mWjrAKPi4JSIP5lAmGAtB3`: new frames `23:2` (page `1:2`), `25:2`, `25:26`, `25:50` (page `1:4`). No other node mutated. No repo source code changed.

## Do-not-touch boundaries honored

No Figma library publish. No semantic token invented or renamed. No production component created — all three are explicitly marked unapproved proposals. No competitor layout/asset/copy copied (citation rule self-applied; observation policy transcribed, not violated). No provider account, secret, real league data, or store account touched.

## What this is not

Not a founder-approved pass. Per `m1-figma-screen-contract-pass-v1.md` §4, the pass is "ready for founder review" once all eight low-fi flows, three golden pairs, and full annotation exist — that condition is now met, but nothing in this pass is approved. The three `03` compositions remain proposals until Justin reviews (tracked as a spawned follow-up task: "Update registry with 01/03 Figma node IDs after M1-P pass"). No SwiftUI/Compose primitive code (M1-P P2/P3) may start until this pass is approved and, separately, the registry is updated.

## Next recommended step

1. Justin completes final review of the full pass in Figma: `01 — Principles & References`, the three `03` proposals, all 10 low-fi screen contracts on `04`/`05`, the 4 golden-screen pairs, and the `06 — QA & Evidence` board. The two previously-flagged open questions (stacked-stage compression; Account auth-label default) are now resolved per the decisions above — remaining review is a straight approve/revise pass, not open-question triage.
2. On approval: update `omen-native-design-system-registry-v1.md` §3.2 to add Context Strip, Matchup Spine, and Evidence Disclosure as approved compositions, and record the golden/wireframe node IDs (spawned task `task_4251ff0c` is queued for the registry-note update).
3. Only after both approvals: M1-P P2 (shared foundation primitives) and P3 (first Omen compositions) may begin in SwiftUI `DesignSystem` and Android `core:designsystem` modules.
