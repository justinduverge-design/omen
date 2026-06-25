# Phase 1.10A — UX Copy Options Packet

**Date:** 2026-06-25
**Status:** Decision packet only — no source changes in this item. Justin picks; Phase 1.10B applies the pick(s).
**Skill used:** `slops-ux-copy`, grounded in `Brand/brand-system.md` (updated 2026-06-22) + `Blueprints/specs/omen-ux-ui-design-system-v1.md`.

## Heads-up before you read the options

- `Brand/brand-system.md` §2 explicitly **retired** `Less guessing. Better moves.` with the Omen rename (2026-06-22). It was floated as a candidate in `current_sprint.md`'s Phase 1.10A line — that line is stale. None of the options below use it.
- The banned line **"Know the move before you make it."** isn't only on `OmenLanding.jsx` (the named target) — it's also the live homepage hero on `Landing.jsx:572-574` ("Know the move / before you make it."), word-for-word. Same violation, two files. Option set (c) below covers both so you can fix them together instead of leaving one live.
- Item (a) has no existing copy — there's no offseason empty state built yet. These are new options, not a rewrite.

---

## (a) `/omen` offseason empty state

**Surface:** `OmenPage.jsx`, rendered via the `EmptyState` component (same shape as the existing `pending_live_engine` state: `eyebrow` / `title` / `message`). No recommendation, confidence, or risk to surface here — this is a quiet-room state, not a decision moment.

**A1 — recommended**
- eyebrow: `Omen of the Week`
- title: `Omen is resting.`
- message: `No games on the board right now. Omen wakes up again once your season opens.`

**A2**
- eyebrow: `Omen of the Week`
- title: `Nothing to call yet.`
- message: `The season's quiet. Omen will have a move ready the week games resume.`

**A3**
- eyebrow: `Omen of the Week`
- title: `Off-season. Omen's still watching.`
- message: `No live matchup to weigh in on. Check back once your league's season opens.`

**Why A1:** Shortest title, matches the brand-personality line "Omen knows the answer before you ask... then it stops" — economy of words even in an empty state. "Resting" carries the oracle/dormant mythology (§6) without overclaiming or apologizing (§7 empty-state rule). No anchor-line conflict — this isn't a marketing placement.

---

## (b) `/onboarding` "You're ready" success step

**Surface:** `Onboarding.jsx:297-309`, final step. Current copy:
> h2: "You're ready."
> p: "League connected. Omen will surface your best move when the season opens. Check back each Tuesday after your roster locks."

This is already short and direct — not broken, just generic. Each option keeps the two real facts (league connected, Tuesday cadence after lock) and sharpens the headline.

**B1 — recommended**
- h2: `You're set.`
- p: `League connected. Omen reads the matchup the moment your roster locks — your first call lands Tuesday.`

**B2**
- h2: `Omen sees you now.`
- p: `Your league is connected. Once games lock each week, Omen will have your move ready — usually by Tuesday.`

**B3**
- h2: `You're ready.`
- p: `League connected. Your first recommendation arrives once the season opens — check back Tuesdays after lock.`

**Why B1:** "You're set" is just as short as the original but the paragraph now names the mechanism (roster lock triggers the read) instead of a flat status report — closer to "lead with the move, not the reasoning" (§7) applied to a confirmation instead of a recommendation. No accuracy issue: Tuesday cadence is the designed cadence regardless of the current launch-time cron gate (`OMEN_CRON_SCORING_ENABLED=false`); this copy describes steady-state behavior, not today's ops state.

---

## (c) Hero headline — replace "Know the move before you make it."

Banned per `Brand/brand-system.md` §2: implies the user already has the right answer; Omen tests the instinct, it doesn't flatter it. Two live locations:

| File | Eyebrow | Current headline |
|---|---|---|
| `frontend/src/pages/Landing.jsx:567-575` | "Omen · Fantasy Intelligence" | "Know the move / before you make it." |
| `frontend/src/pages/OmenLanding.jsx:113-118` | "Omen · Trade Analyzer" | "Know the move before you make it." |

**C1 — recommended for `Landing.jsx` (main homepage hero)**
> `See the result before it happens.`
This is brand-system's **primary marketing line**, explicitly scoped to "Homepage hero, ads, short public-facing copy. Core brand promise." Exact anchor match — no adaptation needed.

**C2 — recommended for `OmenLanding.jsx` (Trade Analyzer demo page)**
> `See the move before the league does.`
This is the **approved alternate**, explicitly scoped to "stronger competitive fantasy-football feel" — fits this page better than the primary line since the audience here is actively comparing a trade against league rivals, not just landing on the brand.

**C3 — alternate pairing (either page)**
> Headline: `See the result before it happens.`
> Subhead: `The edge is in what you almost missed.`
Stacks the primary line with the **secondary line** (scoped to "subheads, feature sections, moments where Omen catches hidden risk or overlooked opportunity"). Use if you want the subhead to carry more than the current factual copy ("No account required...").

**Why C1/C2 over C3:** brand-system.md scopes each anchor to a specific placement; C1 and C2 each use the anchor in its intended slot with zero rewriting risk. C3 is the right call only if you also want the subhead to change — otherwise it's two changes where one suffices.

---

## Open question for you

Fix both headline locations (Landing.jsx + OmenLanding.jsx) in the same Phase 1.10B pass, or just the one Phase 1.10A named? Recommend both — leaving either live keeps a brand-banned line in production.
