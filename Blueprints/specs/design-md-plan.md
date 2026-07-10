---
valid-as-of: 2026-07-08
status: superseded — see Direction/current_sprint.md "Design docs" lane
superseded-by:
  - slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md (three-room mapping)
  - slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md (per-team token contract + three tests)
  - slops-saloon/Blueprints/specs/teams/README.md (per-team design.md authoring cadence + naming)
  - slops-saloon/Blueprints/specs/teams/_batch-tracking.md (per-team rollout status)
owner: Claude (planning) + Justin (approval)
depends-on:
  - Brand/brand-system.md
  - Blueprints/specs/omen-ux-ui-design-system-v1.md
  - Blueprints/specs/team-motif-grammar.md
  - Blueprints/specs/page-system.md
  - Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md
  - Blueprints/audits/2026-06-21-phase1-5f-palette-completeness-gap.md
  - Blueprints/audits/2026-06-21-phase1-5g-trademark-review.md
  - Blueprints/audits/2026-06-21-phase1-5f-two-axis-wcag-sweep.md
source-research: notebooklm-exports/design-md-notebook.md (50-source research pull, 2026-07-08)
---

# design.md Plan — Omen Team Identity System

> **Superseded, 2026-07-08 (same day, later session).** This plan was written without visibility into `Direction/current_sprint.md`'s existing "Design docs" lane, which already answers the open question below — and answers it the other way. The approved architecture is **many scoped `design.md` files**, not a single root file: per-team (`slops-saloon/Blueprints/specs/teams/[team-slug]-design.md`), per-room-mode, per-page-family, and per-component, all authored through `design-md-author` per `slops-saloon/Blueprints/specs/teams/README.md`. Priority-tier team work (Eagles/Cowboys/Chiefs) already has stub reference files and a batch-tracking sheet. Kept below for its research-mapping value (which existing doc feeds which design.md section) — do not use the "single file vs. split" recommendation; that question is already settled in favor of split, and in more granular form than proposed here (per-team, not just per-product).

## Why

Omen is built almost entirely by AI coding agents (Claude Code, Codex). Right now the visual doctrine that keeps 32 team identities consistent lives across four separate human-readable docs (`brand-system.md`, `omen-ux-ui-design-system-v1.md`, `team-motif-grammar.md`, the 32-team audit). Agents have to re-derive intent from prose each session, which is exactly the failure mode the emerging **DESIGN.md standard** (Google Labs, `google-labs-code/design.md`) exists to fix: a single machine-readable file, root-level, that gives agents design tokens + rationale in one place instead of scattered docs.

This plan does not invent new design decisions — it's a **compilation plan**: which existing doctrine maps into which section of a spec-compliant `design.md`, in what order, and what's still open before we lock tokens.

## Format decision

Adopt the Google Labs spec (`github.com/google-labs-code/design.md`, spec at `docs/spec.md`): **YAML front matter for machine-readable tokens** (hex values, type scale, spacing) + **Markdown prose body** for the human rationale behind each choice. This is the format multiple independent sources in the research converge on (Reddit's 5-section breakdown, Zenn's 7-section breakdown, the TDP and Banani guides) — different section counts, same two-layer shape.

Non-negotiable structural pattern per section: **token first, rationale second, "don't" list where it applies.** Negative constraints (explicit "don't do X") are called out repeatedly across sources as the highest-leverage part of the file — they're what stops agents from drifting toward generic Tailwind/shadcn defaults.

## Scope resolution: "teams and/or city"

No separate "city" concept exists in the Omen codebase or docs. City/market identity is already folded into team identity — e.g. Dolphins → Miami Vice + South Beach, Cowboys → Dallas silver/Lone Star, Panthers → Carolina blue/UNC heritage. **One `design.md`, not two.** Team = the entity; city/market culture is one of the inputs the 32-team audit already captures as "cultural anchor."

## File location

Root of the Omen repo: `slops-saloon/omen/design.md`. The spec assumes root placement so agents discover it automatically, same as `CLAUDE.md`/`AGENTS.md`.

## Section-by-section source mapping

| design.md section | Pulled from | Notes |
|---|---|---|
| **Brand** | `Brand/brand-system.md` (voice, AAA framework, product pillars) | Condense to what an agent needs to not sound generic — not the full doctrine doc |
| **Color — global** | `omen-ux-ui-design-system-v1.md` §Color System | Aged Brass, Verdigris Green, Deep Crimson, Weathered Umber — already token-named |
| **Color — per-team** | `Blueprints/audits/2026-06-20-...-32-team-identity-audit.md` table | Already has accent hex, light/dark axis, cultural anchor citation per team — this is 90% done, needs YAML-ification |
| **Type** | `Brand/brand-system.md:140-146` | Alegreya / Alegreya Sans lock — hard constraint, state as a "don't" (no other fonts) |
| **Components** | `omen-ux-ui-design-system-v1.md` §Components, `page-system.md` | |
| **Motifs / cultural moments** (Omen-specific extension, not in the stock 5-section format) | `team-motif-grammar.md` | Hairlines, dividers, watermarks — keep as an Omen-only section since no external DESIGN.md example covers per-entity ornament grammar |
| **Accessibility** | AAA framework (`brand-system.md:192`) + WCAG AA ratios (4.5:1 text / 3:1 large, per research) + two-axis WCAG sweep audit | State ratios as hard minimums, not guidance |
| **Guardrails / Don'ts** | `Blueprints/audits/2026-06-21-phase1-5g-trademark-review.md` + entity-identity methodology ("find, don't derive; cite the anchor; mind trademark") | This is where trademark risk and the "don't invent a color, cite a real anchor" rule live |

## Open items to resolve before locking tokens

The 32-team audit has three known defects still open as of 2026-06-20. `design.md` should encode the **corrected** values, not current production:

1. LV Raiders — silver accent hue-shift defect (textSafe lift clamp needed)
2. ATL Falcons — Bred accent collapses to near-black, needs textSafe bypass
3. HOU/NYG/ATL — accent hue-collision, resolved in the audit (NYG flips to royal blue primary) but not yet shipped

Pulling these into `design.md` as-is would encode known bugs as doctrine. Recommend fixing in source (`frontend/src/lib/teamTemplate.js`) first, or explicitly marking these three teams' YAML blocks as `status: pending-fix` with the corrected target value noted.

## Open question for Justin

32 teams as structured YAML inside one file risks bloating `design.md` past what agents parse well in a single context load. Two options:

- **A — single file:** all 32 teams as YAML entries directly in `design.md`, under one `teams:` key.
- **B — split:** `design.md` holds the global Brand/Color/Type/Components/Accessibility/Don'ts sections + a pointer; per-team tokens live in a companion `design/teams.yaml`, mirroring how `frontend/src/data/nflTeams.js` already separates team data from template logic.

No source in the research addresses a 32-entity case directly — this is an Omen-specific call, not a spec requirement either way. My lean is **B**, since it matches the existing code-side separation and keeps the root file scannable, but this needs your sign-off before drafting.

## Phasing

1. **Phase A** — draft global sections (Brand, Color-global, Type, Components, Accessibility, Don'ts) from existing doctrine, reformatted into YAML + prose. No new decisions needed, straight compilation.
2. **Phase B** — encode the 32-team color/axis/cultural-anchor data as structured YAML (format per the A/B decision above), marking the 3 known defects as pending-fix.
3. **Phase C** — add the motif/cultural-moments section from `team-motif-grammar.md`.
4. **Phase D** — optional: validate structure against the `google-labs-code/design.md` CLI linter if it's usable outside their toolchain; otherwise self-review against `docs/spec.md`.

## Next step

Awaiting your call on the single-file vs. split-file question above. Once decided, I'll draft the actual `design.md` (Phase A first, team data in Phase B) — or write the Claude Code handoff prompt if you'd rather it be built there.
