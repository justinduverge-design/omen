# Codex/Claude Code Prompt — All-Users Reel Feedback Polish

**Date:** 2026-07-14
**Target:** `omen-all-users-reel-vertical.mp4`, built from `Brand/promos/omen-coming-soon/src/index.jsx`'s
`OmenAllUsersReel` composition.
**Source of truth for this list:** `Blueprints/playbooks/content-usage-ledger.md` 2026-07-14 human-review
entry (7 items) + this session's audio-mix note (item 8) + voice-preset swap (item 9, blocked on D2).
**Do not build items 3 and 8 yet — both need an input this prompt doesn't have.** See notes below each.

Read `Direction/content-strategy.md`, `Blueprints/specs/omen-character-spec.md`, and
`Blueprints/specs/short-video-format-spec.md` before touching copy or pacing — this reel is the proven
tier-3 format and should stay inside those specs.

## Fix list

1. **New opening treatment.** Current opening doesn't read as "someone using an app" — no device/phone
   framing, no spotlight or click-to-open moment. Build a device-framing shot (phone mockup or
   equivalent) with a spotlight/click-to-open beat before the hook copy appears. Reuse whatever
   phone-frame asset conventions exist elsewhere in the brand system if any; if none exist, a simple
   rounded-rect device frame + a single spotlight/vignette pass is enough — don't over-build this.

2. **Trade Analyzer beat — live-typing animation.** Currently a static screenshot for the second player
   name. Build a typing-animation effect (character-by-character reveal, cursor blink optional) into
   that beat instead of the static capture. Keep the surrounding screenshot real (per the standing rule:
   real captures, no recreated UI) — only the typed name needs to animate.

3. **Multi-team trade result beat.** **BLOCKED — do not build yet.** Justin confirmed (2026-07-14) no
   multi-team trade result screenshot exists yet; one needs to be captured from a real connected league
   first. Do not fabricate or mock this — wait for the real capture. Flag back if this item is reached
   before the capture exists.

4. **Weekly/Omen beat — stronger directed pan.** Current pan/zoom on the Omen-of-the-week beat is too
   subtle to read as intentional camera movement. Increase pan distance/speed or add a clear directional
   arc so it reads as directed, not drifting.

5. **Rewrite three text-card lines** (`src/index.jsx` lines ~1394-1396, `TextCard` components at `S4`,
   `S5`, `S6`):
   - **Draft (S4) — CONFIRMED, use this exact line:** `Draft day panic? Omen already read the board.`
     (replaces `Getting ready to draft? Omen reads the board so you don't have to.`)
   - **Platform (S5) — proposed, confirm before locking:** `Yahoo. Sleeper. ESPN. Omen reads your real
     league — not a demo.` (replaces `Yahoo, Sleeper, or ESPN — Omen reads your actual league, not a
     generic one.`) Keeps the same differentiating claim, tightened to match sports-media pacing.
   - **Turn (S6) — proposed, confirm before locking:** `Omen catches what your gut misses.` (replaces
     `The edge is in what you almost missed.`) If this doesn't land, the original line is an acceptable
     fallback — it wasn't factually wrong, just flagged alongside the other two as unworkshopped.
   - Run all three through `Blueprints/specs/social-satire-boundaries.md` §2 before locking (should
     trivially pass, but don't skip the check).

6. **End card trim.** Drop the line "See the result before it happens." End card should be logo +
   "Join the waitlist" only — nothing else.

7. **Ambient motion pass across the full background.** Reel currently reads static/dead for its whole
   runtime. Add a subtle continuous background treatment (slow gradient drift, particle/grain motion, or
   similar low-cost ambient movement) that runs under every beat, not just the discrete per-beat
   animations already present. Keep it subtle enough not to compete with foreground captions/UI.

8. **VO/music mix balance.** **BLOCKED — needs a live listening session, not a blind code change.**
   Justin flagged (2026-07-14): music too loud vs. VO, AND levels inconsistent across the 7 segments —
   not a single uniform gain problem. Do not guess at a fix. Next real session: play back each segment,
   identify which specific segments are loud/quiet relative to VO, then adjust per-segment gain/ducking
   in the Remotion `<Audio>` volume props rather than a single global change.

9. **VO voice preset swap.** **BLOCKED on `current_sprint.md` D2** — waiting on Justin to browse
   `GET /profiles/presets/kokoro`'s 50 options (or approve a cloud-TTS alternative) with voicebox running
   locally. Once D2 lands a preset name, re-run `slops-voiceover`'s Process Recipe for all 7 script
   segments and rebuild scene frame timing from the new measured durations (same discipline as the
   original VO build — do not reuse old timing with new audio).

## Order of operations

Build 1, 2, 4, 5, 6, 7 in this session (all unblocked). Leave 3, 8, 9 as open follow-up items — do not
attempt workarounds for any of them.

## Verification

Full `slops-content-ship` six-dimension re-check after 1/2/4/5/6/7 land, logged as a new row set in
`content-usage-ledger.md`. Goal-communication still needs Justin's actual watch, not a self-administered
stills check (per that skill's own `notes/prior-use-review.md`).

## Done-when

Items 1, 2, 4, 5, 6, 7 built and re-verified; items 3, 8, 9 explicitly left open with their blockers
restated in the handoff, not silently dropped.
