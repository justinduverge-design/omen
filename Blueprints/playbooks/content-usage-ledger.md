# Omen Content-Usage Ledger

## Purpose

Content equivalent of `skill-usage-ledger.md`. Proves which content-QC checks actually ran against a
promo/marketing asset before it shipped, and exposes unused, skipped, or weak checks — so "was this
QC'd" has an evidence trail instead of relying on memory.

## Entry Shape

| Date | Asset/milestone | Check | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|

Use one row per QC dimension run (script, storyboard, footage, voiceover, captions, goal-communication)
or per delegated skill (`marketing:brand-review`, `slops-legal-spot-check`, `design:accessibility-review`,
`slops-ux-copy`). Record a skipped dimension as `SKIPPED` with the reason — never leave it silently
absent from the row set.

## Active Log

| Date | Asset/milestone | Check | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Script writing | PASS (minor) | Approved copy anchors only, correct product-ladder order | Platform-beat caption dropped the differentiating clause ("...not a generic one") present in the approved script |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Storyboard fidelity | PASS | Beat order matches approved beat sheet (Hook→Trade→Weekly→Draft→Platform→Turn→CTA) | n/a |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Footage | FAIL | Trade/Weekly beats are real captures (no recreated UI, per the 2026-07-13 retro doctrine); but `omen-top.png`→`omen-middle.png` crossfade produces an unreadable double-exposure around frame 600 | Render-timing bug, not a content-source bug; needs a timing fix in `src/index.jsx`'s `OmenAllUsersReel` |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Voiceover | FAIL | Script specifies spoken VO; render only has instrumental bed + captions, no recorded VO audio track | Missing production step — VO needs to be recorded/generated and mixed in |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Captions | FAIL | Several captions hold ~92 frames for ~9-10 words (~19 words/sec) vs. ~2.5-3 words/sec broadcast norm | Caption hold-time needs lengthening or copy needs shortening per beat |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (manual pre-skill pass) | Goal communication | PARTIAL | Real product screens land the "what Omen does" signal; but fast captions + no VO mean a sound-off first-time viewer likely misses the multi-segment differentiation the script intended | Depends on fixing captions/VO above before re-checking |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (re-check v2) | Footage | PASS | Fixed `omen-top`/`omen-middle` crossfade to a near-hard cut (frames 610-712 vs 714-832, no overlap window); verified clean via stills at frames 660/720/800 — no double-exposure | Root cause was a second bug found while fixing the first: `TextCard`'s opaque `AbsoluteFill` background wasn't gated on its own enter/exit opacity, painting over the entire video from frame 0 until fixed and re-verified across 8 frames spanning every beat |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (re-check v2) | Script writing | PASS | Platform-beat caption restored to the full approved line: "Yahoo, Sleeper, or ESPN — Omen reads your actual league, not a generic one." | n/a |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (re-check v2) | Captions | PASS | Hold-times rebuilt to ~2.75 words/sec target; confirmed readable via stills across draft/platform/turn cards | n/a |
| 2026-07-13 | `renders/omen-all-users-reel-vertical.mp4` (re-check v2) | Voiceover | FAIL (unchanged) | Still no recorded VO audio — captions-only. Explicitly did not fabricate synthetic placeholder audio to close this, per the standing doctrine against treating placeholder audio as final | Closed in the 2026-07-14 entry below via `slops-voiceover` |
| 2026-07-14 | `renders/omen-all-users-reel-vertical.mp4` (v3 — real VO) | Voiceover | PASS | Real recorded VO generated via `slops-voiceover` (voicebox, Kokoro engine, "Onyx" preset) for all 7 script segments; wired into `OmenAllUsersReel` via `<Sequence>`+`<Audio>` per segment; scene frame timing rebuilt from actual measured WAV durations (59/173/166/134/177/88/113 frames), not an estimate; background music volume ducked to 0.4 so VO reads clearly | First real invocation of `slops-voiceover`; see its own `notes/prior-use-review.md` for the install/generation troubleshooting log (Docker build failure, Windows symlink cache bug, shell-quoting bug during file download) |
| 2026-07-14 | `renders/omen-all-users-reel-vertical.mp4` (v3 — real VO) | Footage | PASS | Re-verified across 12 new frame samples spanning every scene boundary after the full timing rebuild (hook/trade/weekly/draft/platform/turn/end) — all clean, no regressions from the retiming | n/a |
| 2026-07-14 | `renders/omen-all-users-reel-vertical.mp4` (v3 — real VO) | Goal communication | NOT RE-CHECKED | Visual/timing dimensions all verified via stills, but the actual VO audio quality/tone/pacing fit has not been listened to by a human yet — Claude cannot hear audio to self-verify this | Justin to listen and confirm the Onyx voice/pacing actually lands before treating this cut as publish-ready |
| 2026-07-14 | `renders/omen-all-users-reel-vertical.mp4` (v3 — real VO) | Goal communication | FAIL (human review) | Justin watched the full render and gave direct feedback (verbatim transcript in session, summarized here): (1) opening doesn't read as "someone using an app" — no phone/device framing, no spotlight/click-to-open moment; (2) Trade Analyzer scene feels static, wants a live-typing animation for the second player name instead of a static screenshot; (3) trade-result beat should showcase Multi-team, not another two-team trade — also flags Multi-team's UI itself may need a design pass to feel "cooler," a product note beyond video scope; (4) Omen/weekly scene's pan/zoom is too subtle to read as directed movement; (5) the three text-card lines (Draft/Platform/Turn) are "unworkshopped" copy and need a real rewrite; (6) end card should drop "See the result before it happens" — keep only the logo + "Join the waitlist"; (7) overall the video's background/atmosphere feels static/dead for the full runtime, needs motion throughout | This is the first real human goal-communication verdict on this asset — every prior PASS on this dimension was Claude's own self-assessment via stills, which clearly missed the "feels alive," "feels like a real app," and copy-quality gaps a full watch surfaces. Next pass needs: (a) new opening treatment (device-framing + spotlight + click), (b) a typing-animation build for the trade-send beat, (c) a captured multi-team trade result screenshot, (d) stronger directed pan on the weekly beat, (e) rewritten copy for 3 text cards, (f) end-card copy trim, (g) an ambient-motion pass across the whole background — logged as open items, not yet actioned |
