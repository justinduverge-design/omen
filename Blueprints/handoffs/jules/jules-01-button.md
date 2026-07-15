# Jules brief — 01 · Button primitive

**Queue position:** 01 of 13 (`Blueprints/handoffs/jules/README.md` is the authoritative run order)
**Depends on:** none
**Status:** Phase A ready immediately. Phase B must wait its turn in the hot-file serialization order (see README) — as the first brief in the queue, its Phase B also runs first, so it is unblocked now too, but must not overlap with any other brief's Phase B once more are in flight.
**Supersedes:** `Blueprints/prompts/jules-button-primitive-v1.md` (same content, relocated into the numbered queue — do not maintain both; treat this file as canonical and that one as historical).
**⚠ Page-touching brief:** Phase B touches `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, and `Landing.jsx` — four of the five hot files. **Do not run Phase B in parallel with any other brief's Phase B against these files.** Check `README.md` for current serialization status before opening this PR's migration half.

---

## Objective

Build one component: canonical `Button`. Nothing else in Phase A. This is the first primitive in the queue and the template other briefs follow for structure and rigor.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` (current UX/UI authority)
2. `Blueprints/specs/design/README.md` (read-order index)
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md` (suppression status map)
4. `Blueprints/specs/design/component-lock-v1.md` §1 only (Button API — partially superseded doc overall, but §1's API shape is still authoritative; ignore its shadcn/Radix tooling assumptions, see the deviation note below)
5. `Blueprints/backlog/ui-component-system.md` P0.1

## Dependency / sequencing

None. This is the first buildable PR in the queue. Phase A can run in parallel with the Phase A of any other Tier-0 brief (02, 03, 04, 05, 06, 13). Phase B is first in the hot-file serialization order — nothing needs to wait on this brief, but this brief's own Phase B must fully merge before briefs 02, 06, 04, or 13 open their Phase B against the same files.

---

## Phase A — component build only

### Objective

`Button.jsx` only. No page files. No migration. This half of the brief can be opened, reviewed, and merged as its own PR, independent of Phase B.

### Canonical API (locked)

```jsx
<Button
  variant="primary|secondary|tertiary|danger|link"
  size="sm|md|lg"
  tone="accent|omen"
  leadingIcon={ReactNode}
  trailingIcon={ReactNode}
  loading={false}
  disabled={false}
  asChild={false}
/>
```

- **variant** — `primary` (filled accent), `secondary` (outlined accent), `tertiary` (ghost), `danger` (filled `--color-risk-high`), `link` (no chrome, underline on hover only). No other variants exist.
- **size** — `sm` 28px, `md` 36px (default), `lg` 44px.
- **tone** — `accent` (default, reads `--color-accent`) or `omen` (reads `--color-omen`, reserved for AI-signal moments). No other tones.
- **states** — hover, focus-visible (2px outline using the existing `focus-visible:outline-[var(--color-accent)]` convention), active, disabled, loading (spinner replaces trailingIcon, label stays).
- **asChild** — when true, render the child element (e.g. a react-router `<Link>`) with button chrome instead of a `<button>`. Implement via `React.cloneElement` merging className/style/handlers — no Radix `Slot` needed.

### Deviation from `component-lock-v1.md`: no new dependencies

That doc's implementation notes assume shadcn/ui + Radix + class-variance-authority. Confirmed absent from `frontend/package.json` (no `@radix-ui/*`, no `shadcn`, no `class-variance-authority`, no `clsx`/`tailwind-merge`, no `components.json`). Per the standing rule — do not install new UI libraries unless current active docs require it — and the North Star does not require this tooling. Build `Button` as a plain React function component using Tailwind utility classes + inline `style={{ color: 'var(--color-...)' }}`, matching the existing idiom in `frontend/src/components/help/HelpButton.jsx`. If Jules judges shadcn/Radix genuinely necessary, stop and flag back rather than installing silently.

### Tokens consumed (already exist in `frontend/src/index.css` — do not add or rename)

`--color-accent`, `--color-accent-hover`, `--color-text-on-accent`, `--color-omen`, `--color-risk-high`, `--color-text-primary`, `--color-border`.

### Phase A allowed files

- `frontend/src/components/ui/Button.jsx` (new)
- `frontend/src/components/ui/index.js` (new barrel, optional — keep consistent with whatever pattern already exists in `components/ui/`, which currently has none)

### Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route or fixture page for this check. `frontend/` has no component test framework (no Jest/Vitest configured — confirmed via repo search 2026-07-15).
- Because `Button` is used on real pages in Phase B of this same brief, screenshots are deferred to the Phase B PR rather than duplicated here — Phase A's PR description should instead state how each variant/size/tone/state was visually sanity-checked locally (e.g. temporary local render, not committed).

### Phase A done criteria

1. `Button.jsx` implements the full API above — all five variants, all three sizes, both tones, all five states, `asChild`.
2. Zero raw hex literals — every color is a `var(--color-...)` reference.
3. Zero new entries in `frontend/package.json`.
4. No second button-like component introduced as a workaround.

---

## Phase B — page migration only

### Objective

Replace page-local button implementations with the canonical `Button` from Phase A. No component changes in this half — if `Button.jsx` needs to change to support a migration site, that's a Phase A revision, not a Phase B workaround.

### Migration targets, in this order

1. `frontend/src/pages/ConnectLeague.jsx` — replace local `CTAButton` (~line 59), `GhostButton` (referenced ~line 506), and raw `<button>` elements (~423–435, ~712–725).
2. `frontend/src/pages/TradeAnalyzer.jsx`
3. `frontend/src/pages/DraftAssistant.jsx`
4. `frontend/src/pages/Landing.jsx` — this is where `asChild` matters most (the "Sign in →" pseudo-button drift).

Platform brand coloring on ConnectLeague's connect buttons should move off Button chrome onto a `leadingIcon` slot only — do not build a `PlatformBadge` component in this PR; note the gap in the PR description instead (closed later by brief 12).

### Phase B allowed files

- `frontend/src/pages/ConnectLeague.jsx`
- `frontend/src/pages/TradeAnalyzer.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/Landing.jsx`

### Phase B verification

- `npm --prefix frontend run build` — must succeed.
- Manual visual check in both `data-theme="dark"` and `data-theme="light"` across all four migrated pages — screenshots attached to the PR (required here, since these are real, live pages, not a component-only check).
- Manual keyboard check: Tab to each migrated button, confirm focus-visible ring appears.

### Phase B done criteria

1. All four target pages have their local button implementations fully replaced — no `CTAButton`, `GhostButton`, or raw `<button className=...>` survives in those four files for cases the canonical variants cover.
2. `asChild` demonstrated on Landing's "Sign in →" pseudo-button, rendering a real `<a>`/`<Link>` with Button chrome.
3. Light/dark screenshots attached for all four pages.

---

## Both phases — allowed files

- `Blueprints/playbooks/skill-usage-ledger.md` (append a row)
- `Blueprints/handoffs/` (new dated handoff, close-out convention)
- `Direction/decision_log.md` (log the no-new-deps decision if reconsidered)

## Forbidden files (both phases)

- `frontend/src/index.css` — no new/renamed tokens, no changed hex values.
- `frontend/tailwind.config.js` — no theme extension for this component; if truly needed, stop and ask.
- `frontend/package.json` — no new dependencies.
- Package lockfile (`package-lock.json` or equivalent) — no changes, including accidental churn from running `npm install`.
- Any file under `Blueprints/specs/design/` (North Star, README, suppression banners, component-lock-v1, team-theme-contract-v1, page-system, omen-ux-ui-design-system-v1) and `Blueprints/backlog/ui-component-system.md` — doctrine, not implementation targets.
- Any page outside the four Phase B targets (`Football.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, `Account.jsx`, `Demo.jsx`, `Login.jsx`, `Onboarding.jsx`, `Standings.jsx`, `StartSit.jsx`, `WaiverWire.jsx`, `EspnConnectGuide.jsx`) — a later sweep PR handles these.
- `frontend/src/components/help/HelpButton.jsx` — bespoke floating-action-button chrome, distinct shape, not a Button variant candidate in this PR.
- Backend, `sql/`, `deploy/`, `docker-compose*`, `.env*`, anything outside `frontend/`.
- Team theming tokens (`--color-team-*`) and any team-theming logic — runtime-removed 2026-07-12; do not resurrect. Tone stays `accent`/`omen` only.

## Explicit non-goals

- No `Input`, `Textarea`, `SegmentedControl`, `TabNav`, `RadioCardGroup`, `PageHero`, `EmptyState`, `ErrorState`, `LoadingState`, `PlatformBadge`, `PlatformConnectionCard`, `DecisionBrief`, `PlayerRow`, `PlayerChip`, or `MetricStrip` — separate briefs.
- No shadcn/Radix/CVA installation.
- No `index.css` token changes.
- No team theming resurrection.
- No page layout, copy, or IA redesign — swap button markup only.
- No changes to `Football.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, or any page outside the four Phase B targets.
- No Phase A PR that also includes page migration — keep the two halves separate PRs.

## PR title/body template

**Phase A title:** `[UI primitive · Phase A] Button — component build`
**Phase B title:** `[UI primitive · Phase B] Button — 4-page migration`

**Phase A body:**
```
## What
Adds canonical Button component per component-lock-v1.md §1. Component-only — no page migration.

## No-new-deps deviation
component-lock-v1.md assumes shadcn/Radix/CVA; none installed in frontend/package.json.
Built as plain React + Tailwind + CSS-variable tokens instead, per standing no-new-deps rule.

## Visual verification
[how each variant/size/tone/state was checked locally — no committed fixture route]

## Evidence
Ledger row: [link]
Handoff: [link]
```

**Phase B body:**
```
## What
Migrates ConnectLeague.jsx, TradeAnalyzer.jsx, DraftAssistant.jsx, Landing.jsx to canonical Button
(Phase A: [link to merged Phase A PR]).

## Serialization note
This is the first Phase-B PR in the queue against these hot files. Confirm with
Blueprints/handoffs/jules/README.md before merging that no other Phase-B PR is targeting
the same files concurrently.

## Deferred gap
Platform brand coloring on ConnectLeague buttons moved to leadingIcon-only for now;
closed properly by brief 12 (PlatformBadge) + brief 08 (PlatformConnectionCard).

## North Star §10 self-check
[answer all 8 questions]

## Screenshots
[dark] [light] × 4 pages

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Risk level

**Low.** Purely additive component, no shared state, no backend touch, well-bounded migration set. Main risk is scope creep into PlatformBadge or into pages outside the four listed, or merging Phase A and Phase B into a single PR against this brief's own guidance.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm Phase A and Phase B were opened as separate PRs, not combined.
2. Confirm zero raw hex literals in `Button.jsx` — every color is a `var(--color-...)` reference.
3. Confirm zero new entries in `frontend/package.json` and zero lockfile diff.
4. Confirm both light and dark mode screenshots are attached to the Phase B PR, not just described.
5. Confirm `asChild` on Landing renders a real `<a>`/`<Link>` with button chrome, not a button wrapping a link.
6. Confirm no second button-like component was introduced as a workaround (no local `PrimaryButton`, `IconButton`, etc.).
7. Confirm `CTAButton` and `GhostButton` are fully removed from `ConnectLeague.jsx`, not left dead in the file.
8. Confirm the Phase B PR description answers the North Star §10 self-check questions.
9. Confirm `Blueprints/playbooks/skill-usage-ledger.md` got a row and a dated handoff exists in `Blueprints/handoffs/`.
10. Confirm no forbidden file was touched in either phase.
