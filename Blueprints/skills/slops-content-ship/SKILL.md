---
name: slops-content-ship
description: QC gate for Omen promo/marketing video content — script, storyboard, footage, voiceover, captions, and whether the piece communicates its goal. The content equivalent of slops-ship. Use before publishing a promo cut, after a render, or when asked to "QC the video/script/footage" or "is this video ready to publish". Does not auto-fix content or publish/post anywhere.
status: active
skill_type: simple
layer: 2
default_agent: Claude
trigger: none
version: 0.2.0
upstream: none
owner: Justin
---

# Slops Content Ship

## Purpose

Content has shipped without a QC gate while code has had one for months (`slops-ship` chaining
`slops-code-review` / `slops-quality-baseline` / `slops-git-flow` / `slops-canary`). This skill is
that gate for video/promo content: a repeatable, six-dimension check that runs the same way every
time a cut is ready for Justin's review, instead of an ad hoc manual pass.

This skill **orchestrates and gates**. It does not rewrite the script, re-shoot footage, re-render
the video, or publish/post anywhere. Fixes route back through the normal build loop; Justin approves
publish.

## When to Use

- A Remotion (or other) promo/marketing video render is ready for review, before Justin watches it
  as final.
- Justin asks to "QC the video," "QC the script/footage/captions," or "is this ready to publish."
- A new cut supersedes a prior one and you need to confirm it actually fixes what the retro flagged.

## Do Not Use

- To write or revise the script itself — that's a drafting task (e.g. `marketing:draft-content`,
  `slops-screenplay-loop`), not a QC pass.
- To capture footage or render the video — that's production work, done before this gate runs.
- To publish, post, or schedule the content anywhere — that authority stays with Justin.
- For in-app UI/UX review — use `slops-ui-ux-audit`.
- For code review — use `slops-code-review`.

## Required Inputs

- The rendered video file (or the most recent still/preview if no render exists yet) and its source
  project (e.g. `Brand/promos/omen-coming-soon/`).
- The approved script/beat-sheet this cut is supposed to match.
- `Brand/brand-system.md` (copy anchors, retired/provisional lines, voice rules).
- Prior retro/decision-log entries for this content line, if any (e.g. `Direction/decision_log.md`
  2026-07-13 promo-video retro) — so this pass checks against known-superseded approaches, not just
  general taste.
- `Blueprints/playbooks/content-usage-ledger.md` (create if absent — see Output Contract).

## Preconditions & Dependencies

None. Reads existing files and the rendered video/stills; no runtime, package, or credential
dependency.

## Read-First Procedure

1. Read the approved script/beat-sheet and the promo project's own docs (e.g. its `README.md`,
   `assets/storyboard.md`, `assets/publish-ready.md`) if present.
2. Read `Brand/brand-system.md` §2 (Copy Anchors) and §7 (Voice and Writing Rules).
3. Check `Direction/decision_log.md` for a prior retro on this content line — do not re-approve a
   pattern that was already logged as superseded (e.g. recreated UI panels over real captures).
4. Read the video source (composition code, caption/timing values) and extract actual frame/timing
   numbers rather than eyeballing the render — timing bugs are numeric, not just a feel.
5. Do not read unrelated app source, secrets, or deployment config — this skill has no reason to
   touch them.

## Process Recipe — Six-Dimension QC

Run all six; do not skip a dimension because another looks fine. Each dimension names the check it
delegates to an existing skill where one already exists — do not reinvent a check that skill already
owns.

1. **Script writing** — copy-anchor compliance (only approved lines from `brand-system.md` §2), no
   retired/provisional lines, correct product-ladder framing (Trade Analyzer → Draft Assistant →
   Omen of the Week). Delegates to `marketing:brand-review` for brand-voice conformance and
   `slops-legal-spot-check` for claims/platform-trademark risk.
2. **Storyboard fidelity** — does the rendered beat order and timing match the approved beat sheet;
   flag any beat that's missing, reordered, or substituted without approval.
3. **Footage** — real app captures vs. recreated/mocked UI. Per the 2026-07-13 retro
   (`Direction/decision_log.md`), recreated UI panels are a known-inferior pattern for this product;
   any recreated panel must be flagged, not waved through. Confirm demo/mock data is labeled, never
   presented as live (`slops-ux-copy`'s no-fake-data-as-real rule).
4. **Voiceover** — if the script specifies spoken VO, confirm actual recorded audio exists in the
   render, not just captions standing in for it. A caption-only cut when VO was scripted is a missing
   production step, not a pass.
5. **Captions** — readability pacing (target ~2.5–3 words/sec on-screen hold time, not just audio
   sync), contrast/motion-reduce (`design:accessibility-review`), and that every caption is a verbatim
   or faithful match to the approved script.
6. **Goal communication** — **cannot be marked PASS from a self-administered check alone.** Claude
   cannot watch video or hear audio; a stills-and-timing review only proxies for this dimension — it
   catches readability, beat order, and caption-to-audio sync, not whether the cut feels alive, well
   directed, or actually persuasive. Run the proxy check (does each segment's on-screen text/timing
   support its intended message, per the stills), but report the dimension as **PENDING HUMAN REVIEW**,
   not PASS, until Justin has actually watched the render and given a verdict. A 2026-07-14 real-world
   case: every prior self-administered pass on this dimension said PASS, and a full human watch then
   surfaced substantial, load-bearing feedback (device framing, animation quality, copy tone, ambient
   energy) that stills-based review had no way to catch — see `notes/prior-use-review.md`.

For each dimension, extract concrete evidence (frame numbers, exact caption text, exact copy-anchor
matched/violated) rather than a subjective impression.

## Output Contract

Produce a severity-ranked findings report (same shape as `slops-code-review`: P0 blocks publish, P1
should fix before publish, P2 can ship and fix later), covering:

- Target path of the cut reviewed.
- Verdict per dimension (pass / fail / partial) with evidence.
- Overall recommendation: ship as-is / fix P0s first / not ready.
- What was intentionally not checked (e.g. no VO existed to check pacing against).
- Next safe step.

Log the run into `Blueprints/playbooks/content-usage-ledger.md` (create with the same table shape as
`Blueprints/playbooks/skill-usage-ledger.md` if it doesn't exist yet: Date | Asset/milestone | Check |
Result | Evidence | Procedure gap / next correction).

This skill never edits the video, script, or render output, and never publishes or posts anywhere.

## Verification

- **Smoke test:** run the six-dimension pass against one existing rendered cut and confirm every
  dimension produces a named piece of evidence (not "looks fine").
- **Success signal:** a findings report exists with a verdict per dimension and at least one entry
  appended to `content-usage-ledger.md`.
- **Escalation:** if a dimension can't be checked (e.g. no VO audio track to assess), say so
  explicitly as "not checked — reason," not a silent pass.

## DBS Routing

- Findings report → `Direction/reviews/` (dated).
- Ledger entries → `Blueprints/playbooks/content-usage-ledger.md`.
- Any doctrine change this pass surfaces (e.g. "recreated UI panels are now disallowed") → propose
  as a `Direction/decision_log.md` entry, do not silently fold it into this skill file.

## Boundaries

- No edits to the video source, render, script, or app code.
- No publish, post, or scheduling authority anywhere.
- No auth, secrets, payment, production, or deployment access — this skill only reads content/brand
  docs and the video project.

## Failure Modes

- Treating "the render completed without errors" as equivalent to "QC passed" — a clean render can
  still fail all six dimensions.
- Skipping the VO/caption-pacing check because the video "looks done."
- Approving recreated UI panels without checking `decision_log.md` for a standing objection to them.
- Giving a vague goal-communication verdict ("communicates well") instead of naming which audience
  segment does or doesn't land.
- Auto-fixing a finding instead of reporting it — fixes are a separate, approved step.

## Prior-Use Review Loop

Check `notes/prior-use-review.md` before revising this skill. Convert repeated corrections into the
smallest durable change (a new dimension, a stricter evidence requirement, a routing fix) rather than
rewriting the whole skill.

## Changelog

- 0.2.0 — Goal Communication dimension can no longer be self-administered to a PASS verdict; requires
  an explicit human-watch confirmation. Correction driven by a 2026-07-14 real case where every prior
  self-check said PASS and a full human watch surfaced substantial feedback stills-review couldn't
  catch — see `notes/prior-use-review.md`.
- 0.1.0 — Initial version. Formalizes the six-dimension manual QC pass run against
  `Brand/promos/omen-coming-soon/renders/omen-all-users-reel-vertical.mp4` on 2026-07-13.
