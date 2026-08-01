# M4-CC-WaiverWatch — Figma §3.2 Proposal Pass

**Date:** 2026-07-31
**Authority:** ATA-20260731-05 — Figma proposal creation only; no implementation code until founder-approved.
**Figma file:** Omen Native Design House (`mWjrAKPi4JSIP5lAmGAtB3`), page `03 — Components` (`1:4`).
**New node:** `67:2`, "PROPOSAL — Waiver Watch".

## What this is

A Figma component proposal for the Waiver Watch composition, matching the existing proposal template already on `03 — Components` (Context Strip `25:2`, Matchup Spine `25:26`, Evidence Disclosure `25:50`, Help + Support `61:2`) — same dark surface, section structure (Anatomy, Variants & States, Tokens, Accessibility, iOS/Android expression, Source citation), and typography (Alegreya Sans / DM Mono).

**Status badge deliberately reads "PROPOSAL — awaiting founder review, submitted 2026-07-31"**, not "APPROVED COMPOSITION" like the four existing frames — this proposal has not been reviewed yet, and the badge must not imply otherwise. Border color is neutral gray, not the green used on the approved frames.

## Content source

Directly from `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §1.3 ("Waiver Watch — approved", founder-approved as Markdown by Justin 2026-07-20) — this pass turns that already-approved Markdown brief into a Figma proposal, which is a separate approval gate per `omen-native-design-house-v1.md` §8 ("a visual pattern begins as a proposal on `03 — Components`; it does not appear first in production code") and `omen-native-agent-capabilities-canvas-v1.md` §6 ("a Figma edit without a linked contract/PR is a proposal, not approved scope").

Sections cover: the two layout modes (Tue-Wed urgent briefing with Best Move + optional Long-Horizon rows; Thu-Mon calm ranked list), the six required states with their exact copy (Pending, Processed, Availability unknown, No credible move, Not connected, Off-season), token usage (reusing existing surface/border/text/brass/focus-ring roles — no new tokens invented, no risk/danger color since this is opportunity framing), accessibility behavior, and iOS/Android platform expression notes.

## What did NOT happen

- No component was marked approved. No existing approved proposal (Context Strip, Matchup Spine, Evidence Disclosure, Help + Support) was touched.
- No native code (SwiftUI/Compose) was written — that stays gated behind your review of this Figma node per M4-CC-WaiverWatch's `Blocked by:` line.
- No fabricated waiver deadlines or provider data — the proposal explicitly documents that the deadline must come from verified `waiver_deadline_at` data, matching the brief.

## Approved — 2026-07-31

Justin approved the composition. Badge updated in Figma to "APPROVED COMPOSITION — Justin, 2026-07-31" (matching the other four approved proposal frames); outer frame border switched from neutral gray to the approved-green stroke; frame renamed "PROPOSAL — Waiver Watch (Approved)". `M4-CC-WaiverWatch`'s `Blocked by:` line in `current_sprint.md` is now `None` — the item is ready for native implementation planning (no trust assignment yet covers writing SwiftUI/Compose code for it; that's a separate future ask).
