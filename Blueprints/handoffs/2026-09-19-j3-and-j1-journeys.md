# Handoff — J3 and J1 built; four journeys remain

**Date:** 2026-09-19
**Branch:** `claude/j3-first-call`, 21 commits, pushed. Base `feat/u1-canvas-to-code` (`de6e8ee9`).
**Worktree:** `/tmp/omen-j3-claude` — isolated, never shared.
**For:** the session that builds J2, J4, J5 and J6.

## State

| Journey | Screens | iOS | Android | Captures |
|---|---|---|---|---|
| J3 the first call | OmenCall, OmenEvidence, StartSitClear, StartSitIncomplete | done | done | 12 frames, both passes |
| J1 getting in | SignIn, EmailCode, ConnectLeague, EspnConnect, ConnectFailed, CommandNoLeague | done | done | 12 frames, both passes |
| J2 the desk | CommandCenter, CommandQuiet, CommandQuietStraight, SwitchSheet, SwitchLoading | — | — | — |
| J4 settling an argument | TradeBuild, TradeRoster, TradeNeedsContext, TradeVerdict, TradeShare | — | — | — |
| J5 the scout's nest | LeagueTable, LeagueWaiver, LeagueDegraded, LeagueNoRosters, WaiverNoMove, WaiverNotDetermined | — | — | — |
| J6 the receipts | Ledger, LedgerDetail | — | — | — |

Chrome (`Account`, `ReportPill`) is still uncaptured and is not a journey.

## Decisions taken this session — settled, do not re-litigate

1. **The artboard wins by default. Where the built screen is genuinely better, mix the two — then
   redraw the artboard to the merged result.** Step three is the one that gets skipped and it is
   the one that matters: an unrecorded mix becomes drift at the next diff and the next agent
   "fixes" it away. Three artboards were redrawn under this rule.
2. **The E017 header slot carries both controls** — contextual help *and* the account avatar, in
   Command Center's order. That slot appears on 25 of the 30 artboards, so this is settled for
   every remaining journey.
3. **D11 is waived on OmenCall only**, and conditionally: the page had to earn the scroll, which
   it did. Every other screen whose contract declares a fit still binds.
4. **The ESPN consent screen names the two cookies** (SWID, espn_s2). The credential-vocabulary
   ban still covers every other ESPN surface. Naming the **fields** is disclosure; showing their
   **values** stays forbidden by fact-of-record #6. Both halves are pinned by tests.
5. **"ESPN is research-gated" is withdrawn** — corrected in two specs. ESPN's terms still do not
   permit this and the founder owns that risk knowingly; never describe ESPN as approved. What was
   false is only the conclusion that it may not be *built*.

## Read these before starting a journey

The `CLAUDE.md` read order, plus `screen-journeys-v1.md`, `capability-expression-v1.md`,
`capability-symbols-v1.md`, and the 2026-09-18 **and 2026-09-19** decision-log entries.

`Blueprints/specs/mobile/screens/omencall-evidence-contract-v1.md` is the worked example of the
contract shape a screen rework produces.

## Five things that will bite you, from this session

1. **`cmd | tail` returns tail's status.** Two Android steps were reported green here while
   printing `BUILD FAILED`. Use `set -o pipefail` and read the output. This is the same class as
   the "quiet CI means untested" warning the work opened with.
2. **Look at every frame.** One capture came out completely blank and would have shipped as a
   journey's opening image. Another was sent for review five minutes stale, after the fix it was
   missing had landed. Byte size is a cheap blank-frame proxy; freshness needs the timestamp.
3. **Ask what production references a new screen.** Two screens here were captured and
   unreachable — referenced only by screenshot scenarios, on both platforms. No visual review
   asks that question; `grep` does.
4. **Read availability, do not remember it.** A stale comment omitted Yahoo from a provider list
   weeks after its entitlement was granted. Same shape as the ESPN gate. Third time on the record.
5. **When a guardrail blocks a founder decision, scope it — do not delete it.** The
   credential-vocabulary ban was right to exist and wrong to obey on the consent screen. The fix
   was an exemption plus a test pinning both directions.

## Open, carried forward

- **`BE-OmenBriefFalsifier`** (P2, READY) — `what_could_change_this` is absent from the Omen
  decision brief, so the "what would change this" block is deferred on OmenCall. Highest-value
  teaching block still missing.
- **Android's OmenCall card trails its artboard** — no switcher bar, no account control, still
  renders `OmenDecisionBrief`. Android-side `U1`/`U3`.
- **Spacing-scale conflict, unresolved:** `component-lock-v1.md:241` locks nine rungs, registry
  §2.5 and the shipped `OmenSpacing` use fifteen. Everything built here uses values present in
  both, so it is buildable either way — but `V-CanvasConformance` assumes the finer scale.
- **`Brand/brand-system.md` §7 is stale on confidence** — still shows `"74 — Medium-High
  Confidence"` as the good example, which fact-of-record #16 retired. Flagged, not edited.
- **The Android lockup's brass sheen is an approximation** — the source is an elliptical radial
  gradient and Android vector gradients are circular only. A transparent stacked PNG export from
  the Figma vector is the faithful fix.
- **Provider logos do not exist.** Both Figma files were checked: one is a Control Room of text
  cards, the other is Omen's own favicon/wordmark vector work. Neutral `SLPR`/`YHOO`/`ESPN`
  crests stand, which `W1-GATE`'s no-association-branding constraint prefers anyway.

## Gates

```bash
node scripts/check-sprint-staleness.js                        # 13 standing findings, unchanged
node scripts/check-kickoff-drift.js                           # PASS, 13 entries
node scripts/check-valor-brain.mjs                            # 3/3 valid
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet  # DID NOT RUN — no L0 tree here
node ../../Blueprints/tools/valor-brain/validate.mjs           # DID NOT RUN — no L0 tree here
```

**The last two did not run.** This is a standalone worktree with no L0 tree above it, and an
unrun check is not a passing check. Re-run both from an L0 root before treating this branch as
gate-clean.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
