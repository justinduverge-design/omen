# Phase B — local-agent execution track (Claude Code / Codex)

## Why this track exists

The Phase A primitive set (19 components, `Blueprints/handoffs/jules/`) was built by Jules against `main` via PR. Phase B — migrating the five hot-file pages to use those primitives — needs a running dev server for real visual/functional verification (light/dark screenshots, click-through checks). Jules cannot spin up the dev server, so Phase B runs on a local agent (Claude Code or Codex) instead, working directly against a local checkout with `npm run dev` available.

This supersedes `Blueprints/handoffs/jules/01-b-connectleague-button-phase-b-brief.md` for scope purposes — that file specified a narrow, single-primitive slice sized for Jules's PR-review-driven workflow. A local agent with live dev-server feedback doesn't need that granularity; the more efficient unit of work is **one page, every applicable primitive, in one session** — touching each hot file once instead of four or five separate times.

## Structure

Five prompts, one per hot-file page, each self-contained (paste the whole file as the session prompt — don't assume prior context). Run them **in this order, one page per session, sequentially — not in parallel**:

1. `phase-b-local-agent-01-connectleague.md`
2. `phase-b-local-agent-02-tradeanalyzer.md`
3. `phase-b-local-agent-03-draftassistant.md`
4. `phase-b-local-agent-04-football.md`
5. `phase-b-local-agent-05-landing.md`

Why this order: same reasoning as the original hot-file serialization doctrine — `Football.jsx` renders `TradeAnalyzer` and `DraftAssistant` as tab children, so it should migrate after both (its own manual check then also confirms those migrations render correctly inside the tab shell). `Landing.jsx` goes last because brief 13 (`MarketingHero`, not in scope for these five prompts) explicitly wants to sequence after Button work lands there, and Landing has the most local one-off UI to untangle.

Each prompt is scoped to **one page's file** (plus, where unavoidable, one shared lib file it visibly needs — called out explicitly per prompt). Do not let scope creep into a second page's file even if it looks like a two-line fix — flag it in the session summary instead and let the next prompt handle it.

## Ground rules (apply to all five prompts — repeated in each so they're self-contained)

- **Dev/demo only.** These changes land on the dev/demo environment. Do not deploy to production. Do not run any deploy/release command. If a prompt's page needs a live check beyond local dev server, stop and ask rather than pushing to a shared environment.
- **No new dependencies.** No `npm install`, no shadcn/Radix/class-variance-authority/floating-ui. Confirmed absent from `frontend/package.json`; Phase A primitives were built without them and Phase B shouldn't need them either.
- **Forbidden files, every prompt:** `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/package.json`, the lockfile, anything under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`, and any Phase A primitive source file under `frontend/src/components/ui/` (if a primitive seems to be missing a capability you need, stop and flag it — don't patch the primitive silently mid-migration).
- **No team theming resurrection.** `--color-team-*` tokens exist but are runtime-inert (team mode removed 2026-07-12). Migrated primitives should read `--color-accent`/`--color-omen` directly. Do not add new `--color-team-*` usage, and do not touch existing team-theme-conditional logic (e.g. `useTheme()`, `mode === 'team'` branches) even if it's near code you're migrating — leave it exactly as found.
- **No business-logic changes.** API calls (`apiFetch(...)`), auth/session checks, OAuth flows, scoring logic, routing, platform-adapter behavior — all must be byte-for-byte behaviorally unchanged. You're swapping markup/chrome, not rewriting flow.
- **Verification, every page:** `npm --prefix frontend run build` must succeed. Then `npm --prefix frontend run dev`, visually check both `data-theme="dark"` and `data-theme="light"`, and click through every interactive element you touched (buttons, forms, tabs, connect/disconnect flows — whatever's relevant to that page) to confirm behavior is unchanged. No automated test framework exists in `frontend/` — manual check is the verification.
- **Commit per page**, not per primitive. One commit (or a couple of small logical commits) covering that page's full migration, with a clear message. Don't push to a shared branch without being asked — leave it local for review unless told otherwise.
- **If you hit a naming collision** between a local function and a canonical primitive import (flagged explicitly in the relevant prompt below), rename the local one first, preserve its behavior exactly, then introduce the canonical import.
- **If you hit a gap** — a UI pattern that doesn't cleanly fit any existing primitive's documented API — don't invent a new primitive ad hoc. Do the smallest reasonable thing to keep the page working (often: leave that one element as local markup), and call it out clearly in your session summary so it can be scoped as a future primitive brief.

## Primitive reference

Full API/token/accessibility details for each Phase A primitive live in its own Jules brief under `Blueprints/handoffs/jules/` (e.g. `jules-01-button.md` for `Button`, `06-segmented-control-tabnav-radio-card-group-brief.md`, `10-player-row-player-chip-brief.md`, `11-metric-strip-brief.md`, `12-platform-badge-brief.md`, `08-platform-connection-card-brief.md`, `07-state-components-empty-error-loading-brief.md`, `jules-05-tooltip.md`, `jules-03-badge-chip.md`, `jules-04-pagehero.md`). When a prompt below says "use `X`," check that primitive's brief for its exact prop API rather than guessing the shape.

## Known gaps carried into this track (not solved by any of the five prompts)

- **DraftAssistant's "Position Needs" multi-select toggle group** doesn't fit any existing single-select primitive (`SegmentedControl`, `RadioCardGroup`). Prompt 03 explicitly leaves it as local markup and flags it as a candidate for a future primitive.
- **TradeAnalyzer's readonly/copy share-URL field** isn't an explicitly documented `Input` pattern. Prompt 02 gives a specific approach (readOnly + trailingIcon copy button) rather than inventing a new component.
- **No Figma/visual-design review** has happened for any of this — these prompts are code-only migrations against the existing live pages. If something looks visually off after migration, flag it; don't silently "improve" it beyond matching prior appearance.
