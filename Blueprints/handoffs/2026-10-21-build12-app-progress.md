# Build 12 app build — progress

**Branch:** `claude/build12-app` (from `main` at `7ab5c920`).
**Authority:** `Blueprints/specs/design/omen-design-foundation-v1.md` (approved 2026-10-21) and the frames
in `design/foundation-v1-canvas/`. Read both before touching a screen. A new session resumes from the
first unticked box below, with these rules, not from a conversation summary.
**Parked earlier work to reuse where it fits the spec:** `claude/build12-redesign` (trade builder, player
page, Omen call layout, desk team list). Reuse is allowed only if the result passes the gate.

## The gate (every screen, no exceptions)

A screen is done only when all of these hold, and the evidence is linked next to its box:

1. Matches its frame in dark and light, on iPhone 17 Pro and iPhone SE (screenshots in
   `output/screens/build12/`).
2. Every state the screen can reach is shown: loading, empty, error, reconnect, demo where relevant.
3. Composed only from the foundation patterns (spec § 5). No screen-level colours, fonts, spacing or
   hand-drawn controls. `PrimitiveEnforcementTests` passes.
4. Navigation matches the map (NavMap frame): its back control, swipe-back, sheet dismissal.
5. Accessibility audit clean: 44pt targets, Dynamic Type at the largest size, VoiceOver order, contrast.
6. A fresh review agent compared it to its frame and the spec and found no P0 or P1.
7. Unit tests and the screen's screenshot scenario pass.

## Foundation (built and reviewed before any screen, then frozen)

- [ ] Colour tokens match spec § 7 (dark and light), including `omenChip` for green words
- [ ] Type roles: heroNumber, screenTitle, sectionHeader, body, quiet, eyebrow
- [ ] Back control · section header · state block (hold, nothing worth doing, not enough, failed)
- [ ] Player row (browse, compare, pick) · player badge (team colour, number, position)
- [ ] Team crest · provider mark · account avatar (initials)
- [ ] Omen read block · start/sit pair · stat grid · accent lip surface
- [ ] Sheet chrome (grabber, Close/Done, unsaved-input confirm) · bottom dock
- [ ] Team Rolodex · pinned score · team control ("ESPN · Titans ▾")
- [ ] Foundation review by a fresh agent; then frozen

## Screens

In the app: Desk · Omen call · Omen call (trade) · Full argument · Player · Trade chooser · Find a trade ·
Trade builder · Verdict sheet · Trade share · Three-team · Judge an offer · League · Waivers · Ledger ·
Ledger receipt · Account · Privacy and data · Data sources · Delete account · How Omen makes a call ·
Support / report · Team switcher

Getting in and edges: Welcome · Email code · Connect · League pick · Connect failed · Passkey offer ·
Forced update · Desk with no league · Demo · Rosters unreadable · States (loading, hold, reconnect, offline)

| Screen | Frame | Built | Gate 1-7 | Reviewer | Evidence |
|---|---|---|---|---|---|
| (filled in as each screen passes) | | | | | |

## Whole-app pass

- [ ] Every screenshot side by side; drift between screens listed and fixed
- [ ] Remove the screens and components the new ones replace (list each in the PR)
- [ ] Fresh-agent review of the whole diff; PR; CI green; on the founder's phone
