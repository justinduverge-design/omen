# M4-CC-PlatformsCompact — Figma §3.2 Proposal Pass

**Date:** 2026-08-01
**Authority:** ATA-20260801-02 — Figma proposal creation only; no implementation code until founder-approved.
**Figma file:** Omen Native Design House (`mWjrAKPi4JSIP5lAmGAtB3`), page `03 — Components` (`1:4`).
**New node:** `73:2`, "PROPOSAL — Platforms Compact Row". Status badge reads "awaiting founder review" (not approved).

## Content source

`Direction/current_sprint.md` M4-CC-PlatformsCompact — driven by your 2026-07-23 feedback that the current `OmenPlatformConnectionCard` takes too much vertical space above the fold on iPhone SE. Target shape matches your own spec exactly: `[PlatformBadge] Sleeper · Connected · 4m ago  ›` connected, `[PlatformBadge] Yahoo · Not connected [Connect]` disconnected, Manage/Connect moved into a tap-through detail sheet, whole strip capped at ~2 row-heights.

**Deliberately reuses the existing `OmenConnectionStatus` enum** already shared by `ConnectionStatusBadge` and `PlatformConnectionCard` (from the 2026-07-22 decision-log entry) rather than inventing a second status vocabulary — the detail sheet is explicitly the *existing* `PlatformConnectionCard` content moved off the main surface, not new UI.

## What did NOT happen

No component was marked approved. No live provider connect flow, credentials, or deep-link config appears in the proposal — this is purely a layout/composition change to already-existing data.

## Approved — 2026-08-01

Justin approved the composition. Badge updated to "APPROVED COMPOSITION — Justin, 2026-08-01"; outer frame border switched to the approved-green stroke; frame renamed "PROPOSAL — Platforms Compact Row (Approved)". `M4-CC-PlatformsCompact`'s `Blocked by:` line is now `None` — ready for native implementation planning (no trust assignment yet covers writing the code).
